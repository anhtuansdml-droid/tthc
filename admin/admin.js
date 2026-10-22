const API='https://tthc-anhtuansdml-9137.vercel.app/api/admin';
let config=null, token=sessionStorage.getItem('tthc_admin_token')||'';
const $=id=>document.getElementById(id);
const set=(id,v)=>{if($(id))$(id).value=v??''};
const get=id=>$(id)?.value||'';

async function api(url,options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  if(token) headers.Authorization='Bearer '+token;
  const r=await fetch(url,{...options,headers});
  let data={}; try{data=await r.json()}catch{}
  if(!r.ok) throw new Error(data.message||('Lỗi máy chủ '+r.status));
  return data;
}
async function login(){
  try{
    const data=await api(API+'?action=login',{method:'POST',body:JSON.stringify({username:get('loginUser').trim(),password:get('loginPass')})});
    token=data.token; sessionStorage.setItem('tthc_admin_token',token);
    $('loginScreen').classList.add('hidden'); $('adminApp').classList.remove('hidden');
    await loadConfig();
  }catch(e){$('loginMsg').textContent=e.message}
}
async function loadConfig(){
  config=await api(API); fillForm();
}
function fillForm(){
  const h=config.header||{},f=config.footer||{},d=config.display||{};
  set('title',h.title);set('subtitle',h.subtitle);set('slogan',h.slogan);
  set('titleColor',h.titleColor||'#c5161d');set('subtitleColor',h.subtitleColor||'#c5161d');set('sloganColor',h.sloganColor||'#c5161d');
  set('footerTitle',f.title);set('footerSubtitle',f.subtitle);set('sourceText',f.sourceText);set('sourceUrl',f.sourceUrl);set('author',f.author);set('unit',f.unit);
  set('columns',String(d.columns||4));$('showClock').checked=d.showClock!==false;$('showStats').checked=d.showStats!==false;
  $('logoPreview').src=h.logo||'';$('bgPreview').src=h.background||'';$('footerPreview').src=f.background||'';
}
function collect(){
  config.header={...(config.header||{}),title:get('title'),subtitle:get('subtitle'),slogan:get('slogan'),titleColor:get('titleColor'),subtitleColor:get('subtitleColor'),sloganColor:get('sloganColor')};
  config.footer={...(config.footer||{}),title:get('footerTitle'),subtitle:get('footerSubtitle'),sourceText:get('sourceText'),sourceUrl:get('sourceUrl'),author:get('author'),unit:get('unit')};
  config.display={...(config.display||{}),columns:Number(get('columns')),showClock:$('showClock').checked,showStats:$('showStats').checked};
}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
async function uploadImage(file,type){
  if(!file)return;
  if(file.size>5*1024*1024){alert('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5 MB.');return}
  const data=await fileToDataURL(file);
  const result=await api(API+'?action=upload&type='+encodeURIComponent(type),{method:'POST',body:JSON.stringify({data,contentType:file.type||'image/jpeg'})});
  if(type==='logo'){config.header={...(config.header||{}),logo:result.url};$('logoPreview').src=result.url}
  if(type==='background'){config.header={...(config.header||{}),background:result.url};$('bgPreview').src=result.url}
  if(type==='footer'){config.footer={...(config.footer||{}),background:result.url};$('footerPreview').src=result.url}
  $('saveMsg').style.display='block';$('saveMsg').textContent='✓ Đã tải ảnh lên. Bấm LƯU THAY ĐỔI để áp dụng.';
}
async function save(){
  try{
    collect();$('saveMsg').style.display='block';$('saveMsg').textContent='Đang lưu cấu hình...';
    await api(API+'?action=config',{method:'POST',body:JSON.stringify(config)});
    $('saveMsg').textContent='✓ Đã lưu. Website cập nhật cấu hình mới ngay sau khi tải lại.';
    setTimeout(()=>$('saveMsg').style.display='none',7000);
  }catch(e){$('saveMsg').textContent='Lỗi: '+e.message}
}
function previewFile(inputId,imgId){const f=$(inputId).files[0];if(f)$(imgId).src=URL.createObjectURL(f)}
$('loginBtn').onclick=login;$('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('logoutBtn').onclick=()=>{sessionStorage.removeItem('tthc_admin_token');location.reload()};
$('saveBtn').onclick=save;$('previewBtn').onclick=()=>window.open('../','_blank');
$('logoFile').onchange=()=>previewFile('logoFile','logoPreview');$('bgFile').onchange=()=>previewFile('bgFile','bgPreview');$('footerFile').onchange=()=>previewFile('footerFile','footerPreview');
$('logoFile').closest('.image-card').querySelector('[data-upload]').onclick=()=>uploadImage($('logoFile').files[0],'logo').catch(e=>alert('Lỗi: '+e.message));
$('bgFile').closest('.image-card').querySelector('[data-upload]').onclick=()=>uploadImage($('bgFile').files[0],'background').catch(e=>alert('Lỗi: '+e.message));
$('footerFile').closest('.image-card').querySelector('[data-upload]').onclick=()=>uploadImage($('footerFile').files[0],'footer').catch(e=>alert('Lỗi: '+e.message));
if(token){(async()=>{try{$('loginScreen').classList.add('hidden');$('adminApp').classList.remove('hidden');await loadConfig()}catch(e){sessionStorage.removeItem('tthc_admin_token');token='';$('loginScreen').classList.remove('hidden');$('adminApp').classList.add('hidden')}})()}
