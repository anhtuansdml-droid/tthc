const API='/api/admin';
const SYNC='/api/sync';
let config=null,token=sessionStorage.getItem('tthc_admin_token')||'',catalogRows=[];
const $=id=>document.getElementById(id);const set=(id,v)=>{if($(id))$(id).value=v??''};const get=id=>$(id)?.value||'';
async function api(url,options={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),url.includes('/api/verify-tthc')?75000:30000);try{const r=await fetch(url,{...options,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',...(options.headers||{})},body:options.body===undefined?undefined:JSON.stringify(options.body)});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.message||('Lỗi máy chủ '+r.status));return data}catch(e){if(e.name==='AbortError')throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');throw e}finally{clearTimeout(timer)}}
async function login(){try{const data=await api(API+'?action=login',{method:'POST',body:{username:get('loginUser').trim(),password:get('loginPass')}});token=data.token;sessionStorage.setItem('tthc_admin_token',token);$('loginScreen').classList.add('hidden');$('adminApp').classList.remove('hidden');await loadConfig();await loadSyncStatus();await loadVerifyStatus()}catch(e){$('loginMsg').textContent=e.message||'Không kết nối được máy chủ'}}
async function loadConfig(){config=await api(API);fillForm()}
function fillForm(){const h=config.header||{},f=config.footer||{},d=config.display||{};set('title',h.title);set('subtitle',h.subtitle);set('slogan',h.slogan);set('titleColor',h.titleColor||'#c5161d');set('subtitleColor',h.subtitleColor||'#c5161d');set('sloganColor',h.sloganColor||'#c5161d');set('footerTitle',f.title);set('footerSubtitle',f.subtitle);set('sourceText',f.sourceText);set('sourceUrl',f.sourceUrl);set('author',f.author);set('unit',f.unit);set('columns',String(d.columns||4));$('showClock').checked=d.showClock!==false;$('showStats').checked=d.showStats!==false;set('logoUrl',h.logo);set('bgUrl',h.background);set('footerUrl',f.background);setPreview('logoPreview',h.logo);setPreview('bgPreview',h.background);setPreview('footerPreview',f.background)}
function setPreview(id,url){const img=$(id);if(img){img.src=url||'';img.style.display=url?'block':'none'}}
function collect(){config.header={...(config.header||{}),title:get('title'),subtitle:get('subtitle'),slogan:get('slogan'),titleColor:get('titleColor'),subtitleColor:get('subtitleColor'),sloganColor:get('sloganColor'),logo:get('logoUrl').trim(),background:get('bgUrl').trim()};config.footer={...(config.footer||{}),title:get('footerTitle'),subtitle:get('footerSubtitle'),sourceText:get('sourceText'),sourceUrl:get('sourceUrl'),author:get('author'),unit:get('unit'),background:get('footerUrl').trim()};config.display={...(config.display||{}),columns:Number(get('columns')),showClock:$('showClock').checked,showStats:$('showStats').checked}}
async function save(){const btn=$('saveBtn');try{collect();btn.disabled=true;const old=btn.textContent;btn.textContent='ĐANG LƯU...';$('saveMsg').style.display='block';$('saveMsg').textContent='Đang lưu cấu hình...';await api(API+'?action=config',{method:'POST',headers:{Authorization:'Bearer '+token},body:{config}});$('saveMsg').textContent='✓ Đã lưu cấu hình thành công.';setTimeout(()=>$('saveMsg').style.display='none',7000);btn.textContent=old}catch(e){$('saveMsg').textContent='Lỗi: '+e.message;btn.textContent='LƯU THAY ĐỔI'}finally{btn.disabled=false}}
function setUploadStatus(id,msg,ok=false){const el=$(id);if(el){el.textContent=msg;el.className='upload-status '+(ok?'ok':'')}}
function dataUrlFromBlob(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function prepareImage(file){const maxBytes=3.2*1024*1024;if(file.size<=maxBytes)return {base64:await dataUrlFromBlob(file),contentType:file.type||'image/png',fileName:file.name};const bitmap=await createImageBitmap(file);const maxSide=2400;const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));if(!blob)throw new Error('Không xử lý được ảnh.');return {base64:await dataUrlFromBlob(blob),contentType:'image/webp',fileName:file.name.replace(/\.[^.]+$/,'')+'.webp'}}
async function uploadImage(fileId,urlId,previewId,statusId){const file=$(fileId)?.files?.[0];if(!file){alert('Hãy chọn ảnh trước.');return}const btn=$(`uploadBtn-${fileId}`);try{btn.disabled=true;btn.textContent='⏳ ĐANG ĐẨY...';setUploadStatus(statusId,'Đang chuẩn bị ảnh...');const prepared=await prepareImage(file);const raw=prepared.base64.split(',')[1];setUploadStatus(statusId,'Đang đẩy ảnh lên kho website...');const result=await api(API+'?action=upload',{method:'POST',headers:{Authorization:'Bearer '+token},body:{fileName:prepared.fileName,contentType:prepared.contentType,base64:raw}});set(urlId,result.url);setPreview(previewId,result.url);setUploadStatus(statusId,'✓ Đã đẩy ảnh. Bấm LƯU THAY ĐỔI để áp dụng.',true);$(fileId).value=''}catch(e){setUploadStatus(statusId,'Lỗi: '+e.message);alert('Không đẩy được ảnh: '+e.message)}finally{btn.disabled=false;btn.textContent='☁️ ĐẨY ẢNH LÊN'}}
function bindImageUpload(fileId,urlId,previewId,statusId){const btn=$(`uploadBtn-${fileId}`);if(btn)btn.onclick=()=>uploadImage(fileId,urlId,previewId,statusId)}
async function loadSyncStatus(){try{const m=await api(SYNC+'?action=status');$('syncTime').textContent=m.syncedAt?new Date(m.syncedAt).toLocaleString('vi-VN'):'Chưa có';$('syncTotal').textContent=m.total??'—';$('syncFull').textContent=m.full??'—';$('syncPartial').textContent=m.partial??'—';$('syncMessage').textContent=m.warning?'⚠ '+m.warning:(m.syncedAt?'✓ Dữ liệu đã được đồng bộ.':'Chưa thực hiện đồng bộ.')}catch(e){$('syncMessage').textContent='Không đọc được trạng thái đồng bộ.'}}
async function syncNow(){const btn=$('syncBtn');try{btn.disabled=true;btn.textContent='⏳ ĐANG ĐỒNG BỘ...';$('syncMessage').textContent='Đang kết nối Cổng Dịch vụ công Quốc gia...';const m=await api(SYNC,{method:'POST',headers:{Authorization:'Bearer '+token}});$('syncTime').textContent=new Date(m.syncedAt).toLocaleString('vi-VN');$('syncTotal').textContent=m.total;$('syncFull').textContent=m.full;$('syncPartial').textContent=m.partial;$('syncMessage').textContent=`✓ Đồng bộ xong. Thêm ${m.added||0}, sửa ${m.changed||0}, bỏ ${m.removed||0}.`;if(m.warning)$('syncMessage').textContent='⚠ '+m.warning;alert(`Đã đồng bộ TTHC.\nTổng: ${m.total}\nThêm: ${m.added||0}\nThay đổi: ${m.changed||0}\nBãi bỏ: ${m.removed||0}`)}catch(e){$('syncMessage').textContent='Lỗi: '+e.message;alert('Lỗi đồng bộ: '+e.message)}finally{btn.disabled=false;btn.textContent='🔄 ĐỒNG BỘ NGAY'}}

