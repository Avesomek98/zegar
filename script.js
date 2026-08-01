import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ACTIVE_START_KEY = "activeStartTime";

const WEEKDAYS = [
    { key: "mon", label: "Poniedziałek" },
    { key: "tue", label: "Wtorek" },
    { key: "wed", label: "Środa" },
    { key: "thu", label: "Czwartek" },
    { key: "fri", label: "Piątek" },
    { key: "sat", label: "Sobota" },
    { key: "sun", label: "Niedziela" }
];
const WEEKDAY_KEY_BY_JS_DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_NAMES = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

let startTime = null;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const history = document.getElementById("history");
const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const scheduleForm = document.getElementById("scheduleForm");
const scheduleRows = document.getElementById("scheduleRows");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const quickStats = document.getElementById("quickStats");
const monthPicker = document.getElementById("monthPicker");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const changelogBtn = document.getElementById("changelogBtn");
const changelogDialog = document.getElementById("changelogDialog");
const closeChangelogBtn = document.getElementById("closeChangelogBtn");

const editDayDialog = document.getElementById("editDayDialog");
const editDayTitle = document.getElementById("editDayTitle");
const editDayForm = document.getElementById("editDayForm");
const editDayDateInput = document.getElementById("editDayDateInput");
const editDayStart = document.getElementById("editDayStart");
const editDayEnd = document.getElementById("editDayEnd");
const editDayBreak = document.getElementById("editDayBreak");
const deleteDayBtn = document.getElementById("deleteDayBtn");
const closeEditDayBtn = document.getElementById("closeEditDayBtn");
const addDayBtn = document.getElementById("addDayBtn");

let editingDate = null;
let dayTotalsCache = new Map();
let monthsIndexCache = new Map();
let selectedMonthKey = null;

const NIGHT_START_HOUR = 20;
const NIGHT_END_HOUR = 6;
const NIGHT_BONUS_RATE = 0.2;
const DEFAULT_BREAK_MINUTES = 45;

const THEME_KEY = "theme";

function effectiveTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateThemeToggleButton() {
    const theme = effectiveTheme();
    themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    themeToggleBtn.setAttribute("aria-label", theme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw");
}

themeToggleBtn.onclick = () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
    updateThemeToggleButton();
};

updateThemeToggleButton();

changelogBtn.onclick = () => changelogDialog.showModal();
closeChangelogBtn.onclick = () => changelogDialog.close();

let scheduleCache = {};

async function refreshScheduleCache() {
    const { data, error } = await supabase
        .from("app_settings")
        .select("schedule")
        .eq("id", 1)
        .single();

    if (error) {
        console.error(error);
        return;
    }
    scheduleCache = data?.schedule || {};
}

async function saveSchedule(schedule) {
    const { error } = await supabase
        .from("app_settings")
        .upsert({ id: 1, schedule, updated_at: new Date().toISOString() });

    if (error) {
        console.error(error);
        alert("Nie udało się zapisać ustawień w bazie.");
        return;
    }
    scheduleCache = schedule;
}

function clampToSchedule(start, end, schedule) {
    const rule = schedule[WEEKDAY_KEY_BY_JS_DAY[start.getDay()]];
    if (!rule || !rule.enabled) {
        return { start, end };
    }

    const [sh, sm] = rule.start.split(":").map(Number);
    const schedStart = new Date(start);
    schedStart.setHours(sh, sm, 0, 0);

    const [eh, em] = rule.end.split(":").map(Number);
    const schedEnd = new Date(start);
    schedEnd.setHours(eh, em, 0, 0);

    return {
        start: start < schedStart ? schedStart : start,
        end: end > schedEnd ? schedEnd : end
    };
}

async function loadHistory() {
    const { data, error } = await supabase
        .from("work_sessions")
        .select("*")
        .order("start_time", { ascending: false });

    if (error) {
        console.error(error);
        status.textContent = "Błąd wczytywania historii z bazy.";
        return [];
    }
    return data;
}

async function saveEntry(entry) {
    const { error } = await supabase.from("work_sessions").insert(entry);
    if (error) {
        console.error(error);
        alert("Nie udało się zapisać wpisu w bazie.");
    }
}

function dayBounds(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
    return { start, end };
}

async function deleteSessionsForDay(date) {
    const { start, end } = dayBounds(date);
    const { error } = await supabase
        .from("work_sessions")
        .delete()
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString());

    if (error) {
        console.error(error);
        alert("Nie udało się usunąć wpisów dla tego dnia.");
        return false;
    }
    return true;
}

