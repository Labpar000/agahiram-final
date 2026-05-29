import argparse
import base64
import json
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID


DIRECTORY_URL = "https://acme-v02.api.letsencrypt.org/directory"


_getaddrinfo = socket.getaddrinfo


def ipv4_getaddrinfo(*args, **kwargs):
    return [info for info in _getaddrinfo(*args, **kwargs) if info[0] == socket.AF_INET]


socket.getaddrinfo = ipv4_getaddrinfo


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def json_bytes(value: object) -> bytes:
    return json.dumps(value, separators=(",", ":")).encode("utf-8")


def request_json(url: str, data: bytes | None = None, headers: dict[str, str] | None = None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data is not None else "GET")
    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read()
        return res, json.loads(body.decode("utf-8")) if body else None


def head_nonce(url: str) -> str:
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.headers["Replay-Nonce"]


def public_key_jwk(key: rsa.RSAPrivateKey) -> dict[str, str]:
    numbers = key.public_key().public_numbers()
    return {
        "e": b64url(numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, "big")),
        "kty": "RSA",
        "n": b64url(numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")),
    }


def jwk_thumbprint(jwk: dict[str, str]) -> str:
    canonical = json_bytes({"e": jwk["e"], "kty": jwk["kty"], "n": jwk["n"]})
    digest = hashes.Hash(hashes.SHA256())
    digest.update(canonical)
    return b64url(digest.finalize())


