// 각 IS 테마 정보
// IS1: 케오베의 버섯안개미궁
// IS2: 팬텀 & 크림슨 솔리테어  → 붉은 벨벳 계열
// IS3: 미즈키 & 카이룰라 아버  → 푸른색 계열
// IS4: 탐험가의 은빛 서리 끝자락 → 설원 계열
// IS5: 살카즈의 영겁 기담       → 붉은색 · 갈색 · 노란색 계열
// IS6: 쉐이의 기이한 계원       → 분홍색 · 녹색 계열
// IS7: 침몰자의 블랙 플로우
const IS_META = {
  is2: { label:'IS:2', title:'팬텀 & 크림슨 솔리테어',
         color:'#c0243c', colorBg:'rgba(192,36,60,0.18)' },
  is3: { label:'IS:3', title:'미즈키 & 카이룰라 아버',
         color:'#4a9eff', colorBg:'rgba(74,158,255,0.18)' },
  is4: { label:'IS:4', title:'탐험가의 은빛 서리 끝자락',
         color:'#7ec8e8', colorBg:'rgba(126,200,232,0.15)' },
  is5: { label:'IS:5', title:'살카즈의 영겁 기담',
         color:'#d4842a', colorBg:'rgba(212,132,42,0.18)' },
  is6: { label:'IS:6', title:'쉐이의 기이한 계원',
         color:'#5fc98a', colorBg:'rgba(95,201,138,0.16)' },
};
// legacy shims
const IS_COLORS = Object.fromEntries(Object.entries(IS_META).map(([k,v])=>[k,v.color]));
const IS_LABELS = Object.fromEntries(Object.entries(IS_META).map(([k,v])=>[k,v.label]));

let currentIS = 'is2';
let currentCat = -1;
let searchQ = '';

