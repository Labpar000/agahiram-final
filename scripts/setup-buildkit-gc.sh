#!/bin/bash
# تنظیم BuildKit garbage collection روی سرور تا cache build بین deployها بماند
# ولی دیسک پر نشود. این اسکریپت یک‌بار روی سرور اجرا می‌شود.
set -e

sudo cp /etc/docker/daemon.json "/etc/docker/daemon.json.bak.$(date +%s)"

sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" },
  "storage-driver": "overlay2",
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "20GB"
    }
  }
}
JSON

echo "--- validating JSON ---"
python3 -c "import json;json.load(open('/etc/docker/daemon.json'));print('JSON OK')"
echo "--- restarting docker ---"
sudo systemctl restart docker
sleep 5
echo "--- docker status ---"
systemctl is-active docker
echo "--- containers ---"
docker ps --format '{{.Names}}: {{.Status}}'
