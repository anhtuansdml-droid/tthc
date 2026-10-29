import { gunzipSync } from 'node:zlib';
import { tthc401GzipBase64 } from '../data/tthc_401_2026-10-29.b64.js';
import newCodes from '../data/tthc_401_codes_2026-10-29.json' with { type: 'json' };

const TARGET_TOTAL=401,TARGET_FULL=311,TARGET_PARTIAL=90;
let cache={at:0,value:null};
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
function loadWorkbook(){return JSON.parse(gunzipSync(Buffer.from(tthc401GzipBase64,'base64')).toString('utf8'));}
function buildRows(){const wanted=new Set(newCodes),data=loadWorkbook(),rows=data.filter(x=>wanted.has(String(x.ma||'').trim()));return rows.map(x=>({...x,nguon:'Sổ làm việc2.xlsx - cập nhật 25/10/2026'}));}
function stats(rows){return{full:rows.filter(x=>norm(x.mucDo||x.mucDichVu)==='toan trinh').length,partial:rows.filter(x=>norm(x.mucDo||x.mucDichVu)==='mot phan').length}}
async function build(force=false){if(!force&&cache.value&&Date.now()-cache.at<60000)return cache.value;const rows=buildRows(),s=stats(rows),result={ok:true,source:'Dữ liệu Excel Sổ làm việc2.xlsx',sourceData:'Sổ làm việc2.xlsx - cập nhật 25/10/2026',fetchedAt:new Date().toISOString(),total:rows.length,province:0,commune:rows.length,dvcTotal:rows.length,dvcProvince:0,dvcCommune:rows.length,full:s.full,partial:s.partial,newCount:0,changed:0,removed:Math.max(0,TARGET_TOTAL-rows.length),sourceCount:1,sourceErrors:0,rows};cache={at:Date.now(),value:result};return result}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Access-Control-Allow-Origin','*');if(req.method==='OPTIONS')return res.status(204).end();try{const result=await build(String(req.query?.refresh||'')==='true');return res.status(result.total===TARGET_TOTAL&&result.full===TARGET_FULL&&result.partial===TARGET_PARTIAL?200:500).json(result)}catch(e){return res.status(502).json({ok:false,message:e?.message||'Không tải được bộ TTHC từ Excel',source:'Dữ liệu Excel Sổ làm việc2.xlsx'})}}
