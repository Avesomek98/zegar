import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ACTIVE_START_KEY = "activeStartTime";

let startTime = null;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const history = document.getElementById("history");

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

function renderHistory(entries) {
    history.innerHTML = "";
    entries.forEach((entry) => {
        const item = document.createElement("li");
        const date = new Date(entry.start_time).toLocaleDateString();
        item.textContent = `${date} - ${entry.hours} godz.`;
        history.appendChild(item);
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
    const diff = (endTime - startTime) / 1000 / 60 / 60;

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

(async function init() {
    renderHistory(await loadHistory());

    const savedStart = localStorage.getItem(ACTIVE_START_KEY);
    if (savedStart) {
        startTime = new Date(savedStart);
        setActive(startTime);
    } else {
        setIdle();
    }
})();
