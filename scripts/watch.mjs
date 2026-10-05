import admin from 'firebase-admin';
import {createHash} from 'node:crypto';
admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.SA))});
const db=admin.firestore();db.settings({ignoreUndefinedProperties:true});
const SC={10:'1',20:'2',30:'3',40:'4',45:'5弱',50:'5強',55:'6弱',60:'6強',70:'7'};
const P2P='https://api.p2pquake.net/v2/history?codes=551&codes=552&codes=556&limit=10';
const JMA='https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const age=t=>(Date.now()-new Date(t.replace(/\//g,'-').replace(' ','T').slice(0,19)+'+09:00'))/1000;
const seen=new Set();

function p2p(d){
  if(d.test)return null;
  if(d.code===551&&d.earthquake){const e=d.earthquake,h=e.hypocenter||{};
    const pts=(d.points||[]).slice(0,6).map(p=>p.addr+' 震度'+(SC[p.scale]||'?')).join(' / ');
    return{ev:{id:d.id,type:'eq',time:e.time||d.time,name:h.name||'震源調査中',lat:h.latitude,lon:h.longitude,mag:h.magnitude,depth:h.depth,scale:e.maxScale||0,pts},
      push:(e.maxScale||0)>=30&&['【地震】'+(h.name||'震源調査中'),'最大震度'+(SC[e.maxScale]||'?')+(h.magnitude>0?' M'+h.magnitude:'')]}}
  if(d.code===556&&!d.cancelled){const h=(d.earthquake||{}).hypocenter||{};
    const mx=Math.max(0,...(d.areas||[]).map(a=>a.scaleTo||0));
    const pts=(d.areas||[]).slice(0,8).map(a=>a.name).join('・');
    return{ev:{id:d.id,type:'eew',time:d.time,name:h.name||'震源不明',lat:h.latitude,lon:h.longitude,mag:h.magnitude,depth:h.depth,scale:mx,pts},
      push:['【緊急地震速報】'+(h.name||'強い揺れに警戒'),'強い揺れに備えてください。'+pts]}}
  if(d.code===552&&!d.cancelled){
    const G={MajorWarning:'大津波警報',Warning:'津波警報',Watch:'津波注意報'};
    const pts=(d.areas||[]).slice(0,12).map(a=>(G[a.grade]||'津波予報')+' '+a.name).join(' / ');
    return{ev:{id:d.id,type:'tsu',time:d.time,name:'津波予報',scale:0,pts},push:['【津波情報】',pts.slice(0,100)]}}
  return null}

async function jma(){
  const x=await (await fetch(JMA)).text(),out=[];
  for(const m of x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)){
    const g=r=>(m[1].match(r)||[])[1]||'';
    const title=g(/<title>([\s\S]*?)<\/title>/);
    if(!/噴火速報|噴火警報/.test(title))continue;
    const id=createHash('sha1').update(g(/<id>([\s\S]*?)<\/id>/)).digest('hex').slice(0,24);
    const t=new Date(new Date(g(/<updated>([\s\S]*?)<\/updated>/)).getTime()+9*3600e3).toISOString().slice(0,19).replace('T',' ').replace(/-/g,'/');
    const body=g(/<content[^>]*>([\s\S]*?)<\/content>/).replace(/<[^>]+>/g,'').trim().slice(0,120);
    out.push({ev:{id,type:'vol',time:t,name:title,scale:0,pts:body},push:/噴火速報/.test(title)&&['【火山】'+title,body]})}
  return out}

async function send([title,body]){
  const tk=(await db.collection('tokens').get()).docs.map(d=>d.id);
  for(let i=0;i<tk.length;i+=500){
    const r=await admin.messaging().sendEachForMulticast({tokens:tk.slice(i,i+500),notification:{title,body},webpush:{headers:{Urgency:'high',TTL:'300'}}});
    r.responses.forEach((x,j)=>{if(!x.success&&/not-registered|invalid-registration/.test(x.error?.code||''))db.collection('tokens').doc(tk[i+j]).delete()})}}

async function handle({ev,push}){
  if(seen.has(ev.id))return;seen.add(ev.id);
  try{await db.collection('events').doc(ev.id).create(ev)}catch(e){return} // 保存済みなら何もしない(二重通知防止)
  if(push&&age(ev.time)<600)await send(push)}

const end=Date.now()+29*60e3;let n=0;
while(Date.now()<end){
  try{for(const d of await (await fetch(P2P)).json()){const r=p2p(d);if(r)await handle(r)}}catch(e){console.error('p2p',e.message)}
  if(n++%3===0)try{for(const r of await jma())await handle(r)}catch(e){console.error('jma',e.message)}
  await sleep(10000)}
