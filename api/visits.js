import { put, list } from '@vercel/blob';

const FILE = 'analytics/visits.json';
const TZ = 'Asia/Ho_Chi_Minh';

function todayKey(){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get = type => parts.find(x=>x.type===type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

async function readData(){
  try{
    const result = await list({prefix:FILE,limit:20});
    const blob = (result.blobs||[]).find(x=>x.pathname===FILE && x.url);
    if(blob?.url){
      const r = await fetch(blob.url+'?v='+Date.now(),{cache:'no-store'});
      if(r.ok) return await r.json();
    }
  }catch(_){ }
  return {days:{},updatedAt:null};
}

async function saveData(data){
  return put(FILE,JSON.stringify(data,null,2)+'\n',{
    access:'public',
    addRandomSuffix:false,
    allowOverwrite:true,
    contentType:'application/json; charset=utf-8',
    cacheControlMaxAge:0
  });
}

function clean(data){
  const days={};
  for(const [key,value] of Object.entries(data?.days||{})){
    if(/^\d{4}-\d{2}-\d{2}$/.test(key)) days[key]=Math.max(0,Number(value)||0);
  }
  return {days,updatedAt:data?.updatedAt||null};
}

function summary(data){
  const days=data.days||{};
  const now=new Date();
  const keys=[];
  for(let i=0;i<30;i++){
    const d=new Date(now.getTime()-i*86400000);
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const get=t=>parts.find(x=>x.type===t)?.value||'';
    keys.push(`${get('year')}-${get('month')}-${get('day')}`);
  }
  const today=keys[0], yesterday=keys[1];
  const total=Object.values(days).reduce((a,b)=>a+(Number(b)||0),0);
  const last7=keys.slice(0,7).reduce((a,k)=>a+(Number(days[k])||0),0);
  const last30=keys.reduce((a,k)=>a+(Number(days[k])||0),0);
  return {
    ok:true,
    today:days[today]||0,
    yesterday:days[yesterday]||0,
    last7,
    last30,
    total,
    daily:keys.reverse().map(date=>({date,count:Number(days[date])||0})),
    updatedAt:data.updatedAt||null
  };
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(204).end();
  try{
    if(req.method==='GET') return res.status(200).json(summary(clean(await readData())));
    if(req.method!=='POST') return res.status(405).json({ok:false,message:'Method không được hỗ trợ.'});

    const data=clean(await readData());
    const key=todayKey();
    data.days[key]=(data.days[key]||0)+1;
    data.updatedAt=new Date().toISOString();
    await saveData(data);
    return res.status(200).json({ok:true,today:data.days[key]});
  }catch(e){
    console.error('VISITS_API_ERROR',e);
    return res.status(500).json({ok:false,message:e?.message||'Không thể cập nhật thống kê.'});
  }
}
