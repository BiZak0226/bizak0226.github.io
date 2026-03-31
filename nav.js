/**
 * nav.js — 공통 네비게이션 모듈
 *
 * 사용법:
 *   <script src="../nav.js" data-depth="1"></script>
 *
 *   data-depth : 이 HTML이 루트(index.html 위치)에서 몇 단계 아래인지
 *     - index.html       → data-depth="0"
 *     - arknights/*.html → data-depth="1"
 *     - a/b/*.html       → data-depth="2"
 *
 * nav.json 항목 형식:
 *   { "category": "endfield", "label": "무기 아카이브",
 *     "path": "endfield/endfield_weapons.html", "icon": "◈" }
 */

(function () {
  /* ── 현재 스크립트 태그에서 depth 읽기 ── */
  const scriptEl = document.currentScript;
  const depth    = parseInt(scriptEl?.dataset?.depth ?? '0', 10);

  /* ── 루트까지의 상대경로 prefix ── */
  const prefix = depth === 0 ? '' : '../'.repeat(depth);

  /* ── nav.json 경로 ── */
  const jsonUrl = prefix + 'nav.json';

  /* ── 스타일 주입 (중복 방지) ── */
  function injectStyles() {
    if (document.getElementById('nav-js-style')) return;
    const style = document.createElement('style');
    style.id = 'nav-js-style';
    style.textContent = `
      /* ── nav 컨테이너 ── */
      #site-nav {
        position: relative;
        z-index: 50;
        background: #0e0f18;
        border-bottom: 1px solid #2a2f45;
        display: flex;
        align-items: center;
        padding: 0 16px;
        height: 38px;
        gap: 2px;
        font-family: 'Share Tech Mono', 'Noto Sans KR', monospace, sans-serif;
        font-size: 11px;
        flex-shrink: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      #site-nav::-webkit-scrollbar { display: none; }

      /* 상단 accent 선 */
      #site-nav::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, #4a8be8, transparent);
        opacity: 0.35;
      }

      /* ── 개별 링크 ── */
      .nav-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 0 11px;
        height: 100%;
        text-decoration: none;
        color: #5a6180;
        letter-spacing: 0.8px;
        white-space: nowrap;
        border-bottom: 2px solid transparent;
        transition: color 0.13s, border-color 0.13s;
        position: relative;
      }
      .nav-item:hover {
        color: #b0b8d4;
        border-bottom-color: #353d5c;
      }
      /* 현재 페이지 */
      .nav-item.active {
        color: #eaedf7;
        border-bottom-color: #4a8be8;
      }
      .nav-item-icon {
        font-size: 9px;
        opacity: 0.7;
      }

      /* 카테고리 구분 배지 */
      .nav-category {
        font-size: 9px;
        color: #2e364f;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: 0 6px 0 10px;
        border-left: 1px solid #1e2336;
        margin-left: 4px;
        user-select: none;
      }
      .nav-category:first-child { border-left: none; margin-left: 0; padding-left: 0; }

      /* body 최상단 여백 보정 — header가 있는 경우 nav를 header 위에 삽입하면
         body의 flex 방향에 따라 자동 처리됨. 없을 경우 아래 규칙으로 보정. */
      body { display: flex; flex-direction: column; }
    `;
    document.head.appendChild(style);
  }

  /* ── 현재 페이지 경로 ── */
  function currentRelPath() {
    const full = location.pathname;          // "/endfield/endfield_weapons.html"
    const parts = full.split('/').filter(Boolean);
    // GitHub Pages에서 repo 이름이 첫 segment인 경우 제거
    // (일반 경우에는 그냥 파일명+폴더 조합으로 비교)
    return parts.join('/');
  }

  /* ── nav 렌더링 ── */
  function render(items) {
    const nav = document.createElement('nav');
    nav.id = 'site-nav';
    nav.setAttribute('aria-label', 'Site Navigation');

    const curPath = currentRelPath();

    let prevCategory = null;
    items.forEach(item => {
      /* 카테고리 레이블 (카테고리가 바뀔 때만) */
      if (item.category !== prevCategory && item.category !== 'index') {
        const badge = document.createElement('span');
        badge.className = 'nav-category';
        badge.textContent = item.category;
        nav.appendChild(badge);
      }
      prevCategory = item.category;

      /* 링크 */
      const a = document.createElement('a');
      a.className  = 'nav-item';
      a.href       = prefix + item.path;
      a.title      = item.label;

      /* 아이콘 */
      if (item.icon) {
        const ico = document.createElement('span');
        ico.className   = 'nav-item-icon';
        ico.textContent = item.icon;
        a.appendChild(ico);
      }

      /* 레이블 */
      const lbl = document.createElement('span');
      lbl.textContent = item.label;
      a.appendChild(lbl);

      /* 현재 페이지 강조 — 경로 끝부분 비교 */
      const itemEnd = item.path.replace(/^\//, '');
      if (curPath.endsWith(itemEnd) || (item.category === 'index' && (curPath === '' || curPath.endsWith('index.html')))) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }

      nav.appendChild(a);
    });

    /* body 최상단(또는 header 바로 앞)에 삽입 */
    const header = document.querySelector('body > header');
    if (header) {
      header.parentNode.insertBefore(nav, header);
    } else {
      document.body.prepend(nav);
    }
  }

  /* ── 실행 ── */
  function init() {
    injectStyles();
    fetch(jsonUrl)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(err => console.warn('[nav.js] nav.json 로드 실패:', err));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
