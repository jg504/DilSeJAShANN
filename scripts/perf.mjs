// Throttled performance pass against the built site.
//
// CLAUDE.md's budget: Slow 4G, LCP under 2.5s. 4x CPU throttle, no visible jank.
// A guest who bounces never RSVPs, and the guest list is full of phones on
// Indian mobile data in December.
//
// PREREQUISITES — this needs two things running, so it is deliberately NOT part
// of `npm run check`:
//   1. npm run build:draft && npm run preview      (astro preview serves dist/)
//   2. Chrome with remote debugging:
//      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//        --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/perf-profile
//
//   npm run perf
//
// MODE=none turns throttling off and MODE=crawl makes it absurd. Run all three
// when you doubt the numbers: if they do not differ, the emulation is not being
// applied and the measurement means nothing. Recorded 2026-09-05 on the
// invitation — none 0.02s, slow4g 0.51s, crawl 3.80s.
//
// This is SIMULATED throttling on a fast Mac. It is a good proxy and it is NOT
// the same as a real low-end Android; that test is still on the checklist.

// The three pages a guest actually lands on. Override by passing URLs.
const DEFAULT = [
  'http://localhost:4321/i/0do4wz1/',
  'http://localhost:4321/i/0do4wz1/rsvp',
  'http://localhost:4321/ceremonies',
];
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const q = pending.get(m.id); pending.delete(m.id); m.error ? q.reject(new Error(JSON.stringify(m.error))) : q.resolve(m.result); } };
const send = (me, pa = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: n, method: me, params: pa })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Network.enable');

const MEASURE = `
  new Promise((resolve) => {
    const out = { lcp: 0, fcp: 0, cls: 0, lcpEl: '' };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        out.lcp = e.startTime;
        out.lcpEl = (e.element && (e.element.tagName + (e.element.className ? '.' + String(e.element.className).split(' ')[0] : ''))) || '';
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') out.fcp = e.startTime;
    }).observe({ type: 'paint', buffered: true });
    // Layout shift after load is what a guest sees as the page jumping.
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => resolve(out), 4000);
  })`;

console.log(`MODE=${process.env.MODE || 'slow4g'}\n`);
let worst = 0;
for (const url of PAGES) {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const MODE = process.env.MODE || 'slow4g';
  if (MODE === 'none') {
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  } else if (MODE === 'crawl') {
    await send('Network.emulateNetworkConditions', { offline: false, latency: 600, downloadThroughput: 50 * 1024 / 8, uploadThroughput: 20 * 1024 / 8 });
    await send('Emulation.setCPUThrottlingRate', { rate: 20 });
  } else {
    await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  let bytes = 0, requests = 0;
  const onData = (m) => { if (m.method === 'Network.loadingFinished') { bytes += m.params.encodedDataLength; requests++; } };
  const listener = (e) => onData(JSON.parse(e.data));
  ws.addEventListener('message', listener);

  await send('Page.navigate', { url });
  const r = await send('Runtime.evaluate', { expression: MEASURE, awaitPromise: true, returnByValue: true });
  ws.removeEventListener('message', listener);

  const { lcp, fcp, cls, lcpEl } = r.result.value;
  worst = Math.max(worst, lcp);
  const s = (n) => `${(n / 1000).toFixed(2)}s`;
  const flag = lcp > 2500 ? ' ← OVER 2.5s BUDGET' : '';
  console.log(`${url.replace('http://localhost:4321', '') || '/'}`);
  console.log(`   FCP ${s(fcp)}   LCP ${s(lcp)}${flag}   CLS ${cls.toFixed(4)}`);
  console.log(`   LCP element: ${lcpEl || '(none)'}`);
  console.log(`   ${requests} requests, ${(bytes / 1024).toFixed(1)}KB over the wire\n`);
}
console.log(worst <= 2500 ? `BUDGET MET — worst LCP ${(worst / 1000).toFixed(2)}s of 2.50s` : `BUDGET MISSED — worst LCP ${(worst / 1000).toFixed(2)}s`);
ws.close();
process.exit(process.env.MODE ? 0 : worst <= 2500 ? 0 : 1);