function loadSheetJS(){
 if(window.XLSX)return Promise.resolve();
 const urls=['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
 return new Promise((resolve,reject)=>{
  let i=0;function attempt(){
   if(i>=urls.length)return reject(new Error('Không tải được thư viện đọc Excel. Kiểm tra kết nối mạng hoặc chuyển sang CSV.'));
   const script=document.createElement('script');script.src=urls[i++];script.onload=()=>window.XLSX?resolve():attempt();script.onerror=attempt;document.head.appendChild(script);
  }attempt();
 });
}
function normKey(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}
function normalizeRow(obj){
 const names=Object.keys(obj||{});
 const field=aliases=>{const opts=new Set(aliases.map(normKey));const found=names.find(key=>opts.has(normKey(key)));return found===undefined?'':String(obj[found]??'').trim()};
 return {
  ma:field(['Mã TTHC','Mã số TTHC','MaTTHC','Mã thủ tục hành chính','Mã thủ tục','code','ma','MaThuTuc','procedureCode']),
  ten:field(['Tên TTHC','TenTTHC','Tên thủ tục hành chính','Tên thủ tục','procedureName','name','ten']),
  linhVuc:field(['Lĩnh vực','LinhVuc','categoryName','category']),
  coQuanChuTri:field(['Cơ quan chủ trì','Cơ quan ban hành','CoQuanChuTri','departmentPromulgate']),
  coQuanThucHien:field(['Cơ quan thực hiện','Tên CQTH','TenCQTH','Đơn vị thực hiện','CoQuanThucHien','executingAgencies']),
  maCoQuan:field(['Mã cơ quan','Mã CQTH','MaCQTH','departmentCode']),
  cap:field(['Cấp thực hiện','CapThucHien','executionLevel','level']),
  loai:field(['Loại thủ tục','LoaiTTHC','procedureType','type']),
  mucDo:field(['Mức độ','MucDo','serviceType']),
  mucDichVu:field(['Mức độ dịch vụ công','Dịch vụ công','MucDichVu','DVC','serviceLevel','onlineLevel']),
  maThucHien:field(['Mã thực hiện','MaThucHien','executionCode']),
  dvcqgId:field(['UUID','DVCQG ID','DVCQGId','formalityUuid']),
  trangThai:field(['Trạng thái','TrangThai','status']),
  url:field(['Đường dẫn DVCQG','Link DVCQG','CitizenURL','url','Link'])
 };
}
function isHeaderRow(values){
 const keys=new Set(values.map(normKey));
 const code=['Mã TTHC','Mã số TTHC','MaTTHC','Mã thủ tục hành chính','Mã thủ tục','code','ma','MaThuTuc'].some(v=>keys.has(normKey(v)));
 const title=['Tên TTHC','TenTTHC','Tên thủ tục hành chính','Tên thủ tục','procedureName','name','ten'].some(v=>keys.has(normKey(v)));
 return code&&title;
}
function rowsFromGrid(grid){
 let headerAt=-1;
 for(let i=0;i<Math.min(35,grid.length);i++){if(isHeaderRow(grid[i]||[])){headerAt=i;break}}
 if(headerAt<0)return [];
 const headers=grid[headerAt].map(x=>String(x??'').trim());
 return grid.slice(headerAt+1).filter(row=>Array.isArray(row)&&row.some(v=>String(v??'').trim())).map(row=>{
  const obj={};headers.forEach((key,i)=>{if(key)obj[key]=row[i]??''});return normalizeRow(obj);
 });
}
function csvToRows(raw){
 const text=String(raw).replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0]||'';
 const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 const grid=[],row=[];let cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(!quoted&&c===delimiter){row.push(cell);cell='';continue}
  if(!quoted&&(c==='\r'||c==='\n')){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);grid.push(row.splice(0));cell='';continue;
  }cell+=c;
 }
 if(cell||row.length){row.push(cell);grid.push(row)}
 return rowsFromGrid(grid);
}
async function readCatalogFile(file){
 if(file.size>15*1024*1024)throw new Error('File vượt 15 MB. Hãy loại các sheet/ảnh không cần thiết.');
 const extension=(file.name.split('.').pop()||'').toLowerCase();
 if(extension==='json'){
  const obj=JSON.parse(await file.text());
  const rows=Array.isArray(obj)?obj:obj.procedures||obj.rows||(Array.isArray(obj.data)?obj.data:obj.data?.procedures);
  if(!Array.isArray(rows))throw new Error('JSON không có mảng procedures/rows/data.');
  return rows.map(normalizeRow);
 }
 if(extension==='csv')return csvToRows(await file.text());
 if(extension!=='xls'&&extension!=='xlsx')throw new Error('Chỉ hỗ trợ .xls, .xlsx, .csv hoặc .json.');
 await loadSheetJS();
 let workbook;
 try{workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellText:true,cellDates:false})}
 catch(e){throw new Error('File Excel không mở được. Có thể tệp bị hỏng hoặc bị đặt sai đuôi.')}
 const all=[];
 for(const sheetName of workbook.SheetNames){
  const grid=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,defval:'',raw:false,blankrows:false});
  all.push(...rowsFromGrid(grid));
 }
 if(!all.length)throw new Error('Không tìm thấy dòng tiêu đề có cả MÃ TTHC và TÊN TTHC trên các sheet.');
 return all;
}
function analyzeRows(rows){
 const valid=[],errors=[],codes=new Set();
 rows.forEach((r,index)=>{
  const ma=String(r.ma??'').trim(),ten=String(r.ten??'').trim();
  if(!ma&&!ten)return;
  if(!ma||!ten){errors.push('Dòng dữ liệu '+(index+1)+': thiếu '+(!ma?'mã':'tên')+' thủ tục.');return}
  if(codes.has(ma)){errors.push('Mã trùng: '+ma+' (dòng '+(index+1)+').');return}
  codes.add(ma);valid.push({...r,ma,ten});
 });
 if(valid.length<20)errors.push('Bộ danh mục chỉ có '+valid.length+' thủ tục hợp lệ (cần tối thiểu 20).');
 if(valid.length>5000)errors.push('Bộ danh mục vượt quá giới hạn 5.000 thủ tục.');
 return {valid,errors};
}
function showImportPreview(rows){
 const check=analyzeRows(rows);
 catalogRows=check.errors.length?[]:check.valid;
 const box=$('importPreview');box.classList.remove('hidden');box.replaceChildren();
 function line(value){const p=document.createElement('div');p.textContent=value;box.appendChild(p)}
 line('Tổng số thủ tục đọc được: '+check.valid.length);
 line('Mã mẫu: '+check.valid.slice(0,6).map(x=>x.ma).join(', '));
 if(check.errors.length){
  line('PHÁT HIỆN '+check.errors.length+' LỖI - CHƯA CHO PHÉP CẬP NHẬT');
  check.errors.slice(0,20).forEach(x=>line('⚠ '+x));
  if(check.errors.length>20)line('... và '+(check.errors.length-20)+' lỗi khác.');
 }else line('✓ Mã duy nhất, có tên và đủ số dòng. Có thể tải lên.');
 return check;
}
async function previewCatalog(){
 const file=$('catalogFile').files?.[0];
 if(!file){alert('Hãy chọn file danh mục TTHC.');return}
 try{
  $('importMessage').textContent='Đang phân tích các sheet và kiểm tra mã TTHC...';
  const rows=await readCatalogFile(file),check=showImportPreview(rows);
  $('importMessage').textContent=check.errors.length?'⚠ File có lỗi, chưa cập nhật danh mục.':'✓ Đã kiểm tra file. Sẵn sàng cập nhật '+check.valid.length+' thủ tục.';
 }catch(e){catalogRows=[];$('importMessage').textContent='Lỗi đọc file: '+e.message}
}
let verifyResult=null;
function renderVerification(report){
 const box=$('verifyMessage'),details=$('verifyIssues');
 if(!box||!details)return;
 details.replaceChildren();
 if(!report||!report.results){box.textContent='Chưa có báo cáo đối chiếu danh mục vừa cập nhật.';return}
 verifyResult=report;
 const c=report.counts||{};
 box.textContent='Kết quả '+new Date(report.verifiedAt).toLocaleString('vi-VN')+
  ': '+(c.khop||0)+' khớp mã và tên; '+(c.khop_ma||0)+' khớp mã (chưa có tên đối chiếu); '+
  (c.khac_ten||0)+' khác tên; '+(c.chua_tim_thay||0)+' chưa tìm thấy; '+
  (c.chua_xac_minh||0)+' chưa xác minh. Đã xử lý '+report.total+' thủ tục.'+
  ' Link đối chiếu đúng TTHC: '+(report.linked||0)+'. Link nộp hồ sơ trực tiếp: '+(report.submitLinks||0)+'. Link tra cứu: '+Math.max(0,(report.linked||0)-(report.submitLinks||0))+'.'+
  (report.warning?' ⚠ '+report.warning:'');
 const issues=report.results.filter(x=>x.status!=='khop'&&x.status!=='khop_ma');
 if(!issues.length){details.textContent='✓ Không phát hiện sai khác trong các thủ tục đã đối chiếu.';return}
 const table=document.createElement('table');table.className='verify-table';
 const header=document.createElement('tr');['Mã TTHC','Tên trong Excel','Trạng thái','Tên trên Cổng DVCQG'].forEach(s=>{const th=document.createElement('th');th.textContent=s;header.appendChild(th)});table.appendChild(header);
 issues.slice(0,40).forEach(x=>{
  const tr=document.createElement('tr');
  [x.ma,x.ten,x.status,x.tenDVCQG||'—'].forEach(s=>{const td=document.createElement('td');td.textContent=s;tr.appendChild(td)});
  table.appendChild(tr);
 });details.appendChild(table);
 if(issues.length>40){const p=document.createElement('p');p.textContent='Hiển thị 40/'+issues.length+' trường hợp cần xem xét. Tải CSV để xem toàn bộ.';details.appendChild(p)}
}
async function loadVerifyStatus(){
 try{const r=await api('/api/verify-tthc');if(r.verified)renderVerification(r);else if($('verifyMessage'))$('verifyMessage').textContent=r.message||'Chưa có báo cáo.'}
 catch(e){if($('verifyMessage'))$('verifyMessage').textContent='Không đọc được báo cáo đối chiếu: '+e.message}
}
async function verifyCatalog(){
 const btn=$('verifyBtn');if(btn)btn.disabled=true;
 const status=$('verifyMessage');if(status)status.textContent='⏳ Đang tự động đối chiếu danh mục mới với Cổng DVCQG. Không đóng tab khi kiểm tra...';
 try{
  const report=await api('/api/verify-tthc',{method:'POST',headers:{Authorization:'Bearer '+token}});
  renderVerification(report);
  if(status&&report.complete)status.textContent+=' ✓ Đã nhận hết các trang dữ liệu do Cổng trả về.';
  return report;
 }catch(e){
  if(status)status.textContent='⚠ Chưa thể đối chiếu tự động: '+e.message+' Danh mục Excel vừa nhập vẫn được giữ nguyên. Có thể bấm KIỂM TRA LẠI.';
  return null;
 }finally{if(btn)btn.disabled=false}
}
function downloadVerificationCSV(){
 if(!verifyResult?.results?.length){alert('Chưa có báo cáo để tải.');return}
 const heads=['Mã TTHC','Tên Excel','Kết quả','Tên DVCQG','UUID DVCQG','Loại liên kết','URL DVCQG','Link QR'];
 const esc=v=>{let s=String(v??'');if(/^[=+@\\-\\t\\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 const lines=[heads,...verifyResult.results.map(x=>[x.ma,x.ten,x.status,x.tenDVCQG,x.dvcqgId,x.linkType,x.url,x.url?'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(x.url):''])].map(r=>r.map(esc).join(','));
 const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='Doi_chieu_TTHC_DVCQG_'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
async function importCatalog(){
 const file=$('catalogFile').files?.[0];
 if(!file){alert('Hãy chọn file Excel TTHC mới.');return}
 const btn=$('importBtn');
 try{
  if(!catalogRows.length){const rows=await readCatalogFile(file);const result=showImportPreview(rows);if(result.errors.length)throw new Error('File có '+result.errors.length+' lỗi. Hãy kiểm tra lại trước khi cập nhật.')}
  if(!confirm('Thay thế danh mục đang dùng bằng '+catalogRows.length+' TTHC từ file '+file.name+'?\n\nHệ thống sẽ lưu lịch sử trên GitHub và tự đối chiếu toàn bộ mã với Cổng DVCQG.'))return;
  btn.disabled=true;btn.textContent='⏳ ĐANG CẬP NHẬT...';
  $('importMessage').textContent='Đang lưu toàn bộ danh mục lên kho website...';
  const body={procedures:catalogRows,sourceName:'Quản trị viên tải lên: '+file.name};
  let result;
  try{result=await api(SYNC+'?action=import',{method:'POST',headers:{Authorization:'Bearer '+token},body})}
  catch(e){
   if(String(e.message).includes('>25%')&&confirm('File loại hơn 25% thủ tục cũ. Bạn chắc chắn muốn THAY TOÀN BỘ danh mục?')){
    body.confirmReplace=true;
    result=await api(SYNC+'?action=import',{method:'POST',headers:{Authorization:'Bearer '+token},body});
   }else throw e;
  }
  $('importMessage').textContent='✓ Đã lưu '+result.total+' thủ tục. Thêm '+result.added+', sửa '+result.changed+', bỏ '+result.removed+'. Đang đối chiếu DVCQG...';
  $('syncTotal').textContent=result.total;$('syncFull').textContent=result.full;$('syncPartial').textContent=result.partial;
  $('syncTime').textContent=new Date(result.syncedAt).toLocaleString('vi-VN');
  catalogRows=[];verifyResult=null;
  await verifyCatalog();
 }catch(e){
  $('importMessage').textContent='Lỗi cập nhật: '+e.message;
 }finally{btn.disabled=false;btn.textContent='📥 ĐẨY DANH MỤC MỚI'}
}

$('loginBtn').onclick=login;$('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutBtn').onclick=()=>{sessionStorage.removeItem('tthc_admin_token');location.reload()};$('saveBtn').onclick=save;$('syncBtn').onclick=syncNow;$('previewBtn').onclick=()=>window.open('/','_blank');$('importPreviewBtn').onclick=previewCatalog;$('importBtn').onclick=importCatalog;if($('verifyBtn'))$('verifyBtn').onclick=verifyCatalog;if($('verifyExportBtn'))$('verifyExportBtn').onclick=downloadVerificationCSV;$('catalogFile').onchange=()=>{catalogRows=[];$('importPreview').classList.add('hidden');$('importMessage').textContent=''};bindImageUpload('logoFile','logoUrl','logoPreview','logoStatus');bindImageUpload('bgFile','bgUrl','bgPreview','bgStatus');bindImageUpload('footerFile','footerUrl','footerPreview','footerStatus');
if(token){(async()=>{try{$('loginScreen').classList.add('hidden');$('adminApp').classList.remove('hidden');await loadConfig();await loadSyncStatus()}catch(e){sessionStorage.removeItem('tthc_admin_token');token='';$('loginScreen').classList.remove('hidden');$('adminApp').classList.add('hidden')}})()}
