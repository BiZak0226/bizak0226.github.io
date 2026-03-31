/* ═══════════════════════════════════════════════
   script.js
   Arknights — 오퍼레이터 생일 캘린더
   ═══════════════════════════════════════════════ */

let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();
let characters   = [];

const MONTHS_KO = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월'
];
const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/* ─────────────────────────────────
   데이터 로드
───────────────────────────────── */
async function loadData() {
  try {
    const res = await fetch('data/characters.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    characters = await res.json();
  } catch (e) {
    console.error('characters.json 로드 실패:', e);
    characters = [];
  }
  initControls();
  renderCalendar();
}

/* ─────────────────────────────────
   컨트롤 초기화
───────────────────────────────── */
function initControls() {
  const monthSelect = document.getElementById('monthSelect');
  const workFilter  = document.getElementById('workFilter');

  /* 월 셀렉트 */
  MONTHS_EN.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${i + 1}월 (${m})`;
    if (i === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });

  /* 작품 필터 */
  const works = [...new Set(characters.map(c => c.work))].sort();
  works.forEach(work => {
    const opt = document.createElement('option');
    opt.value = work;
    opt.textContent = work;
    workFilter.appendChild(opt);
  });

  /* 이전/다음 달 버튼 */
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    monthSelect.value = currentMonth;
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    monthSelect.value = currentMonth;
    renderCalendar();
  });

  monthSelect.addEventListener('change', e => {
    currentMonth = parseInt(e.target.value, 10);
    renderCalendar();
  });

  workFilter.addEventListener('change', renderCalendar);
}

/* ─────────────────────────────────
   달력 렌더링
───────────────────────────────── */
function renderCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  /* 월 레이블 업데이트 */
  const label = document.getElementById('currentMonthLabel');
  if (label) label.textContent = `${currentYear} · ${MONTHS_KO[currentMonth]}`;

  const firstDow    = new Date(currentYear, currentMonth, 1).getDay(); // 0=일
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const workFilter  = document.getElementById('workFilter').value;

  const today = new Date();
  const isCurrentMonthView =
    currentMonth === today.getMonth() && currentYear === today.getFullYear();

  /* 빈 셀 (첫날 요일 맞춤) */
  for (let i = 0; i < firstDow; i++) {
    const blank = document.createElement('div');
    blank.classList.add('day', 'empty');
    calendar.appendChild(blank);
  }

  /* 날짜 셀 */
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = (firstDow + day - 1) % 7; // 0=일, 6=토

    const cell = document.createElement('div');
    cell.classList.add('day');
    if (dow === 0) cell.classList.add('sunday');
    if (dow === 6) cell.classList.add('saturday');
    if (isCurrentMonthView && day === today.getDate()) cell.classList.add('today');

    /* 날짜 숫자 */
    const number = document.createElement('div');
    number.classList.add('day-number');
    number.textContent = day;
    cell.appendChild(number);

    /* 해당 날 생일 캐릭터 */
    const dateStr  = `${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayChars = characters.filter(c => {
      if (c.birthday !== dateStr) return false;
      if (workFilter !== 'all' && c.work !== workFilter) return false;
      return true;
    });

    const MAX_VISIBLE = 5;
    dayChars.slice(0, MAX_VISIBLE).forEach(char => {
      cell.appendChild(makeCharChip(char));
    });
    if (dayChars.length > MAX_VISIBLE) {
      const more = document.createElement('div');
      more.className = 'char-more';
      more.textContent = `+${dayChars.length - MAX_VISIBLE}`;
      cell.appendChild(more);
    }

    calendar.appendChild(cell);
  }
}

/* ─────────────────────────────────
   캐릭터 칩 생성
───────────────────────────────── */
function makeCharChip(char) {
  const wrap = document.createElement('div');
  wrap.classList.add('character');
  wrap.title = `${char.name}${char.work ? ' · ' + char.work : ''}`;

  if (char.icon) {
    const img = document.createElement('img');
    img.src = char.icon;
    img.alt = char.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => img.classList.add('error'));
    wrap.appendChild(img);
  }

  const text = document.createElement('span');
  text.textContent = char.name;
  wrap.appendChild(text);

  return wrap;
}

/* ─────────────────────────────────
   시작
───────────────────────────────── */
loadData();
