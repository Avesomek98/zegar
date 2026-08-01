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

function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderHistory(entries) {
    history.innerHTML = "";

    const dayTotals = new Map();
    entries.forEach((entry) => {
        const date = new Date(entry.start_time);
        const key = dateKey(date);
        const existing = dayTotals.get(key);
        dayTotals.set(key, {
            date,
            hours: (existing ? existing.hours : 0) + Number(entry.hours)
        });
    });

    const months = new Map();
    dayTotals.forEach(({ date, hours }) => {
        const key = monthKey(date);
        if (!months.has(key)) {
            months.set(key, { date, days: [], total: 0 });
        }
        const month = months.get(key);
        month.days.push({ date, hours });
        month.total += hours;
    });

    const sortedMonthKeys = [...months.keys()].sort().reverse();

    if (sortedMonthKeys.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Brak zapisanych godzin.";
        history.appendChild(empty);
        return;
    }

    sortedMonthKeys.forEach((key) => {
        const month = months.get(key);

        const section = document.createElement("section");
        section.className = "month-group";

        const heading = document.createElement("h3");
        heading.textContent = `${MONTH_NAMES[month.date.getMonth()]} ${month.date.getFullYear()}`;
        section.appendChild(heading);

        const list = document.createElement("ul");
        month.days
            .sort((a, b) => b.date - a.date)
            .forEach(({ date, hours }) => {
                const item = document.createElement("li");
                item.textContent = `${date.toLocaleDateString()} - ${hours.toFixed(2)} godz.`;
                list.appendChild(item);
            });
        section.appendChild(list);

        const total = document.createElement("p");
        total.className = "month-total";
        total.textContent = `Suma: ${month.total.toFixed(2)} godz.`;
        section.appendChild(total);

        history.appendChild(section);
    });
}

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
        hours: Number(diff.toFixed(2))
    });
    renderHistory(await loadHistory());

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

(async function init() {
    document.getElementById("year").textContent = new Date().getFullYear();

    await refreshScheduleCache();
    renderHistory(await loadHistory());

    const savedStart = localStorage.getItem(ACTIVE_START_KEY);
    if (savedStart) {
        startTime = new Date(savedStart);
        setActive(startTime);
    } else {
        setIdle();
    }
})();
