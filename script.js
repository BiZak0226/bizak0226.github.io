let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let characters = [];

async function loadData() {
  const res = await fetch("data/characters.json");
  characters = await res.json();

  initControls();
  renderCalendar();
}

function initControls() {
  const monthSelect = document.getElementById("monthSelect");
  const workFilter = document.getElementById("workFilter");

  // 월 목록
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  months.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m;
    if (i === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });

  // 작품 목록
  const works = [...new Set(characters.map(c => c.work))];
  works.forEach(work => {
    const opt = document.createElement("option");
    opt.value = work;
    opt.textContent = work;
    workFilter.appendChild(opt);
  });

  // 이벤트 리스너
  document.getElementById("prevMonth").onclick = () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    monthSelect.value = currentMonth;
    renderCalendar();
  };

  document.getElementById("nextMonth").onclick = () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    monthSelect.value = currentMonth;
    renderCalendar();
  };

  monthSelect.onchange = (e) => {
    currentMonth = parseInt(e.target.value);
    renderCalendar();
  };

  workFilter.onchange = renderCalendar;
}

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();

  const workFilter = document.getElementById("workFilter").value;

  // 빈칸
  for (let i=0; i<firstDay; i++) {
    const blank = document.createElement("div");
    blank.classList.add("day");
    calendar.appendChild(blank);
  }

  for (let day=1; day<=daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.classList.add("day");

    const number = document.createElement("div");
    number.classList.add("day-number");
    number.textContent = day;
    cell.appendChild(number);

    // 오늘 강조
    const today = new Date();
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      cell.style.background = "#ffeeba";
    }

    // 캐릭터 표시
    const dateStr = `${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayChars = characters.filter(c => c.birthday === dateStr);

    dayChars.forEach(char => {
      if (workFilter !== "all" && char.work !== workFilter) return;
      const charDiv = document.createElement("div");
      charDiv.classList.add("character");

      const img = document.createElement("img");
      img.src = char.icon;
      img.alt = char.name;

      const text = document.createElement("span");
      text.textContent = char.name;

      charDiv.appendChild(img);
      charDiv.appendChild(text);
      cell.appendChild(charDiv);
    });

    calendar.appendChild(cell);
  }
}

loadData();