function setAccent(is) {
  document.documentElement.style.setProperty('--accent', IS_COLORS[is]);
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function matchSearch(item) {
  if (!searchQ) return true;
  const q = searchQ.toLowerCase();
  return (item.name||'').toLowerCase().includes(q)
      || (item.usage||'').toLowerCase().includes(q)
      || (item.desc||'').toLowerCase().includes(q);
}

function renderTabs() {
  const tabHtml = Object.entries(IS_META).map(([k,meta]) => {
    const isActive = k === currentIS;
    const activeStyle = isActive ? `background:${meta.colorBg};color:${meta.color};` : '';
    return `<button class="is-tab${isActive?' active':''}" data-is="${k}" style="${activeStyle}" onclick="switchIS('${k}')">
      ${meta.label}<span class="tab-sub">${meta.title}</span>
    </button>`;
  }).join('');
  document.getElementById('is-tabs-top').innerHTML = tabHtml;
  document.getElementById('is-tabs-bottom').innerHTML = tabHtml;
}

function renderSidebar() {
  const cats = DATA[currentIS].categories;
  const totalCount = cats.reduce((s,c) => s + (searchQ ? c.items.filter(matchSearch).length : c.items.length), 0);
  const allActive = currentCat === -1 ? ' active' : '';
  let html = `<div class="sidebar-cat${allActive}" onclick="selectCat(-1)">전체<span class="cat-count">${totalCount}</span></div>`;
  cats.forEach((cat, i) => {
    const matchCount = searchQ ? cat.items.filter(matchSearch).length : cat.items.length;
    if (searchQ && matchCount === 0) return;
    const active = i === currentCat ? ' active' : '';
    html += `<div class="sidebar-cat${active}" onclick="selectCat(${i})">${esc(cat.name)}<span class="cat-count">${matchCount}</span></div>`;
  });
  document.getElementById('sidebar').innerHTML = html;
}

function renderMobileCatBar() {
  const cats = DATA[currentIS].categories;
  const totalCount = cats.reduce((s,c) => s + (searchQ ? c.items.filter(matchSearch).length : c.items.length), 0);
  const allActive = currentCat === -1 ? ' active' : '';
  let html = `<span class="mobile-cat-pill${allActive}" onclick="selectCat(-1)">전체<span class="pill-count">${totalCount}</span></span>`;
  cats.forEach((cat, i) => {
    const matchCount = searchQ ? cat.items.filter(matchSearch).length : cat.items.length;
    if (searchQ && matchCount === 0) return;
    const active = i === currentCat ? ' active' : '';
    html += `<span class="mobile-cat-pill${active}" onclick="selectCat(${i})">${esc(cat.name)}<span class="pill-count">${matchCount}</span></span>`;
  });
  const bar = document.getElementById('mobile-cat-bar');
  bar.innerHTML = html;
  // scroll active pill into view
  const activePill = bar.querySelector('.active');
  if (activePill) activePill.scrollIntoView({inline:'center',block:'nearest'});
}

// rogue 번호 → 이미지 폴더 매핑 (신NEW id 체계 기준)
// rogue_2 = IS2, rogue_3 = IS3, rogue_4 = IS4, rogue_5 = IS5, rogue_6 = IS6
const ROGUE_FOLDER = {
  'rogue_2': 'showroom/relics', // IS2: assets/img/showroom/relics/{orderId}.png
  'rogue_3': 'is3',
  'rogue_4': 'is4',
  'rogue_5': 'is5',
  'rogue_6': 'is6',
};

// 확장자 없는 base 경로 반환 (renderCard에서 webp → png 순으로 시도)
function getImgBase(item) {
  // 신NEW: img 필드 우선
  const imgField = item.img || item.imgSrc || '';
  if (imgField) {
    return imgField.replace(/\.(png|webp)$/i, '');
  }
  // img 필드가 비어 있을 경우 id로 자동 생성
  if (item.id && item.id.startsWith('rogue_')) {
    const rogueKey = item.id.slice(0, 7); // "rogue_2" ~ "rogue_6"
    const folder = ROGUE_FOLDER[rogueKey];
    if (!folder) return null;
    if (folder === 'showroom/relics') {
      // IS2: 파일명은 orderId (001, 002, ..., PCS01, ...)
      const fileId = item.orderId || item.id.split('_').pop();
      return 'assets/img/showroom/relics/' + fileId;
    }
    return 'assets/img/' + folder + '/' + item.id;
  }
  return null;
}

function renderCard(item) {
    const isNew = item.new === true;
    const orderId = item.orderId || item.id || '';
    const imgBase = getImgBase(item);
    return `<div class="card">
      <div class="card-top">
        ${imgBase ? `
          <div class="card-image-wrap">
            <img class="card-image" src="${esc(imgBase)}.webp" alt="${esc(item.name||'')}"
              onerror="this.src='${esc(imgBase)}.png'; this.onerror=function(){this.closest('.card-image-wrap').style.display='none'};">
          </div>
        ` : ''}

        <div class="card-main">
          <div style="display:flex;justify-content:space-between;gap:10px;">
            <div class="item-name">${esc(item.name||'')}${isNew ? '<span class="new-badge">NEW</span>' : ''}</div>
            <div class="item-id">#${esc(orderId)}</div>
          </div>

          <div class="item-usage">${esc(item.usage||'')}</div>
          <div class="item-desc">${esc(item.desc||'')}</div>
        </div>
      </div>
    </div>`;
}

function renderMain() {
  const cats = DATA[currentIS].categories;

  if (currentCat === -1) {
    const allItems = cats.flatMap(c => c.items).filter(matchSearch);
    if (allItems.length === 0) {
      document.getElementById('main').innerHTML = `<div class="cat-header"><h2>전체 <span class="count-badge">0개</span></h2><div class="cat-sub">${esc(IS_META[currentIS].title)}</div></div><div class="no-results">검색 결과가 없습니다.</div>`;
      return;
    }
    document.getElementById('main').innerHTML = `
      <div class="cat-header">
        <h2>전체 <span class="count-badge">${allItems.length}개</span></h2>
        <div class="cat-sub">${esc(IS_META[currentIS].title)}</div>
      </div>
      <div class="grid">${allItems.map(item => renderCard(item)).join('')}</div>`;
    return;
  }

  const cat = cats[currentCat] || cats[0];
  if (!cat) { document.getElementById('main').innerHTML = '<div class="no-results">카테고리가 없습니다.</div>'; return; }

  let items = cat.items.filter(matchSearch);

  if (items.length === 0) {
    document.getElementById('main').innerHTML = `<div class="cat-header"><h2>${esc(cat.name)}</h2></div><div class="no-results">검색 결과가 없습니다.</div>`;
    return;
  }

  let cardsHtml = items.map(item => renderCard(item)).join('');

  document.getElementById('main').innerHTML = `
    <div class="cat-header">
      <h2>${esc(cat.name)} <span class="count-badge">${items.length}개</span></h2>
      <div class="cat-sub">${esc(IS_META[currentIS].title)}</div>
    </div>
    <div class="grid">${cardsHtml}</div>
  `;
}

function switchIS(is) {
  currentIS = is;
  currentCat = -1;
  setAccent(is);
  renderTabs();
  renderSidebar();
  renderMobileCatBar();
  renderMain();
  document.getElementById('main').scrollTop = 0;
}

function selectCat(idx) {
  currentCat = idx;
  renderSidebar();
  renderMobileCatBar();
  renderMain();
  document.getElementById('main').scrollTop = 0;
}

function handleSearch(q) {
  searchQ = q;
  if (q) {
    const cats = DATA[currentIS].categories;
    const first = cats.findIndex(c => c.items.some(matchSearch));
    if (first !== -1 && first !== currentCat) currentCat = first;
  }
  renderSidebar();
  renderMobileCatBar();
  renderMain();
}

document.getElementById('search-desktop').addEventListener('input', function() { handleSearch(this.value.trim()); });
document.getElementById('search-mobile').addEventListener('input', function() {
  document.getElementById('search-desktop').value = this.value;
  handleSearch(this.value.trim());
});

setAccent(currentIS);
renderTabs();
renderSidebar();
renderMobileCatBar();
renderMain();