async function replaceDaySession(date, start, end, breakMinutes) {
    const deleted = await deleteSessionsForDay(date);
    if (!deleted) return false;

    const hours = (end - start) / 1000 / 60 / 60;
    if (hours > 0) {
        await saveEntry({
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            hours: Number(hours.toFixed(2)),
            break_minutes: breakMinutes
        });
    }
    return true;
}

function netHours(session) {
    return Math.max(0, session.hours - session.breakMinutes / 60);
}

async function resetAllData() {
    const { error } = await supabase
        .from("work_sessions")
        .delete()
        .not("id", "is", null);

    if (error) {
        console.error(error);
        alert("Nie udało się zresetować bazy.");
        return false;
    }
    return true;
}

function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTime(d) {
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function timeInputValue(d) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Ile godzin z przedziału [start, end] wypada w porze nocnej (20:00-6:00).
function nightOverlapHours(start, end) {
    let totalMs = 0;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    cursor.setDate(cursor.getDate() - 1);

    while (cursor.getTime() <= end.getTime()) {
        const nightStart = new Date(cursor);
        nightStart.setHours(NIGHT_START_HOUR, 0, 0, 0);
        const nightEnd = new Date(cursor);
        nightEnd.setDate(nightEnd.getDate() + 1);
        nightEnd.setHours(NIGHT_END_HOUR, 0, 0, 0);

        const overlapStart = start > nightStart ? start : nightStart;
        const overlapEnd = end < nightEnd ? end : nightEnd;
        if (overlapEnd > overlapStart) {
            totalMs += overlapEnd - overlapStart;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return totalMs / 1000 / 60 / 60;
}

function buildDayTotals(entries) {
    const dayTotals = new Map();
    entries.forEach((entry) => {
        const date = new Date(entry.start_time);
        const key = dateKey(date);
        const net = netHours({
            hours: Number(entry.hours),
            breakMinutes: Number(entry.break_minutes ?? DEFAULT_BREAK_MINUTES)
        });
        const existing = dayTotals.get(key);
        dayTotals.set(key, {
            date,
            hours: (existing ? existing.hours : 0) + net
        });
    });
    return dayTotals;
}

function buildMonthsIndex(entries) {
    const months = new Map();
    entries.forEach((entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const dKey = dateKey(start);
        const mKey = monthKey(start);

        if (!months.has(mKey)) {
            months.set(mKey, { date: start, days: new Map() });
        }
        const month = months.get(mKey);

        if (!month.days.has(dKey)) {
            month.days.set(dKey, { date: start, sessions: [] });
        }
        month.days.get(dKey).sessions.push({
            start,
            end,
            hours: Number(entry.hours),
            breakMinutes: Number(entry.break_minutes ?? DEFAULT_BREAK_MINUTES)
        });
    });
    return months;
}

function renderQuickStats() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayHours = dayTotalsCache.get(dateKey(now))?.hours || 0;
    const yesterdayHours = dayTotalsCache.get(dateKey(yesterday))?.hours || 0;

    quickStats.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Dziś</span>
            <span class="stat-value">${todayHours.toFixed(2)} godz.</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Wczoraj</span>
            <span class="stat-value">${yesterdayHours.toFixed(2)} godz.</span>
        </div>
    `;
}

function populateMonthPicker(months) {
    const sortedKeys = [...months.keys()].sort().reverse();
    monthPicker.innerHTML = "";

    if (sortedKeys.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Brak danych";
        monthPicker.appendChild(option);
        monthPicker.disabled = true;
        return null;
    }

    monthPicker.disabled = false;
    sortedKeys.forEach((key) => {
        const month = months.get(key);
        const option = document.createElement("option");
        option.value = key;
        option.textContent = `${MONTH_NAMES[month.date.getMonth()]} ${month.date.getFullYear()}`;
        monthPicker.appendChild(option);
    });

    const keep = sortedKeys.includes(selectedMonthKey) ? selectedMonthKey : sortedKeys[0];
    monthPicker.value = keep;
    return keep;
}

function renderMonth(key) {
    selectedMonthKey = key;
    history.innerHTML = "";

    const month = monthsIndexCache.get(key);
    if (!month) {
        const empty = document.createElement("p");
        empty.textContent = "Brak zapisanych godzin w tym miesiącu.";
        history.appendChild(empty);
        return;
    }

    let monthHours = 0;
    let monthNight = 0;

    [...month.days.keys()].sort().reverse().forEach((dKey) => {
        const day = month.days.get(dKey);
        let dayHours = 0;

        const sessionsHtml = day.sessions
            .sort((a, b) => a.start - b.start)
            .map((session) => {
                const net = netHours(session);
                const night = nightOverlapHours(session.start, session.end);
                dayHours += net;
                monthNight += night;

                const nightNote = night > 0.005
                    ? `<span class="night-badge">🌙 ${night.toFixed(2)} godz. nocnych &middot; +${(night * NIGHT_BONUS_RATE).toFixed(2)} godz. dodatku (20%)</span>`
                    : "";

                return `
                    <div class="session-row">
                        <span>${formatTime(session.start)}–${formatTime(session.end)}</span>
                        <span>${net.toFixed(2)} godz.</span>
                    </div>
                    <div class="session-meta">brutto ${session.hours.toFixed(2)} godz. &middot; −${session.breakMinutes} min przerwy</div>
                    ${nightNote}
                `;
            })
            .join("");

        monthHours += dayHours;

        const card = document.createElement("div");
        card.className = "day-card";
        card.innerHTML = `
            <div class="day-card-header">
                <strong>${day.date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</strong>
                <span>${dayHours.toFixed(2)} godz.</span>
                <button type="button" class="edit-day-btn" data-day-key="${dKey}" aria-label="Edytuj dzień">✏️</button>
            </div>
            ${sessionsHtml}
        `;
        history.appendChild(card);
    });

    const bonus = monthNight * NIGHT_BONUS_RATE;
    const total = document.createElement("p");
    total.className = "month-total";
    total.textContent = monthNight > 0.005
        ? `Suma: ${monthHours.toFixed(2)} godz. · 🌙 ${monthNight.toFixed(2)} godz. nocnych · +${bonus.toFixed(2)} godz. dodatku · razem ${(monthHours + bonus).toFixed(2)} godz. efektywnych`
        : `Suma: ${monthHours.toFixed(2)} godz.`;
    history.appendChild(total);
}

function refreshHistoryView(entries) {
    dayTotalsCache = buildDayTotals(entries);
    renderQuickStats();

    monthsIndexCache = buildMonthsIndex(entries);
    const key = populateMonthPicker(monthsIndexCache);

    if (key) {
        renderMonth(key);
    } else {
        history.innerHTML = "";
        const empty = document.createElement("p");
        empty.textContent = "Brak zapisanych godzin.";
        history.appendChild(empty);
    }
}

monthPicker.onchange = () => renderMonth(monthPicker.value);

function setActive(time) {
    status.textContent = "Praca rozpoczęta o " + time.toLocaleTimeString();
    startBtn.disabled = true;
    stopBtn.disabled = false;
}

function setIdle() {
    status.textContent = "Nie pracujesz.";
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

startBtn.onclick = () => {
    startTime = new Date();
    localStorage.setItem(ACTIVE_START_KEY, startTime.toISOString());
    setActive(startTime);
};

stopBtn.onclick = async () => {
    if (!startTime) {
        alert("Najpierw rozpocznij pracę.");
        return;
    }

    const endTime = new Date();
    const { start: effStart, end: effEnd } = clampToSchedule(startTime, endTime, scheduleCache);
    const diffMs = Math.max(0, effEnd - effStart);
    const diff = diffMs / 1000 / 60 / 60;

    stopBtn.disabled = true;
    await saveEntry({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        hours: Number(diff.toFixed(2)),
        break_minutes: DEFAULT_BREAK_MINUTES
    });
    refreshHistoryView(await loadHistory());

    localStorage.removeItem(ACTIVE_START_KEY);
    startTime = null;
    setIdle();
};

function buildScheduleRows() {
    scheduleRows.innerHTML = "";

    WEEKDAYS.forEach(({ key, label }) => {
        const rule = scheduleCache[key] || { enabled: false, start: "06:00", end: "14:00" };

        const row = document.createElement("div");
        row.className = "schedule-row";
        row.dataset.day = key;
        row.innerHTML = `
            <label class="day-label">
                <input type="checkbox" class="day-enabled" ${rule.enabled ? "checked" : ""}>
                ${label}
            </label>
            <input type="time" class="day-start" value="${rule.start}">
            <input type="time" class="day-end" value="${rule.end}">
        `;
        scheduleRows.appendChild(row);
    });
}

settingsBtn.onclick = async () => {
    settingsBtn.disabled = true;
    await refreshScheduleCache();
    settingsBtn.disabled = false;
    buildScheduleRows();
    settingsDialog.showModal();
};

closeSettingsBtn.onclick = () => settingsDialog.close();

scheduleForm.onsubmit = async (event) => {
    event.preventDefault();

    const schedule = {};
    scheduleRows.querySelectorAll(".schedule-row").forEach((row) => {
        schedule[row.dataset.day] = {
            enabled: row.querySelector(".day-enabled").checked,
            start: row.querySelector(".day-start").value,
            end: row.querySelector(".day-end").value
        };
    });

    const submitBtn = scheduleForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    await saveSchedule(schedule);
    submitBtn.disabled = false;
    settingsDialog.close();
};

// editingDate = data dnia, ktory faktycznie istnieje w bazie (do skasowania/przeniesienia).
// null oznacza tryb "dodaj nowy dzien" - nic nie trzeba usuwac przed zapisem.
function openEditDialog({ original, date, start, end, breakMinutes }) {
    editingDate = original;
    editDayTitle.textContent = original ? "Edytuj dzień" : "Dodaj dzień";
    deleteDayBtn.style.display = original ? "" : "none";
    editDayDateInput.value = dateKey(date);
    editDayStart.value = start ? timeInputValue(start) : "";
    editDayEnd.value = end ? timeInputValue(end) : "";
    editDayBreak.value = breakMinutes;
    editDayDialog.showModal();
}

history.addEventListener("click", (event) => {
    const btn = event.target.closest(".edit-day-btn");
    if (!btn) return;

    const dayKey = btn.dataset.dayKey;
    const day = monthsIndexCache.get(selectedMonthKey)?.days.get(dayKey);
    if (!day || day.sessions.length === 0) return;

    const primarySession = day.sessions.reduce((min, s) => (s.start < min.start ? s : min), day.sessions[0]);
    const earliestStart = day.sessions.reduce((min, s) => (s.start < min ? s.start : min), day.sessions[0].start);
    const latestEnd = day.sessions.reduce((max, s) => (s.end > max ? s.end : max), day.sessions[0].end);

    openEditDialog({
        original: earliestStart,
        date: earliestStart,
        start: earliestStart,
        end: latestEnd,
        breakMinutes: primarySession.breakMinutes
    });
});

addDayBtn.onclick = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    openEditDialog({
        original: null,
        date: yesterday,
        start: null,
        end: null,
        breakMinutes: DEFAULT_BREAK_MINUTES
    });
};

closeEditDayBtn.onclick = () => editDayDialog.close();

editDayForm.onsubmit = async (event) => {
    event.preventDefault();

    const [y, mo, dd] = editDayDateInput.value.split("-").map(Number);
    const [sh, sm] = editDayStart.value.split(":").map(Number);
    const [eh, em] = editDayEnd.value.split(":").map(Number);
    const breakMinutes = parseInt(editDayBreak.value, 10);
    if ([y, mo, dd, sh, sm, eh, em].some((n) => Number.isNaN(n)) || Number.isNaN(breakMinutes) || breakMinutes < 0) return;

    const targetDate = new Date(y, mo - 1, dd);
    const start = new Date(y, mo - 1, dd, sh, sm, 0, 0);
    const end = new Date(y, mo - 1, dd, eh, em, 0, 0);
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }

    const submitBtn = editDayForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    if (editingDate && dateKey(editingDate) !== dateKey(targetDate)) {
        await deleteSessionsForDay(editingDate);
    }
    await replaceDaySession(targetDate, start, end, breakMinutes);

    selectedMonthKey = monthKey(targetDate);
    refreshHistoryView(await loadHistory());
    submitBtn.disabled = false;
    editDayDialog.close();
};

deleteDayBtn.onclick = async () => {
    if (!editingDate) return;
    if (!confirm(`Na pewno usunąć wszystkie godziny z dnia ${editingDate.toLocaleDateString()}?`)) return;

    deleteDayBtn.disabled = true;
    await deleteSessionsForDay(editingDate);
    refreshHistoryView(await loadHistory());
    deleteDayBtn.disabled = false;
    editDayDialog.close();
};

resetAllBtn.onclick = async () => {
    if (!confirm("Na pewno usunąć WSZYSTKIE zapisane godziny? Tej operacji nie można cofnąć.")) return;
    if (!confirm("Na 100%? To wykasuje całą historię ze wszystkich urządzeń.")) return;

    resetAllBtn.disabled = true;
    const ok = await resetAllData();
    resetAllBtn.disabled = false;

    if (ok) {
        settingsDialog.close();
        refreshHistoryView(await loadHistory());
    }
};

(async function init() {
    document.getElementById("year").textContent = new Date().getFullYear();

    await refreshScheduleCache();
    refreshHistoryView(await loadHistory());

    const savedStart = localStorage.getItem(ACTIVE_START_KEY);
    if (savedStart) {
        startTime = new Date(savedStart);
        setActive(startTime);
    } else {
        setIdle();
    }
})();
