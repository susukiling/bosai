importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'BF0ceYZDig1wc1gsgwMI0v3lFSltlt11cqBh-Yq-rMbjFsgcVgLBkN9puhptNLOFL2rxpnThNkCw4VbnwCXbEfE',authDomain:'BF0ceYZDig1wc1gsgwMI0v3lFSltlt11cqBh-Yq-rMbjFsgcVgLBkN9puhptNLOFL2rxpnThNkCw4VbnwCXbEfE',projectId:'BF0ceYZDig1wc1gsgwMI0v3lFSltlt11cqBh-Yq-rMbjFsgcVgLBkN9puhptNLOFL2rxpnThNkCw4VbnwCXbEfE',messagingSenderId:'BF0ceYZDig1wc1gsgwMI0v3lFSltlt11cqBh-Yq-rMbjFsgcVgLBkN9puhptNLOFL2rxpnThNkCw4VbnwCXbEfE',appId:'BF0ceYZDig1wc1gsgwMI0v3lFSltlt11cqBh-Yq-rMbjFsgcVgLBkN9puhptNLOFL2rxpnThNkCw4VbnwCXbEfE'}); // ←index.htmlと同じ設定値を貼る
firebase.messaging(); // バックグラウンド通知はFCMが自動表示

const C='bosai-v2';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js','https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css']).catch(()=>{})))});
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||/p2pquake|googleapis|gstatic/.test(u.hostname))return;
  e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request)));
});