class AcmeClient:
    def __init__(self, directory_url: str, account_key: rsa.RSAPrivateKey):
        _, self.directory = request_json(directory_url)
        self.account_key = account_key
        self.jwk = public_key_jwk(account_key)
        self.kid: str | None = None
        self.nonce = head_nonce(self.directory["newNonce"])

    def signed_post(self, url: str, payload: object | None, use_jwk: bool = False):
        protected: dict[str, object] = {
            "alg": "RS256",
            "nonce": self.nonce,
            "url": url,
        }
        if use_jwk:
            protected["jwk"] = self.jwk
        else:
            protected["kid"] = self.kid

        protected64 = b64url(json_bytes(protected))
        payload64 = "" if payload is None else b64url(json_bytes(payload))
        signing_input = f"{protected64}.{payload64}".encode("ascii")
        signature = self.account_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
        body = json_bytes({"protected": protected64, "payload": payload64, "signature": b64url(signature)})

        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/jose+json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                self.nonce = res.headers.get("Replay-Nonce", self.nonce)
                raw = res.read()
                return res, json.loads(raw.decode("utf-8")) if raw else None
        except urllib.error.HTTPError as exc:
            self.nonce = exc.headers.get("Replay-Nonce", self.nonce)
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"ACME request failed {exc.code} for {url}: {detail}") from exc


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", default="alooche.com")
    parser.add_argument("--www-domain", default="www.alooche.com")
    parser.add_argument("--email", default="admin@alooche.com")
    parser.add_argument("--ssh-key", default=".cache/ssh/agahiram_id_ed25519")
    parser.add_argument("--ssh-target", default="ubuntu@37.32.26.32")
    parser.add_argument("--remote-dir", default="/opt/agahiram/docker")
    args = parser.parse_args()

    domains = [args.domain, args.www_domain]
    account_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    cert_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    client = AcmeClient(DIRECTORY_URL, account_key)

    res, _ = client.signed_post(
        client.directory["newAccount"],
        {"termsOfServiceAgreed": True, "contact": [f"mailto:{args.email}"]},
        use_jwk=True,
    )
    client.kid = res.headers["Location"]

    res, order = client.signed_post(
        client.directory["newOrder"],
        {"identifiers": [{"type": "dns", "value": domain} for domain in domains]},
    )
    order_url = res.headers["Location"]

    for authz_url in order["authorizations"]:
        _, authz = client.signed_post(authz_url, None)
        domain = authz["identifier"]["value"]
        challenge = next(ch for ch in authz["challenges"] if ch["type"] == "http-01")
        token = challenge["token"]
        key_auth = f"{token}.{jwk_thumbprint(client.jwk)}"

        with tempfile.TemporaryDirectory() as tmp:
            token_path = Path(tmp) / token
            token_path.write_text(key_auth, encoding="utf-8")
            run(["scp", "-i", args.ssh_key, "-o", "StrictHostKeyChecking=no", str(token_path), f"{args.ssh_target}:/tmp/{token}"])
        run(
            [
                "ssh",
                "-i",
                args.ssh_key,
                "-o",
                "StrictHostKeyChecking=no",
                args.ssh_target,
                f"sudo mkdir -p {args.remote_dir}/acme-challenges && sudo mv /tmp/{token} {args.remote_dir}/acme-challenges/{token}",
            ]
        )

        challenge_url = f"http://{domain}/.well-known/acme-challenge/{token}"
        with urllib.request.urlopen(challenge_url, timeout=30) as challenge_res:
            served = challenge_res.read().decode("utf-8")
        if served != key_auth:
            raise RuntimeError(f"Challenge file mismatch for {domain}: {challenge_url}")

        client.signed_post(challenge["url"], {})
        for _ in range(30):
            time.sleep(2)
            _, authz = client.signed_post(authz_url, None)
            if authz["status"] == "valid":
                break
            if authz["status"] == "invalid":
                raise RuntimeError(f"Authorization failed for {domain}: {authz}")
        else:
            raise RuntimeError(f"Authorization timed out for {domain}: {authz}")

    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, args.domain)])
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(subject)
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(domain) for domain in domains]), critical=False)
        .sign(cert_key, hashes.SHA256())
    )
    csr_der = csr.public_bytes(serialization.Encoding.DER)
    client.signed_post(order["finalize"], {"csr": b64url(csr_der)})

    certificate_url = None
    for _ in range(30):
        time.sleep(2)
        _, finalized = client.signed_post(order_url, None)
        if certificate_url:
            break
        certificate_url = finalized.get("certificate")
        if finalized.get("status") == "invalid":
            raise RuntimeError(f"Order failed: {finalized}")
        if certificate_url:
            break
    if not certificate_url:
        raise RuntimeError(f"Certificate URL missing after finalize: {finalized}")

    # Certificates are PEM, not JSON, so fetch them with a raw POST-as-GET JWS.
    protected = {"alg": "RS256", "nonce": client.nonce, "url": certificate_url, "kid": client.kid}
    protected64 = b64url(json_bytes(protected))
    signing_input = f"{protected64}.".encode("ascii")
    signature = account_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    body = json_bytes({"protected": protected64, "payload": "", "signature": b64url(signature)})
    req = urllib.request.Request(certificate_url, data=body, headers={"Content-Type": "application/jose+json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as res:
        cert_pem = res.read()

    key_pem = cert_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    )

    with tempfile.TemporaryDirectory() as tmp:
        fullchain = Path(tmp) / "fullchain.pem"
        key = Path(tmp) / "key.pem"
        fullchain.write_bytes(cert_pem)
        key.write_bytes(key_pem)
        run(["scp", "-i", args.ssh_key, "-o", "StrictHostKeyChecking=no", str(fullchain), str(key), f"{args.ssh_target}:/tmp/"])
    run(
        [
            "ssh",
            "-i",
            args.ssh_key,
            "-o",
            "StrictHostKeyChecking=no",
            args.ssh_target,
            (
                f"sudo mkdir -p {args.remote_dir}/certs/{args.domain} && "
                f"sudo mv /tmp/fullchain.pem {args.remote_dir}/certs/{args.domain}/fullchain.pem && "
                f"sudo mv /tmp/key.pem {args.remote_dir}/certs/{args.domain}/key.pem && "
                f"sudo chmod 644 {args.remote_dir}/certs/{args.domain}/fullchain.pem && "
                f"sudo chmod 600 {args.remote_dir}/certs/{args.domain}/key.pem"
            ),
        ]
    )
    print(f"Issued and uploaded certificate for {', '.join(domains)}")


if __name__ == "__main__":
    main()
