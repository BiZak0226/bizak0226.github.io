/* ═══════════════════════════════════════════════
   endfield_archive.js
   오퍼레이터 + 무기 통합 아카이브

   라우팅(location.hash)
     #home      메인 페이지
     #all       통합 목록 (오퍼레이터 + 무기)
     #operator  오퍼레이터 목록
     #weapon    무기 목록
═══════════════════════════════════════════════ */
(() => {
'use strict';

/* ───────── 상수 ───────── */
const OPERATOR_JSON = './data/endfield_operator_file.json';
const WEAPON_JSON   = './data/endfield_weapons_lore.json';

const COLORS = { 6:'#ff7100', 5:'#ffcc00', 4:'#b380ff', 3:'#33C2FF' };
const FALLBACK_COLOR = '#5a6180';
const colorOf = r => COLORS[r] || FALLBACK_COLOR;

const WEAPON_TYPES = {
  sword:'한손검', greatsword:'양손검', polearm:'장병기', handcannon:'권총', arts_unit:'아츠 유닛',
};
const TYPE_ICONS = {
  operator:'◈', sword:'⚔', greatsword:'⚔', polearm:'🗡', handcannon:'🔫', arts_unit:'✦',
};
const TYPE_ORDER   = ['sword','greatsword','polearm','handcannon','arts_unit'];
const RARITY_ORDER = [6, 5, 4, 3];

const FILE_TABS = [
  { key:'base_file',       label:'기본 파일' },
  { key:'profile_summary', label:'프로필 개요' },
  { key:'file01',          label:'파일 01' },
  { key:'file02',          label:'파일 02' },
  { key:'file03',          label:'파일 03' },
  { key:'file04',          label:'파일 04' },
];

const ROUTES = ['home','all','operator','weapon'];

/* ───────── 상태 ───────── */
let ITEMS    = [];          // 오퍼레이터 → 무기(종류·희귀도순) 순서의 통합 배열
let ITEM_MAP = new Map();   // key → item

const S = {
  section: 'all',     // all | operator | weapon
  rarity:  'all',
  wtype:   'all',
  scope:   'all',     // all | lore | name
  terms:   [],
  re:      null,      // 하이라이트/카운트용 정규식 (g)
  reSrc:   '',
  selected:null,
  tab:     'base_file',
};
let searchTimer = null;

const $ = id => document.getElementById(id);
const isMobile = () => window.innerWidth <= 640;

/* ───────── 유틸 ───────── */
const norm = s => String(s ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escAttr = escHtml;

function paragraphs(text) {
  return norm(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${hl(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/* ───────── 검색어 / 하이라이트 ───────── */
function setTerms(raw) {
  const q = raw.trim();
  S.terms = q ? q.toLowerCase().split(/\s+/).filter(Boolean) : [];
  if (S.terms.length) {
    S.reSrc = S.terms.slice().sort((a, b) => b.length - a.length)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    S.re = new RegExp(S.reSrc, 'gi');
  } else {
    S.reSrc = ''; S.re = null;
  }
}
function hl(text) {
  const s = String(text ?? '');
  if (!S.re) return escHtml(s);
  return s.split(new RegExp('(' + S.reSrc + ')', 'gi'))
    .map((p, i) => i % 2 ? `<mark>${escHtml(p)}</mark>` : escHtml(p)).join('');
}
const countIn = text => (S.re && text) ? (String(text).match(S.re) || []).length : 0;

function matchesSearch(it) {
  if (!S.terms.length) return true;
  const hay = S.scope === 'name' ? it._name
            : S.scope === 'lore' ? it._lore
            : it._name + '\n' + it._desc + '\n' + it._lore;
  return S.terms.every(t => hay.includes(t));
}

function makeSnippet(it, radius = 28) {
  const lore = (it.lore || '').replace(/\s+/g, ' ');
  const low = lore.toLowerCase();
  let idx = -1;
  for (const t of S.terms) {
    const i = low.indexOf(t);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return '';
  const start = Math.max(0, idx - radius);
  const end   = Math.min(lore.length, idx + radius + 6);
  return (start > 0 ? '…' : '') + lore.slice(start, end) + (end < lore.length ? '…' : '');
}

/** 오퍼레이터: 검색어가 등장하는 파일 탭 목록 */
function tabHits(it) {
  if (!S.re || it.kind !== 'operator') return [];
  return it.files
    .map(f => ({ key:f.key, label:f.label, count:countIn(f.text) }))
    .filter(f => f.count > 0);
}

/* ───────── 패널 ───────── */
function openPanel()  { isMobile() ? document.body.classList.add('panel-open')    : document.body.classList.remove('panel-collapsed'); }
function closePanel() { isMobile() ? document.body.classList.remove('panel-open') : document.body.classList.add('panel-collapsed'); }
function togglePanel() {
  if (isMobile()) document.body.classList.contains('panel-open') ? closePanel() : openPanel();
  else            document.body.classList.contains('panel-collapsed') ? openPanel() : closePanel();
}

/* ───────── 데이터 로드 ───────── */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

function buildOperators(list) {
  list.forEach((op, i) => {
    const files = FILE_TABS
      .map(t => ({ key:t.key, label:t.label, text:norm(op[t.key]) }))
      .filter(f => f.text.trim());
    ITEMS.push({
      key: 'op:' + i,
      kind: 'operator',
      name: op.name,
      rarity: Number(op.tier) || 0,
      typeKey: 'operator',
      typeLabel: '오퍼레이터',
      description: norm(op.description),
      lore: files.map(f => f.text).join('\n\n'),
      files,
    });
  });
}

function buildWeapons(weaponObj) {
  for (const typeKey of TYPE_ORDER) {
    const rarityMap = weaponObj[typeKey];
    if (!rarityMap) continue;
    for (const rarity of RARITY_ORDER) {
      const bucket = rarityMap[String(rarity)];
      if (!bucket) continue;
      for (const [id, w] of Object.entries(bucket)) {
        ITEMS.push({
          key: 'wp:' + id,
          id,
          kind: 'weapon',
          name: w.name,
          rarity: w.rarity ?? rarity,
          typeKey: w.type_key ?? typeKey,
          typeLabel: w.type ?? WEAPON_TYPES[typeKey],
          description: norm(w.description),
          lore: norm(w.lore),
        });
      }
    }
  }
}

async function loadData() {
  const errors = [];
  const [ops, wps] = await Promise.allSettled([fetchJson(OPERATOR_JSON), fetchJson(WEAPON_JSON)]);

  if (ops.status === 'fulfilled' && Array.isArray(ops.value)) buildOperators(ops.value);
  else errors.push('오퍼레이터 데이터를 불러오지 못했습니다.');

  if (wps.status === 'fulfilled' && wps.value && wps.value.weapon) buildWeapons(wps.value.weapon);
  else errors.push('무기 데이터를 불러오지 못했습니다.');

  ITEMS.forEach(it => {
    it._name = (it.name || '').toLowerCase();
    it._desc = (it.description || '').toLowerCase();
    it._lore = (it.lore || '').toLowerCase();
    ITEM_MAP.set(it.key, it);
  });
  return errors;
}

/* ───────── 필터 ───────── */
function sectionOk(it) { return S.section === 'all' || it.kind === S.section; }

/** 섹션을 제외한 모든 조건 */
function passes(it) {
  if (S.rarity !== 'all' && it.rarity !== parseInt(S.rarity)) return false;
  if (S.section === 'weapon' && it.kind === 'weapon' && S.wtype !== 'all' && it.typeKey !== S.wtype) return false;
  return matchesSearch(it);
}

/* ───────── 홈 ───────── */
function renderHome(errors) {
  const ops = ITEMS.filter(i => i.kind === 'operator');
  const wps = ITEMS.filter(i => i.kind === 'weapon');
  $('home-op-count').textContent = ops.length;
  $('home-wp-count').textContent = wps.length;

  const byRarity = arr => [6, 5, 4, 3]
    .map(r => [r, arr.filter(i => i.rarity === r).length])
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `★${r} ${n}`).join(' · ');
  $('home-op-meta').textContent = byRarity(ops);
  $('home-wp-meta').innerHTML =
    escHtml(byRarity(wps)) + '<br>' +
    TYPE_ORDER.map(k => `${WEAPON_TYPES[k]} ${wps.filter(i => i.typeKey === k).length}`).join(' · ');

  $('home-error').textContent = (errors || []).join(' ') +
    (errors && errors.length ? ' (data 폴더 경로를 확인해 주세요)' : '');
}

/* ───────── 목록 ───────── */
function renderList() {
  const list = $('item-list');

  // 섹션별 개수 (섹션 외 조건 적용)
  const base = ITEMS.filter(passes);
  const nAll = base.length;
  const nOp  = base.filter(i => i.kind === 'operator').length;
  const nWp  = base.filter(i => i.kind === 'weapon').length;
  document.querySelector('.seg-n[data-n="all"]').textContent      = nAll;
  document.querySelector('.seg-n[data-n="operator"]').textContent = nOp;
  document.querySelector('.seg-n[data-n="weapon"]').textContent   = nWp;
  document.querySelectorAll('.seg button').forEach(b =>
    b.classList.toggle('active', b.dataset.seg === S.section));

  const filtered = base.filter(sectionOk);
  $('item-count').textContent = filtered.length;
  $('item-total').textContent = ITEMS.filter(sectionOk).length;
  $('panel-title').textContent = S.section === 'operator' ? 'OPERATORS'
                               : S.section === 'weapon'   ? 'WEAPONS' : 'ARCHIVE';

  if (!filtered.length) {
    list.innerHTML = '<div class="no-results">조건에 맞는 항목이<br>없습니다</div>';
    return;
  }

  const groupOf = it => it.kind === 'operator' ? 'operator' : it.typeKey;
  const groupCount = {};
  filtered.forEach(it => { const g = groupOf(it); groupCount[g] = (groupCount[g] || 0) + 1; });
  const showHeaders = S.section === 'all' || (S.section === 'weapon' && S.wtype === 'all');

  let html = '', lastGroup = null;
  for (const it of filtered) {
    const g = groupOf(it);
    if (showHeaders && g !== lastGroup) {
      html += `
        <div class="group-header">
          <span>${TYPE_ICONS[g] || ''}</span>
          <span class="group-name">${escHtml(g === 'operator' ? '오퍼레이터' : WEAPON_TYPES[g])}</span>
          <span class="group-count">${groupCount[g]}</span>
        </div>`;
    }
    lastGroup = g;

    const color = colorOf(it.rarity);
    const stars = it.rarity > 0 ? '★'.repeat(it.rarity) : '';

    let extra = '';
    if (S.terms.length && S.scope !== 'name') {
      const cnt = countIn(it.lore);
      if (cnt) {
        let hit;
        if (it.kind === 'operator') {
          const labels = tabHits(it).map(t => t.label).join(', ');
          hit = `파일 ${cnt}회 · ${escHtml(labels)}`;
        } else {
          hit = `스토리 ${cnt}회`;
        }
        extra = `<div class="item-snippet">${hl(makeSnippet(it))}</div><div class="item-hit">${hit}</div>`;
      }
    }

    html += `
      <div class="item ${S.selected === it.key ? 'selected' : ''} ${extra ? 'has-snippet' : ''}" data-key="${escAttr(it.key)}">
        <div class="rarity-dot" style="background:${color}"></div>
        <div class="item-info">
          <div class="item-name">${hl(it.name)}</div>
          <div class="item-meta">${escHtml(it.typeLabel)}${stars ? ` · <span class="stars" style="color:${color}">${stars}</span>` : ''}</div>
          ${extra}
        </div>
      </div>`;
  }
  list.innerHTML = html;
}

/* ───────── 상세 ───────── */
function showEmpty() {
  S.selected = null;
  $('detail').style.display = 'none';
  $('empty-state').style.display = '';
}

function selectItem(key) {
  const it = ITEM_MAP.get(key);
  if (!it) return;
  S.selected = key;

  if (it.kind === 'operator') {
    // 검색 중이면 검색어가 있는 첫 파일 탭으로, 아니면 기본 파일
    const hit = tabHits(it)[0];
    S.tab = hit ? hit.key : (it.files[0]?.key || 'base_file');
  }
  renderDetail(key, true);
  document.querySelectorAll('#item-list .item').forEach(el =>
    el.classList.toggle('selected', el.dataset.key === key));
}

function renderDetail(key, resetScroll) {
  const it = ITEM_MAP.get(key);
  if (!it) return;

  $('empty-state').style.display = 'none';
  const detail = $('detail');
  detail.style.display = 'block';

  const color = colorOf(it.rarity);
  const stars = it.rarity > 0 ? '★'.repeat(it.rarity) : '';
  detail.className = `detail rc-${it.rarity}`;
  detail.style.setProperty('--rc', color);

  const badge = it.kind === 'operator'
    ? (it.rarity > 0 ? `${stars} · TIER ${it.rarity}` : 'OPERATOR')
    : `${stars} · RARITY ${it.rarity}`;

  const header = `
    <div class="detail-header">
      <div class="detail-badge" style="color:${color};border-color:${color}40;background:${color}10">${badge}</div>
      <div class="detail-name">${hl(it.name)}</div>
      <div class="detail-type-row">
        <div class="detail-type-tag">${TYPE_ICONS[it.typeKey] || ''} ${escHtml(it.typeLabel)}</div>
        ${it.kind === 'weapon' ? `<div class="detail-id">ID: ${escHtml(it.id)}</div>` : ''}
      </div>
    </div>`;

  let body;
  if (it.kind === 'weapon') {
    const lore = paragraphs(it.lore);
    body = `
      <div class="section-block">
        <div class="section-label">무기 설명</div>
        <div class="desc-box">${hl(it.description).replace(/\n/g, '<br>')}</div>
      </div>
      ${lore ? `
      <div class="section-block">
        <div class="section-label">무기 스토리</div>
        <div class="lore-box"><div class="lore-text">${lore}</div></div>
      </div>` : ''}`;
  } else {
    if (!it.files.some(f => f.key === S.tab)) S.tab = it.files[0]?.key;
    const hits = {};
    tabHits(it).forEach(t => { hits[t.key] = t.count; });
    body = `
      <div class="section-block">
        <div class="section-label">오퍼레이터 소개</div>
        <div class="desc-box">${paragraphs(it.description)}</div>
      </div>
      ${it.files.length ? `
      <div class="section-block">
        <div class="section-label">오퍼레이터 파일</div>
        <div class="file-tabs" id="file-tabs">
          ${it.files.map(f => `
            <button class="file-tab-btn ${S.tab === f.key ? 'active' : ''}" data-key="${f.key}">
              ${f.label}${hits[f.key] ? `<span class="tab-hit">${hits[f.key]}</span>` : ''}
            </button>`).join('')}
        </div>
        <div class="file-content" id="file-content"></div>
      </div>` : ''}`;
  }

  detail.innerHTML = header + body;
  if (it.kind === 'operator' && it.files.length) renderFileContent(it);

  if (resetScroll) {
    const center = $('panel-center');
    center.scrollTo({ top: 0 });
    scrollToFirstMark();
  }
}

function renderFileContent(it) {
  const box = $('file-content');
  if (!box) return;
  const file = it.files.find(f => f.key === S.tab) || it.files[0];
  if (!file) { box.innerHTML = ''; return; }

  if (file.key === 'base_file') {
    let html = '<div class="base-file-grid">';
    for (const line of file.text.split('\n')) {
      const m = line.match(/^\[(.+?)\]\s*(.*)$/);
      if (m) {
        html += `<div class="bf-row"><span class="bf-key">${hl(m[1])}</span><span class="bf-val">${hl(m[2])}</span></div>`;
      } else if (line.trim()) {
        html += `<div class="bf-row bf-plain"><span class="bf-val">${hl(line)}</span></div>`;
      }
    }
    box.innerHTML = html + '</div>';
  } else {
    box.innerHTML = `<div class="lore-text">${paragraphs(file.text)}</div>`;
  }
}

function scrollToFirstMark() {
  if (!S.terms.length) return;
  const center = $('panel-center');
  const first = $('detail').querySelector('.lore-text mark, .file-content mark');
  if (!first) return;
  const top = first.getBoundingClientRect().top
            - center.getBoundingClientRect().top
            + center.scrollTop - center.clientHeight / 3;
  center.scrollTo({ top: Math.max(0, top) });
}

/* ───────── 라우팅 ───────── */
function parseRoute() {
  const h = location.hash.replace('#', '');
  return ROUTES.includes(h) ? h : 'home';
}

function applyRoute() {
  const r = parseRoute();
  const home = r === 'home';
  document.body.classList.toggle('is-home', home);
  if (!home) S.section = r;

  ['all','operator','weapon'].forEach(s =>
    document.body.classList.toggle('sec-' + s, !home && S.section === s));

  document.querySelectorAll('#nav-tabs a').forEach(a =>
    a.classList.toggle('active', a.dataset.route === r));

  // 선택 항목이 현재 섹션과 맞지 않으면 해제
  if (S.selected) {
    const it = ITEM_MAP.get(S.selected);
    if (!it || (S.section !== 'all' && it.kind !== S.section)) showEmpty();
  }

  if (!home) {
    renderList();
    if (isMobile()) closePanel();
  }
}

function go(route) {
  if (location.hash === '#' + route) applyRoute();
  else location.hash = '#' + route;
}

/* ───────── 검색 ───────── */
function applySearch(raw) {
  setTerms(raw);
  // 메인 페이지에서 검색하면 통합 목록으로 이동
  if (S.terms.length && parseRoute() === 'home') {
    go('all');
  } else {
    renderList();
  }
  if (S.selected && ITEM_MAP.has(S.selected) && parseRoute() !== 'home') renderDetail(S.selected, false);
}

/* ───────── 이벤트 ───────── */
function bindEvents() {
  $('panel-toggle').addEventListener('click', togglePanel);
  $('drawer-overlay').addEventListener('click', closePanel);
  $('fab-open-list').addEventListener('click', openPanel);
  window.addEventListener('resize', () => { if (!isMobile()) document.body.classList.remove('panel-open'); });
  window.addEventListener('hashchange', applyRoute);

  // 등급 필터
  document.querySelectorAll('.filter-btn[data-rarity]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-rarity]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.rarity = btn.dataset.rarity;
      renderList();
    });
  });
  // 무기 종류 필터
  document.querySelectorAll('.filter-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.wtype = btn.dataset.type;
      renderList();
    });
  });

  // 섹션 전환 (전체 / 오퍼레이터 / 무기)
  $('seg').addEventListener('click', e => {
    const b = e.target.closest('button[data-seg]');
    if (b) go(b.dataset.seg);
  });

  // 목록 클릭 (이벤트 위임)
  $('item-list').addEventListener('click', e => {
    const el = e.target.closest('.item');
    if (!el) return;
    selectItem(el.dataset.key);
    if (isMobile()) closePanel();
  });

  // 오퍼레이터 파일 탭 (이벤트 위임)
  $('detail').addEventListener('click', e => {
    const btn = e.target.closest('.file-tab-btn');
    if (!btn) return;
    const it = ITEM_MAP.get(S.selected);
    if (!it) return;
    S.tab = btn.dataset.key;
    $('detail').querySelectorAll('.file-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderFileContent(it);
  });

  // 검색
  const input = $('search');
  input.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const v = e.target.value;
    searchTimer = setTimeout(() => applySearch(v), 120);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { input.value = ''; applySearch(''); }
  });
  $('search-scope').addEventListener('change', e => {
    S.scope = e.target.value;
    applySearch(input.value);
  });
}

/* ───────── 초기화 ───────── */
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  const errors = await loadData();
  renderHome(errors);
  if (errors.length && !ITEMS.length) {
    $('item-list').innerHTML = '<div class="no-results">데이터를 불러올 수 없습니다</div>';
  }
  applyRoute();
});

})();
