// Service worker ของ Circuit Lab: ใช้งานออฟไลน์ได้หลังเปิดครั้งแรก
// หน้าแอป (HTML) = เครือข่ายก่อน แล้วจึงใช้สำเนาในเครื่อง (ได้เวอร์ชันใหม่เสมอเมื่อออนไลน์)
// ไฟล์อื่น (ไอคอน, manifest, ฟอนต์ Google) = สำเนาในเครื่องก่อน แล้วอัปเดตเบื้องหลัง
const CACHE = 'circuit-lab-v2';
const CORE = ['circuit-lab.html', 'circuit-lab.webmanifest', 'icons/circuit-lab-192.png', 'icons/circuit-lab-512.png', 'icons/circuit-lab-maskable-512.png', 'icons/circuit-lab-apple-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('circuit-lab-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !fonts) return;
  if (same && !/circuit-lab|icons\//.test(url.pathname) && req.mode !== 'navigate') return;   // แอปอื่นใน repo ไม่ยุ่ง
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')){
    // เก็บสำเนาเฉพาะหน้าแอปเอง (หน้าอื่น เช่น index.html ที่ส่งต่อ ไม่ทับสำเนาของแอป)
    const app = url.pathname.endsWith('/circuit-lab.html');
    e.respondWith(fetch(req).then(r => { if (r.ok && app){ const cp = r.clone(); caches.open(CACHE).then(c => c.put('circuit-lab.html', cp)); } return r; })
      .catch(() => caches.match('circuit-lab.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
