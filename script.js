// =========================================================
// LOGIC: roster panitia + mekanisme roll challenge
// =========================================================

// Decode data panitia yang disamarkan (base64) di js/data.js.
// Ini BUKAN enkripsi sungguhan, cuma menyamarkan supaya orang yang
// buka "View Source" tidak langsung lihat teks challenge polos.
function decodeBase64Utf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const PANITIA = JSON.parse(decodeBase64Utf8(ENCODED_PANITIA));

const searchInput = document.getElementById("search-input");
const dropdownEl = document.getElementById("dropdown-list");
const panelEl = document.getElementById("panel");
const emptyStateEl = document.getElementById("empty-state");

const STORAGE_KEY = "spinChallengeState";
const HISTORY_KEY = "spinChallengeHistory";

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

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    // localStorage tidak tersedia - abaikan saja
  }
}

function addHistoryEntry(panitiaName, challengeText) {
  const history = loadHistory();
  history.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    panitiaName,
    challenge: challengeText,
    maba: "",
    timestamp: new Date().toISOString(),
  });
  saveHistory(history);
  renderHistory();
}

function updateHistoryMaba(id, value) {
  const history = loadHistory();
  const entry = history.find((h) => h.id === id);
  if (entry) {
    entry.maba = value;
    saveHistory(history);
  }
}

function deleteHistoryEntry(id) {
  const history = loadHistory().filter((h) => h.id !== id);
  saveHistory(history);
  renderHistory();
}

function clearAllHistory() {
  saveHistory([]);
  renderHistory();
}

function formatHistoryDate(iso) {
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    return iso;
  }
}

function renderHistory() {
  const history = loadHistory().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const listEl = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  const clearBtn = document.getElementById("clear-history-btn");

  if (history.length === 0) {
    emptyEl.hidden = false;
    clearBtn.hidden = true;
    listEl.innerHTML = "";
    return;
  }

  emptyEl.hidden = true;
  clearBtn.hidden = false;
  listEl.innerHTML = history
    .map(
      (h) => `
      <li class="history-item">
        <div class="history-item__meta">
          <span class="history-item__name">${escapeHtml(h.panitiaName)}</span>
          <div class="history-item__meta-right">
            <span class="history-item__date">${escapeHtml(formatHistoryDate(h.timestamp))}</span>
            <button type="button" class="history-item__delete" data-id="${h.id}" aria-label="Hapus histori ini" title="Hapus histori ini">&times;</button>
          </div>
        </div>
        <p class="history-item__challenge">${escapeHtml(h.challenge)}</p>
        <label class="history-item__maba-label" for="maba-${h.id}">Nama Maba</label>
        <input
          type="text"
          class="history-item__maba-input"
          id="maba-${h.id}"
          data-id="${h.id}"
          placeholder="Isi nama maba yang kena challenge ini"
          value="${escapeHtml(h.maba || "")}"
        />
      </li>`
    )
    .join("");

  listEl.querySelectorAll(".history-item__maba-input").forEach((input) => {
    input.addEventListener("input", () => {
      clearTimeout(input._saveTimer);
      input._saveTimer = setTimeout(() => {
        updateHistoryMaba(input.dataset.id, input.value);
      }, 300);
    });
  });

  listEl.querySelectorAll(".history-item__delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Hapus histori roll ini? Tindakan ini tidak bisa dibatalkan.")) {
        deleteHistoryEntry(btn.dataset.id);
      }
    });
  });
}

function init() {
  searchInput.addEventListener("focus", () => openDropdown(searchInput.value));
  searchInput.addEventListener("input", () => openDropdown(searchInput.value));
  searchInput.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".picker")) closeDropdown();
  });

  document.getElementById("clear-history-btn").addEventListener("click", () => {
    if (confirm("Hapus SEMUA histori roll di device ini? Tindakan ini tidak bisa dibatalkan.")) {
      clearAllHistory();
    }
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

  renderHistory();
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
    addHistoryEntry(activePanitia.name, finalText);
  }

  step();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
