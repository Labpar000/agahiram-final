if (!self.define) {
  let e,
    s = {};
  const a = (a, c) => (
    (a = new URL(a + '.js', c).href),
    s[a] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = a), (e.onload = s), document.head.appendChild(e));
        } else ((e = a), importScripts(a), s());
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (c, i) => {
    const n = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[n]) return;
    let t = {};
    const f = (e) => a(e, n),
      r = { module: { uri: n }, exports: t, require: f };
    s[n] = Promise.all(c.map((e) => r[e] || f(e))).then((e) => (i(...e), t));
  };
}
define(['./workbox-5bcb5e8b'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: '5f597d85f3dd9df2f90df58d5366cabd' },
        {
          url: '/_next/static/5SVvH9yj2_TgL-ACL0M8b/_buildManifest.js',
          revision: '10c331d3578c8f64a826c37dfee1fcd4',
        },
        {
          url: '/_next/static/5SVvH9yj2_TgL-ACL0M8b/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/_next/static/chunks/168-690f296d4c4563a5.js', revision: '690f296d4c4563a5' },
        { url: '/_next/static/chunks/197-8b25ded64b3c84fe.js', revision: '8b25ded64b3c84fe' },
        { url: '/_next/static/chunks/227-3d220077ba8d7bbf.js', revision: '3d220077ba8d7bbf' },
        { url: '/_next/static/chunks/23.c1c2634b99c55b6e.js', revision: 'c1c2634b99c55b6e' },
        { url: '/_next/static/chunks/28-b31511f1a6cf525f.js', revision: 'b31511f1a6cf525f' },
        { url: '/_next/static/chunks/342-2a727327eb70b687.js', revision: '2a727327eb70b687' },
        { url: '/_next/static/chunks/398-d3c089ce2dadac35.js', revision: 'd3c089ce2dadac35' },
        { url: '/_next/static/chunks/404-011ae7cb484efe6a.js', revision: '011ae7cb484efe6a' },
        { url: '/_next/static/chunks/411-c3de9effbb36b47d.js', revision: 'c3de9effbb36b47d' },
        { url: '/_next/static/chunks/595-53eef97259643732.js', revision: '53eef97259643732' },
        { url: '/_next/static/chunks/671-19d11bd61569d539.js', revision: '19d11bd61569d539' },
        { url: '/_next/static/chunks/726-61d401958ff3e677.js', revision: '61d401958ff3e677' },
        { url: '/_next/static/chunks/788-9059ef5df03a2dee.js', revision: '9059ef5df03a2dee' },
        { url: '/_next/static/chunks/808-e27fec246fe20261.js', revision: 'e27fec246fe20261' },
        { url: '/_next/static/chunks/876-9496ef8448d490b8.js', revision: '9496ef8448d490b8' },
        { url: '/_next/static/chunks/882.57a452a1f61f7733.js', revision: '57a452a1f61f7733' },
        { url: '/_next/static/chunks/961-2569b7db27135e1f.js', revision: '2569b7db27135e1f' },
        {
          url: '/_next/static/chunks/app/(auth)/layout-487684f957de5d95.js',
          revision: '487684f957de5d95',
        },
        {
          url: '/_next/static/chunks/app/(auth)/login/page-b675a74b64153344.js',
          revision: 'b675a74b64153344',
        },
        {
          url: '/_next/static/chunks/app/(auth)/onboarding/page-7aea320dab000cd3.js',
          revision: '7aea320dab000cd3',
        },
        {
          url: '/_next/static/chunks/app/(main)/create/page-720b843b75fe51eb.js',
          revision: '720b843b75fe51eb',
        },
        {
          url: '/_next/static/chunks/app/(main)/explore/page-50f1eb0f3f4930ec.js',
          revision: '50f1eb0f3f4930ec',
        },
        {
          url: '/_next/static/chunks/app/(main)/feed/page-19f933224b4cea71.js',
          revision: '19f933224b4cea71',
        },
        {
          url: '/_next/static/chunks/app/(main)/layout-695cffc8ac53cbca.js',
          revision: '695cffc8ac53cbca',
        },
        {
          url: '/_next/static/chunks/app/(main)/messages/%5Bid%5D/page-7480fe393fdb85cf.js',
          revision: '7480fe393fdb85cf',
        },
        {
          url: '/_next/static/chunks/app/(main)/messages/page-3e76f52114f601ce.js',
          revision: '3e76f52114f601ce',
        },
        {
          url: '/_next/static/chunks/app/(main)/notifications/page-23890e57b68f5cf5.js',
          revision: '23890e57b68f5cf5',
        },
        {
          url: '/_next/static/chunks/app/(main)/post/%5Bid%5D/page-af37f612f4144f4a.js',
          revision: 'af37f612f4144f4a',
        },
        {
          url: '/_next/static/chunks/app/(main)/profile/%5Busername%5D/page-0ca5927589c8266c.js',
          revision: '0ca5927589c8266c',
        },
        {
          url: '/_next/static/chunks/app/(main)/profile/page-4dd872da5f237f68.js',
          revision: '4dd872da5f237f68',
        },
        {
          url: '/_next/static/chunks/app/(main)/reels/page-5aca4eddcba9971c.js',
          revision: '5aca4eddcba9971c',
        },
        {
          url: '/_next/static/chunks/app/(main)/settings/page-af62ecf1ac9c00d3.js',
          revision: 'af62ecf1ac9c00d3',
        },
        {
          url: '/_next/static/chunks/app/(main)/stories/%5BuserId%5D/page-22c550173dbb5934.js',
          revision: '22c550173dbb5934',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-6ee3cbb6160bedeb.js',
          revision: '6ee3cbb6160bedeb',
        },
        {
          url: '/_next/static/chunks/app/global-error-50163a459df384cc.js',
          revision: '50163a459df384cc',
        },
        {
          url: '/_next/static/chunks/app/layout-f465a57f5b06d81b.js',
          revision: 'f465a57f5b06d81b',
        },
        { url: '/_next/static/chunks/app/page-487684f957de5d95.js', revision: '487684f957de5d95' },
        {
          url: '/_next/static/chunks/app/payment/callback/page-997a5827099520c6.js',
          revision: '997a5827099520c6',
        },
        { url: '/_next/static/chunks/b410d746-40c36becf3b95221.js', revision: '40c36becf3b95221' },
        { url: '/_next/static/chunks/eebbe23b.1fdaa25bcff7727e.js', revision: '1fdaa25bcff7727e' },
        { url: '/_next/static/chunks/f0ee454b.66cb01b5e3aabd0e.js', revision: '66cb01b5e3aabd0e' },
        { url: '/_next/static/chunks/framework-584f8a9f56520b91.js', revision: '584f8a9f56520b91' },
        { url: '/_next/static/chunks/main-426d81db431c5c63.js', revision: '426d81db431c5c63' },
        { url: '/_next/static/chunks/main-app-ad1bf4377d11e638.js', revision: 'ad1bf4377d11e638' },
        {
          url: '/_next/static/chunks/pages/_app-a9d5b9f391a36ac0.js',
          revision: 'a9d5b9f391a36ac0',
        },
        {
          url: '/_next/static/chunks/pages/_error-f2ed337258873614.js',
          revision: 'f2ed337258873614',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        { url: '/_next/static/chunks/webpack-956b758862485b91.js', revision: '956b758862485b91' },
        { url: '/_next/static/css/02286b329fffefca.css', revision: '02286b329fffefca' },
        { url: '/_next/static/css/7dfd643b849ac952.css', revision: '7dfd643b849ac952' },
        {
          url: '/_next/static/media/4ff1260a1bda0420-s.p.woff2',
          revision: 'f6d31671339db80142ceaf6382570e79',
        },
        { url: '/manifest.json', revision: '2f4437c3ccad58f481a16ee0e782e31d' },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: e, response: s, event: a, state: c }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, { status: 200, statusText: 'OK', headers: s.headers })
                : s,
          },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
      new e.CacheFirst({
        cacheName: 'images',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https?:\/\/.*\/api\/.*/i,
      new e.NetworkFirst({
        cacheName: 'api',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ));
});
