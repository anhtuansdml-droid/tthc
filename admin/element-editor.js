const EAPI='/api/admin';
const EKEY='tthc_admin_token';
const ELEMENTS=[
{id:'headerLogo',label:'Logo đầu trang',selector:'.header-title .logo',kind:'image'},
{id:'headerTitle',label:'Tiêu đề chính Header',selector:'.header-title h1',kind:'text'},
{id:'headerSubtitle',label:'Tên Trung tâm Header',selector:'.header-title p',kind:'text'},
{id:'headerSlogan',label:'Khẩu hiệu Header',selector:'.header-slogan',kind:'text'},
{id:'clock',label:'Đồng hồ',selector:'#clock',kind:'text'},
{id:'themeBtn',label:'Nút đổi giao diện',selector:'#themeBtn',kind:'text'},
{id:'homeBtn',label:'Nút TRANG CHỦ',selector:'.home-btn',kind:'text'},
{id:'searchBox',label:'Ô tìm kiếm',selector:'.search-box',kind:'text'},
{id:'configBtn',label:'Nút CẤU HÌNH',selector:'#configBtn',kind:'text'},
{id:'guideBtn',label:'Nút HƯỚNG DẪN TRA CỨU',selector:'.pakn-btn',kind:'text'},
{id:'statsBtn',label:'Nút THỐNG KÊ',selector:'#statsBtn',kind:'text'},
{id:'refreshBtn',label:'Nút LÀM MỚI',selector:'#deepRefreshBtn',kind:'text'},
{id:'supportBtn',label:'Nút HỖ TRỢ',selector:'.support-btn',kind:'text'},
{id:'adminBtn',label:'Nút QUẢN TRỊ',selector:'.admin-link',kind:'text'},
{id:'promo',label:'Banner giới thiệu',selector:'.tthc-promo-banner',kind:'box'},
{id:'promoTitle',label:'Tiêu đề banner giới thiệu',selector:'.tthc-promo-title',kind:'text'},
{id:'promoSubtitle',label:'Phụ đề banner giới thiệu',selector:'.tthc-promo-subtitle',kind:'text'},
{id:'promoTagline',label:'Dòng mô tả banner',selector:'.tthc-promo-tagline',kind:'text'},
{id:'statsSection',label:'Khối thống kê',selector:'.statistics',kind:'box'},
{id:'sectionTitle',label:'Tiêu đề danh sách lĩnh vực',selector:'.section-title h2',kind:'text'},
{id:'fieldGrid',label:'Khối danh sách lĩnh vực TTHC',selector:'#fieldContainer',kind:'box'},
{id:'footer',label:'Chân trang',selector:'.footer-banner',kind:'box'},
{id:'footerTitle',label:'Tên Trung tâm ở chân trang',selector:'.footer-banner-title',kind:'text'},
{id:'footerAuthor',label:'Thông tin tác giả chân trang',selector:'.footer-banner-author',kind:'text'},
{id:'chat',label:'Nút TRỢ LÝ TTHC',selector:'#tthcChatLauncher',kind:'text'}
];
let cfg=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function ea(url,opt={}){const r=await fetch(url,{...opt,cache:'no-store',headers:{'Content-Type':'application/json',...(opt.headers||{})},body:opt.body===undefined?undefined:JSON.stringify(opt.body)});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.message||('HTTP '+r.status));return d}
function defaults(){return Object.fromEntries(ELEMENTS.map(x=>[x.id,{x:0,y:0,width:0,height:0,fontSize:0,scale:1,rotate:0,hidden:false,text:'',image:''}]))}
function ensure(){cfg=cfg||{};cfg.elements={...defaults(),...(cfg.elements||{})};ELEMENTS.forEach(e=>{cfg.elements[e.id]={...defaults()[e.id],...(cfg.elements[e.id]||{})}})}
function render(){ensure();const root=document.getElementById('elementList');root.innerHTML=ELEMENTS.map(e=>{const c=cfg.elements[e.id],el=document.querySelector(e.selector);const current=e.kind==='image'?(el?.getAttribute('src')||''):(el?.textContent?.trim()||'');return `<div class="ee-item" data-id="${e.id}"><div class="ee-item-head"><b>${e.label}</b><button type="button" class="ee-focus" data-focus="${e.id}">🎯 Định vị</button></div><div class="ee-fields"><label>X <input data-k="x" type="number" value="${c.x}"></label><label>Y <input data-k="y" type="number" value="${c.y}"></label><label>Rộng <input data-k="width" type="number" min="0" value="${c.width}"></label><label>Cao <input data-k="height" type="number" min="0" value="${c.height}"></label><label>Cỡ chữ <input data-k="fontSize" type="number" min="0" value="${c.fontSize}"></label><label>Tỷ lệ <input data-k="scale" type="number" min="0.2" max="4" step="0.05" value="${c.scale}"></label><label>Xoay ° <input data-k="rotate" type="number" min="-180" max="180" value="${c.rotate}"></label><label class="ee-check"><input data-k="hidden" type="checkbox" ${c.hidden?'checked':''}> Ẩn</label><label class="ee-full">Nội dung <input data-k="text" value="${esc(c.text||current)}"></label>${e.kind==='image'?`<label class="ee-full">URL ảnh <input data-k="image" value="${esc(c.image||current)}"></label>`:''}</div></div>`}).join('');
root.querySelectorAll('.ee-item input').forEach(i=>i.addEventListener('input',previewOne));root.querySelectorAll('.ee-focus').forEach(b=>b.onclick=()=>{const e=ELEMENTS.find(x=>x.id===b.dataset.focus),el=document.querySelector(e.selector);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('ee-highlight');setTimeout(()=>el.classList.remove('ee-highlight'),1400)}});document.getElementById('eeStatus').textContent='Đã tải cấu hình phần tử.';applyAll()}
function collectItem(item){const id=item.dataset.id,c=cfg.elements[id];item.querySelectorAll('[data-k]').forEach(i=>{const k=i.dataset.k;if(i.type==='checkbox')c[k]=i.checked;else if(['x','y','width','height','fontSize','scale','rotate'].includes(k))c[k]=Number(i.value)||0;else c[k]=i.value});if(!c.scale)c.scale=1}
function previewOne(){const item=this.closest('.ee-item');if(!item)return;collectItem(item);applyOne(item.dataset.id)}
function applyOne(id){const e=ELEMENTS.find(x=>x.id===id),c=cfg?.elements?.[id],el=document.querySelector(e?.selector||'');if(!e||!c||!el)return;el.classList.add('element-editor-target');el.style.setProperty('--ee-x',Number(c.x)||0+'px');el.style.setProperty('--ee-y',Number(c.y)||0+'px');el.style.setProperty('--ee-scale',Number(c.scale)||1);el.style.setProperty('--ee-rotate',Number(c.rotate)||0+'deg');el.style.transform='translate(var(--ee-x),var(--ee-y)) scale(var(--ee-scale)) rotate(var(--ee-rotate))';el.style.position='relative';if(c.width>0)el.style.width=c.width+'px';if(c.height>0)el.style.height=c.height+'px';if(c.fontSize>0)el.style.fontSize=c.fontSize+'px';el.style.display=c.hidden?'none':'';if(c.text&&e.kind==='text'&&!['searchBox','clock'].includes(id))el.textContent=c.text;if(c.image&&e.kind==='image')el.src=c.image}
function applyAll(){ELEMENTS.forEach(e=>applyOne(e.id))}
function collect(){ensure();document.querySelectorAll('.ee-item').forEach(collectItem)}
async function save(){try{collect();const current=await ea(EAPI);const merged={...current,elements:cfg.elements};const token=sessionStorage.getItem(EKEY)||'';await ea(EAPI+'?action=config',{method:'POST',headers:{Authorization:'Bearer '+token},body:{token,config:merged}});cfg=merged;document.getElementById('eeStatus').textContent='✓ Đã lưu vị trí/kích thước/nội dung từng phần tử. Mở lại website để kiểm tra.';applyAll()}catch(e){document.getElementById('eeStatus').textContent='✕ '+e.message}}
async function boot(){const token=sessionStorage.getItem(EKEY);if(!token){document.getElementById('eeStatus').textContent='🔒 Hãy đăng nhập quản trị ở phía trên trước.';return}try{cfg=await ea(EAPI);render()}catch(e){document.getElementById('eeStatus').textContent='✕ '+e.message}}
window.addEventListener('load',()=>{document.getElementById('saveElements').onclick=save;let n=0;const t=setInterval(()=>{if(sessionStorage.getItem(EKEY)||n++>15){clearInterval(t);boot()}},500)});
