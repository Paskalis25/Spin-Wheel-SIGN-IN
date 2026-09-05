// =========================================================
// LOGIC: roster panitia + mekanisme roll challenge
// =========================================================

const searchInput = document.getElementById("search-input");
const dropdownEl = document.getElementById("dropdown-list");
const panelEl = document.getElementById("panel");
const emptyStateEl = document.getElementById("empty-state");

const STORAGE_KEY = "spinChallengeState";

let activePanitia = null;
let isRolling = false;
let highlightedIndex = -1;
let visibleMatches = [];

function saveState(name, resultIndex) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, resultIndex }));
  } catch (e) {
    // localStorage tidak tersedia (mis. private browsing) - abaikan saja
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function init() {
  searchInput.addEventListener("focus", () => openDropdown(searchInput.value));
  searchInput.addEventListener("input", () => openDropdown(searchInput.value));
  searchInput.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".picker")) closeDropdown();
  });

  // cek apakah device ini sudah pernah pilih nama sebelumnya
  const saved = loadState();
  if (saved && saved.name) {
    const match = PANITIA.find((p) => p.name === saved.name);
    if (match) {
      activePanitia = match;
      searchInput.value = match.name;
      emptyStateEl.hidden = true;
      renderPanel(saved.resultIndex);
    }
  }
}

function getMatches(query) {
  const q = query.trim().toLowerCase();
  if (!q) return PANITIA;
  return PANITIA.filter((p) => p.name.toLowerCase().startsWith(q));
}

function openDropdown(query) {
  if (isRolling) return;
  visibleMatches = getMatches(query);
  highlightedIndex = -1;
  renderDropdown();
  dropdownEl.hidden = visibleMatches.length === 0;
  searchInput.setAttribute("aria-expanded", String(!dropdownEl.hidden));
  document.getElementById("picker-chevron").classList.toggle("is-open", !dropdownEl.hidden);
}

function closeDropdown() {
  dropdownEl.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
  document.getElementById("picker-chevron").classList.remove("is-open");
}

function renderDropdown() {
  if (visibleMatches.length === 0) {
    dropdownEl.innerHTML = `<li class="dropdown__empty">Nama tidak ditemukan</li>`;
    return;
  }
  dropdownEl.innerHTML = visibleMatches
    .map(
      (p, i) => `
      <li role="option" data-index="${i}" class="dropdown__item${
        i === highlightedIndex ? " is-highlighted" : ""
      }">${escapeHtml(p.name)}</li>`
    )
    .join("");

  dropdownEl.querySelectorAll(".dropdown__item").forEach((li) => {
    li.addEventListener("mousedown", (e) => {
      e.preventDefault(); // avoid input blur before click registers
      const idx = Number(li.dataset.index);
      selectPanitia(visibleMatches[idx]);
    });
  });
}

function handleKeydown(e) {
  if (dropdownEl.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    openDropdown(searchInput.value);
    return;
  }
  if (dropdownEl.hidden || visibleMatches.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightedIndex = Math.min(highlightedIndex + 1, visibleMatches.length - 1);
    renderDropdown();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightedIndex = Math.max(highlightedIndex - 1, 0);
    renderDropdown();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (highlightedIndex >= 0) selectPanitia(visibleMatches[highlightedIndex]);
  } else if (e.key === "Escape") {
    closeDropdown();
  }
}

function selectPanitia(panitia) {
  if (isRolling) return;

  activePanitia = panitia;
  searchInput.value = panitia.name;
  closeDropdown();

  emptyStateEl.hidden = true;
  saveState(panitia.name, null);
  renderPanel(null);
}

function renderPanel(existingResultIndex) {
  panelEl.hidden = false;
  panelEl.innerHTML = `
    <div class="ticket">
      <div class="ticket__header">
        <span class="ticket__eyebrow">Giliran roll untuk</span>
        <h2 class="ticket__name">${escapeHtml(activePanitia.name)}</h2>
      </div>

      <div class="ticket__result" id="result" aria-live="polite">
        <span class="ticket__result-placeholder">Tekan tombol roll untuk mulai</span>
      </div>

      <button type="button" class="roll-btn" id="roll-btn">Roll Challenge</button>

      <ul class="ticket__list" id="challenge-list">
        ${activePanitia.challenges
          .map(
            (c, i) => `<li data-index="${i}"><span class="ticket__list-dot"></span>${escapeHtml(c)}</li>`
          )
          .join("")}
      </ul>
    </div>
  `;

  document.getElementById("roll-btn").addEventListener("click", handleRoll);

  // kalau sebelumnya sudah pernah roll di device ini, langsung tampilkan lagi hasilnya
  if (existingResultIndex !== null && existingResultIndex !== undefined) {
    showSavedResult(existingResultIndex);
  }
}

function showSavedResult(index) {
  const resultEl = document.getElementById("result");
  const btn = document.getElementById("roll-btn");
  const finalText = activePanitia.challenges[index];
  if (finalText === undefined) return;

  resultEl.innerHTML = `<span class="ticket__result-text">${escapeHtml(finalText)}</span>`;
  resultEl.classList.add("ticket__result--done");

  const picked = document.querySelector(`#challenge-list li[data-index="${index}"]`);
  if (picked) picked.classList.add("is-picked");

  btn.textContent = "Roll Ulang";
}

function handleRoll() {
  if (isRolling || !activePanitia) return;
  isRolling = true;
  searchInput.disabled = true;

  const btn = document.getElementById("roll-btn");
  const resultEl = document.getElementById("result");
  const listItems = document.querySelectorAll("#challenge-list li");

  listItems.forEach((li) => li.classList.remove("is-picked"));
  btn.disabled = true;
  btn.textContent = "Menggulung...";
  resultEl.classList.remove("ticket__result--done");

  const challenges = activePanitia.challenges;
  const finalIndex = Math.floor(Math.random() * challenges.length);

  let tick = 0;
  const totalTicks = 18; // makin besar = makin lama muternya
  const baseDelay = 70;

  function step() {
    const showIndex = tick % challenges.length;
    resultEl.innerHTML = `<span class="ticket__result-text">${escapeHtml(
      challenges[showIndex]
    )}</span>`;

    tick++;

    if (tick < totalTicks) {
      // delay makin lama di akhir, biar berasa "berhenti pelan-pelan"
      const progress = tick / totalTicks;
      const delay = baseDelay + Math.pow(progress, 3) * 260;
      setTimeout(step, delay);
    } else {
      finishRoll(finalIndex);
    }
  }

  function finishRoll(index) {
    const finalText = challenges[index];
    resultEl.innerHTML = `<span class="ticket__result-text">${escapeHtml(finalText)}</span>`;
    resultEl.classList.add("ticket__result--done");

    const picked = document.querySelector(`#challenge-list li[data-index="${index}"]`);
    if (picked) picked.classList.add("is-picked");

    btn.disabled = false;
    btn.textContent = "Roll Ulang";
    isRolling = false;
    searchInput.disabled = false;

    saveState(activePanitia.name, index);
  }

  step();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
