let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();

let selectedGames = new Set();
let gameCache = {};
let currentView = 'month';

const MONTHS_KO = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월'
];

/* ─────────────────────────────
   게임 목록 로드
───────────────────────────── */
async function loadGameList() {
  const res = await fetch('data/games.json');
  const games = await res.json();

  const container = document.getElementById('gameList');

  games.forEach(game => {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = game.id;

    checkbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        selectedGames.add(game.id);
        await loadGameData(game.id);
      } else {
        selectedGames.delete(game.id);
      }
      renderCalendar();
    });

    label.appendChild(checkbox);
    label.append(` ${game.name}`);

    container.appendChild(label);
  });
}

/* ─────────────────────────────
   게임 데이터 로드 (캐싱)
───────────────────────────── */
async function loadGameData(gameId) {
  if (gameCache[gameId]) return;

  const res = await fetch(`data/${gameId}.json`);
  const data = await res.json();

  gameCache[gameId] = data;
}

/* ─────────────────────────────
   전체 캐릭터 합치기
───────────────────────────── */
function getAllCharacters() {
  let all = [];

  selectedGames.forEach(gameId => {
    if (gameCache[gameId]) {
      all = all.concat(
        gameCache[gameId].map(c => ({
          ...c,
          game: gameId
        }))
      );
    }
  });

  return all;
}

/* ─────────────────────────────
   컨트롤 초기화
───────────────────────────── */
function initControls() {
  const monthSelect = document.getElementById('monthSelect');

  for (let i = 0; i < 12; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${i + 1}월`;
    if (i === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }

  document.getElementById('prevMonth').onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    monthSelect.value = currentMonth;
    renderCalendar();
  };

  document.getElementById('nextMonth').onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    monthSelect.value = currentMonth;
    renderCalendar();
  };

  monthSelect.onchange = (e) => {
    currentMonth = parseInt(e.target.value);
    renderCalendar();
  };

  document.getElementById('monthViewBtn').onclick = () => {
    currentView = 'month';
    renderCalendar();
  };

  document.getElementById('weekViewBtn').onclick = () => {
    currentView = 'week';
    renderCalendar();
  };

  /* 검색 */
  document.getElementById('gameSearch').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();

    document.querySelectorAll('#gameList label').forEach(label => {
      const text = label.textContent.toLowerCase();
      label.style.display = text.includes(keyword) ? '' : 'none';
    });
  });
}

/* ─────────────────────────────
   월간 렌더링
───────────────────────────── */
function renderMonthView() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const label = document.getElementById('currentMonthLabel');
  label.textContent = `${currentYear} · ${MONTHS_KO[currentMonth]}`;

  const firstDow = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const characters = getAllCharacters();

  for (let i = 0; i < firstDow; i++) {
    const blank = document.createElement('div');
    blank.classList.add('day', 'empty');
    calendar.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.classList.add('day');

    const number = document.createElement('div');
    number.classList.add('day-number');
    number.textContent = day;
    cell.appendChild(number);

    const dateStr = `${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    const dayChars = characters.filter(c => c.birthday === dateStr);

    dayChars.forEach(char => {
      cell.appendChild(makeCharChip(char));
    });

    calendar.appendChild(cell);
  }
}

/* ─────────────────────────────
   주간 렌더링
───────────────────────────── */
function renderWeekView() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  const characters = getAllCharacters();

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const m = date.getMonth() + 1;
    const d = date.getDate();

    const dateStr = `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const cell = document.createElement('div');
    cell.classList.add('day');

    cell.innerHTML = `<div class="day-number">${m}/${d}</div>`;

    const dayChars = characters.filter(c => c.birthday === dateStr);

    dayChars.forEach(char => {
      cell.appendChild(makeCharChip(char));
    });

    calendar.appendChild(cell);
  }
}

/* ───────────────────────────── */
function renderCalendar() {
  if (currentView === 'month') {
    renderMonthView();
  } else {
    renderWeekView();
  }
}

/* ───────────────────────────── */
function makeCharChip(char) {
  const wrap = document.createElement('div');
  wrap.classList.add('character');
  wrap.title = `${char.name} (${char.game})`;

  const text = document.createElement('span');
  text.textContent = char.name;
  wrap.appendChild(text);

  return wrap;
}

/* ───────────────────────────── */
initControls();
loadGameList();