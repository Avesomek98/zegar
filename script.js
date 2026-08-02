import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserId = null;
let appStarted = false;

const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggleBtn = document.getElementById("authToggleBtn");
const authMessage = document.getElementById("authMessage");
const authNormalSection = document.getElementById("authNormalSection");
const authRecoverySection = document.getElementById("authRecoverySection");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const recoveryForm = document.getElementById("recoveryForm");
const recoveryPassword = document.getElementById("recoveryPassword");
const accountEmail = document.getElementById("accountEmail");
const logoutBtn = document.getElementById("logoutBtn");
const changeEmailForm = document.getElementById("changeEmailForm");
const newEmailInput = document.getElementById("newEmailInput");
const changeEmailMessage = document.getElementById("changeEmailMessage");
const changePasswordForm = document.getElementById("changePasswordForm");
const newPasswordInput = document.getElementById("newPasswordInput");
const changePasswordMessage = document.getElementById("changePasswordMessage");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

let authMode = "login";

function setStatusMessage(el, text, isSuccess) {
    el.textContent = text;
    el.style.display = text ? "block" : "none";
    el.classList.toggle("auth-message--success", Boolean(isSuccess));
}

function showAuthMessage(text, isSuccess) {
    setStatusMessage(authMessage, text, isSuccess);
}

function updateAuthModeUI() {
    if (authMode === "login") {
        authTitle.textContent = "Zaloguj się";
        authSubmitBtn.textContent = "Zaloguj się";
        authToggleBtn.textContent = "Nie masz konta? Zarejestruj się";
    } else {
        authTitle.textContent = "Zarejestruj się";
        authSubmitBtn.textContent = "Zarejestruj się";
        authToggleBtn.textContent = "Masz już konto? Zaloguj się";
    }
    showAuthMessage("");
}

authToggleBtn.onclick = () => {
    authMode = authMode === "login" ? "register" : "login";
    updateAuthModeUI();
};

authForm.onsubmit = async (event) => {
    event.preventDefault();
    showAuthMessage("");
    authSubmitBtn.disabled = true;

    const email = authEmail.value.trim();
    const password = authPassword.value;

    const { data, error } = authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    authSubmitBtn.disabled = false;

    if (error) {
        showAuthMessage(error.message, false);
        return;
    }

    if (authMode === "register" && !data.session) {
        showAuthMessage("Konto utworzone. Sprawdź e-mail, żeby potwierdzić rejestrację, a potem się zaloguj.", true);
        authMode = "login";
        updateAuthModeUI();
    }
};

forgotPasswordBtn.onclick = async () => {
    const email = authEmail.value.trim();
    if (!email) {
        showAuthMessage("Najpierw wpisz swój e-mail w polu powyżej.", false);
        authEmail.focus();
        return;
    }

    forgotPasswordBtn.disabled = true;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
    });
    forgotPasswordBtn.disabled = false;

    if (error) {
        showAuthMessage(error.message, false);
        return;
    }
    showAuthMessage("Jeśli podany e-mail jest zarejestrowany, wysłaliśmy na niego link do resetu hasła.", true);
};

recoveryForm.onsubmit = async (event) => {
    event.preventDefault();
    const submitBtn = recoveryForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { error } = await supabase.auth.updateUser({ password: recoveryPassword.value });

    submitBtn.disabled = false;

    if (error) {
        alert(error.message);
        return;
    }

    recoveryForm.reset();
    authRecoverySection.style.display = "none";
    authNormalSection.style.display = "block";
    document.documentElement.dataset.authOk = "1";
    if (!appStarted) {
        appStarted = true;
        initApp();
    }
};

logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
};

changeEmailForm.onsubmit = async (event) => {
    event.preventDefault();
    setStatusMessage(changeEmailMessage, "");
    const submitBtn = changeEmailForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { error } = await supabase.auth.updateUser({ email: newEmailInput.value.trim() });

    submitBtn.disabled = false;

    if (error) {
        setStatusMessage(changeEmailMessage, error.message, false);
        return;
    }
    setStatusMessage(changeEmailMessage, "Sprawdź skrzynkę (starą i nową), żeby potwierdzić zmianę e-maila.", true);
    changeEmailForm.reset();
};

changePasswordForm.onsubmit = async (event) => {
    event.preventDefault();
    setStatusMessage(changePasswordMessage, "");
    const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { error } = await supabase.auth.updateUser({ password: newPasswordInput.value });

    submitBtn.disabled = false;

    if (error) {
        setStatusMessage(changePasswordMessage, error.message, false);
        return;
    }
    setStatusMessage(changePasswordMessage, "Hasło zmienione.", true);
    changePasswordForm.reset();
};

deleteAccountBtn.onclick = async () => {
    if (!confirm("Na pewno chcesz usunąć swoje konto? Skasuje to WSZYSTKIE Twoje dane bezpowrotnie.")) return;
    if (!confirm("Na 100%? Tej operacji nie da się cofnąć.")) return;

    deleteAccountBtn.disabled = true;
    const { error } = await supabase.rpc("delete_own_account");
    deleteAccountBtn.disabled = false;

    if (error) {
        console.error(error);
        alert("Nie udało się usunąć konta: " + error.message);
        return;
    }

    await supabase.auth.signOut();
};

supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
        currentUserId = session?.user?.id || null;
        authNormalSection.style.display = "none";
        authRecoverySection.style.display = "block";
        return;
    }

    if (session?.user) {
        currentUserId = session.user.id;
        accountEmail.textContent = session.user.email || "—";
        document.documentElement.dataset.authOk = "1";
        if (!appStarted) {
            appStarted = true;
            initApp();
        }
    } else {
        currentUserId = null;
        appStarted = false;
        delete document.documentElement.dataset.authOk;
        authForm.reset();
        document.querySelectorAll("dialog").forEach((dialog) => {
            if (dialog.open) dialog.close();
        });
    }
});

// Kliknięcie w tło (poza treścią) zamyka dowolne okienko, tak jak w większości apek.
document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
});

const SHIFT_PRESETS = [
    { label: "6:00–16:45", start: "06:00", end: "16:45" },
    { label: "6:00–15:45", start: "06:00", end: "15:45" },
    { label: "19:30–6:00", start: "19:30", end: "06:00" },
    { label: "Sobota 6:00–14:45", start: "06:00", end: "14:45" }
];
const MONTH_NAMES = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

const addTodayShiftBtn = document.getElementById("addTodayShiftBtn");
const polandStatusRow = document.getElementById("polandStatusRow");
const polandStatusCard = document.getElementById("polandStatusCard");
const polandStatusFlag = document.getElementById("polandStatusFlag");
const polandStatusText = document.getElementById("polandStatusText");
const polandCountdownText = document.getElementById("polandCountdownText");
const polandVacationCard = document.getElementById("polandVacationCard");
const polandVacationCountdownText = document.getElementById("polandVacationCountdownText");
const polandScheduleDialog = document.getElementById("polandScheduleDialog");
const polandScheduleList = document.getElementById("polandScheduleList");
const closePolandScheduleBtn = document.getElementById("closePolandScheduleBtn");
const history = document.getElementById("history");
const monthTotalEl = document.getElementById("monthTotal");
const accountBtn = document.getElementById("accountBtn");
const accountDialog = document.getElementById("accountDialog");
const accountDialogEmail = document.getElementById("accountDialogEmail");
const accountLogoutBtn = document.getElementById("accountLogoutBtn");
const accountManageBtn = document.getElementById("accountManageBtn");
const closeAccountBtn = document.getElementById("closeAccountBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const settingsTabs = [...document.querySelectorAll(".dialog-tab")];
const settingsPanels = [...document.querySelectorAll(".dialog-tab-panel")];
const polandCycleForm = document.getElementById("polandCycleForm");
const polandCycleAnchorInput = document.getElementById("polandCycleAnchorInput");
const polandCycleWeeksInput = document.getElementById("polandCycleWeeksInput");
const polandCycleHomeDaysInput = document.getElementById("polandCycleHomeDaysInput");
const polandCycleMessage = document.getElementById("polandCycleMessage");

// Dotkniecie/klikniecie gdziekolwiek w polu daty ma od razu otwierac kalendarz,
// nie tylko klikniecie w ikonke po prawej stronie.
polandCycleAnchorInput.addEventListener("click", () => {
    if (typeof polandCycleAnchorInput.showPicker === "function") {
        polandCycleAnchorInput.showPicker();
    }
});

const quickStats = document.getElementById("quickStats");
const monthPicker = document.getElementById("monthPicker");
const exportMonthBtn = document.getElementById("exportMonthBtn");
const monthCalendar = document.getElementById("monthCalendar");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const authThemeToggleBtn = document.getElementById("authThemeToggleBtn");
const refreshBtn = document.getElementById("refreshBtn");
const changelogBtn = document.getElementById("changelogBtn");
const changelogDialog = document.getElementById("changelogDialog");
const closeChangelogBtn = document.getElementById("closeChangelogBtn");

const editDayDialog = document.getElementById("editDayDialog");
const editDayTitle = document.getElementById("editDayTitle");
const editDayForm = document.getElementById("editDayForm");
const editDayDateInput = document.getElementById("editDayDateInput");
const editDayPreset = document.getElementById("editDayPreset");
const editDayStart = document.getElementById("editDayStart");
const editDayEnd = document.getElementById("editDayEnd");
const editDayBreak = document.getElementById("editDayBreak");
const editDayMarkTripOff = document.getElementById("editDayMarkTripOff");
const deleteDayBtn = document.getElementById("deleteDayBtn");
const closeEditDayBtn = document.getElementById("closeEditDayBtn");
const addDayBtn = document.getElementById("addDayBtn");
const activeShiftSelect = document.getElementById("activeShiftSelect");
const customShiftFields = document.getElementById("customShiftFields");
const activeShiftCustomStart = document.getElementById("activeShiftCustomStart");
const activeShiftCustomEnd = document.getElementById("activeShiftCustomEnd");
const applyCustomShiftBtn = document.getElementById("applyCustomShiftBtn");

const dayDetailsDialog = document.getElementById("dayDetailsDialog");
const dayDetailsTitle = document.getElementById("dayDetailsTitle");
const dayDetailsBody = document.getElementById("dayDetailsBody");
const dayDetailsEditBtn = document.getElementById("dayDetailsEditBtn");
const closeDayDetailsBtn = document.getElementById("closeDayDetailsBtn");
let dayDetailsCurrentKey = null;

const customStatsDialog = document.getElementById("customStatsDialog");
const customStatsForm = document.getElementById("customStatsForm");
const customStatsDate = document.getElementById("customStatsDate");
const customStatsMonth = document.getElementById("customStatsMonth");
const closeCustomStatsBtn = document.getElementById("closeCustomStatsBtn");

const polandTripBtn = document.getElementById("polandTripBtn");
const polandTripDialog = document.getElementById("polandTripDialog");
const polandTripForm = document.getElementById("polandTripForm");
const polandTripDate = document.getElementById("polandTripDate");
const closePolandTripBtn = document.getElementById("closePolandTripBtn");

const vacationBtn = document.getElementById("vacationBtn");
const vacationDialog = document.getElementById("vacationDialog");
const vacationForm = document.getElementById("vacationForm");
const vacationStartDate = document.getElementById("vacationStartDate");
const vacationEndDate = document.getElementById("vacationEndDate");
const closeVacationBtn = document.getElementById("closeVacationBtn");

const weekHoursBtn = document.getElementById("weekHoursBtn");
const weekHoursDialog = document.getElementById("weekHoursDialog");
const weekHoursForm = document.getElementById("weekHoursForm");
const weekRangeCalendar = document.getElementById("weekRangeCalendar");
const weekRangePrevBtn = document.getElementById("weekRangePrevBtn");
const weekRangeNextBtn = document.getElementById("weekRangeNextBtn");
const weekRangeMonthLabel = document.getElementById("weekRangeMonthLabel");
const weekRangeSummary = document.getElementById("weekRangeSummary");
const weekHoursPreset = document.getElementById("weekHoursPreset");
const weekHoursStart = document.getElementById("weekHoursStart");
const weekHoursEnd = document.getElementById("weekHoursEnd");
const weekHoursBreak = document.getElementById("weekHoursBreak");
const weekHoursSkipWeekends = document.getElementById("weekHoursSkipWeekends");
const closeWeekHoursBtn = document.getElementById("closeWeekHoursBtn");

let weekRangeStart = null;
let weekRangeEnd = null;
let weekRangeViewDate = new Date();

let editingDate = null;
let dayTotalsCache = new Map();
let monthsIndexCache = new Map();
let selectedMonthKey = null;
let activeShiftCache = null; // { start, end, label } | null
let customStat = null; // { mode: "day" | "month", key: "YYYY-MM-DD" | "YYYY-MM" }
let vacationDatesCache = new Set(); // Set<"YYYY-MM-DD"> dni oznaczonych jako Urlop
let polandCycleCache = null; // { anchor: Date, cycleDays: number, homeDays: number } | null

const NIGHT_START_HOUR = 20;
const NIGHT_END_HOUR = 6;
const DEFAULT_BREAK_MINUTES = 45;

const THEME_KEY = "theme";

function effectiveTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateThemeToggleButton() {
    const theme = effectiveTheme();
    const label = theme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw";
    const icon = theme === "dark" ? "☀️" : "🌙";

    themeToggleBtn.textContent = icon;
    themeToggleBtn.setAttribute("aria-label", label);
    authThemeToggleBtn.textContent = icon;
    authThemeToggleBtn.setAttribute("aria-label", label);
}

function toggleTheme() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
    updateThemeToggleButton();
}

themeToggleBtn.onclick = toggleTheme;
authThemeToggleBtn.onclick = toggleTheme;

updateThemeToggleButton();

// Na desktopie (patrz style.css @media min-width:1024px) okienko "jestes w PL/DE"
// przenosimy fizycznie do naglowka, zeby nie duplikowac id/logiki. Na telefonie
// wraca na swoje pierwotne miejsce w panelu bocznym.
const topBarPolandSlot = document.getElementById("topBarPolandSlot");
const appSidebar = document.querySelector(".app-sidebar");
const desktopLayoutQuery = window.matchMedia("(min-width: 1024px)");

function placePolandStatusCard(isDesktop) {
    if (isDesktop) {
        if (polandStatusRow.parentElement !== topBarPolandSlot) {
            topBarPolandSlot.appendChild(polandStatusRow);
        }
    } else if (polandStatusRow.parentElement !== appSidebar) {
        appSidebar.insertBefore(polandStatusRow, appSidebar.firstChild);
    }
}

placePolandStatusCard(desktopLayoutQuery.matches);
desktopLayoutQuery.addEventListener("change", (event) => placePolandStatusCard(event.matches));

refreshBtn.onclick = () => {
    window.location.reload();
};

changelogBtn.onclick = () => changelogDialog.showModal();

const currentYear = String(new Date().getFullYear());
document.getElementById("year").textContent = currentYear;
document.getElementById("authYear").textContent = currentYear;
closeChangelogBtn.onclick = () => changelogDialog.close();

async function refreshActiveShiftCache() {
    const { data, error } = await supabase
        .from("app_settings")
        .select("active_shift")
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }
    activeShiftCache = data?.active_shift || null;
}

async function saveActiveShift(shift) {
    const { error } = await supabase
        .from("app_settings")
        .upsert(
            { user_id: currentUserId, active_shift: shift, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );

    if (error) {
        console.error(error);
        alert("Nie udało się zapisać zmiany w bazie.");
        return;
    }
    activeShiftCache = shift;
}

function populateActiveShiftSelect() {
    const presetOptions = SHIFT_PRESETS
        .map((p, i) => `<option value="${i}">${p.label}</option>`)
        .join("");
    activeShiftSelect.innerHTML = `${presetOptions}<option value="custom">Własne godziny na ten tydzień…</option>`;

    if (!activeShiftCache) {
        activeShiftSelect.value = "0";
        customShiftFields.style.display = "none";
        return;
    }

    const idx = SHIFT_PRESETS.findIndex((p) => p.start === activeShiftCache.start && p.end === activeShiftCache.end);

    if (idx >= 0) {
        activeShiftSelect.value = String(idx);
        customShiftFields.style.display = "none";
    } else {
        activeShiftSelect.value = "custom";
        activeShiftCustomStart.value = activeShiftCache.start;
        activeShiftCustomEnd.value = activeShiftCache.end;
        customShiftFields.style.display = "flex";
    }
}

activeShiftSelect.onchange = async () => {
    if (activeShiftSelect.value === "custom") {
        customShiftFields.style.display = "flex";
        return;
    }

    customShiftFields.style.display = "none";
    const preset = SHIFT_PRESETS[activeShiftSelect.value];
    activeShiftSelect.disabled = true;
    await saveActiveShift(preset ? { start: preset.start, end: preset.end, label: preset.label } : null);
    activeShiftSelect.disabled = false;
};

applyCustomShiftBtn.onclick = async () => {
    if (!activeShiftCustomStart.value || !activeShiftCustomEnd.value) return;

    const shift = {
        start: activeShiftCustomStart.value,
        end: activeShiftCustomEnd.value,
        label: `${activeShiftCustomStart.value}–${activeShiftCustomEnd.value}`
    };

    applyCustomShiftBtn.disabled = true;
    await saveActiveShift(shift);
    applyCustomShiftBtn.disabled = false;
};

// Kazdy uzytkownik moze miec inny rytm zjazdow do Polski (np. co tydzien zamiast co dwa
// tygodnie), wiec cykl jest wyliczany na podstawie wlasnych ustawien z app_settings, a nie
// na sztywno wpisanych stalych.
async function refreshPolandCycleCache() {
    const { data, error } = await supabase
        .from("app_settings")
        .select("poland_trip_anchor, poland_trip_cycle_weeks, poland_trip_home_days")
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    if (data?.poland_trip_anchor && data?.poland_trip_cycle_weeks && data?.poland_trip_home_days) {
        const [y, m, d] = data.poland_trip_anchor.split("-").map(Number);
        polandCycleCache = {
            anchor: new Date(y, m - 1, d),
            cycleDays: data.poland_trip_cycle_weeks * 7,
            homeDays: data.poland_trip_home_days
        };
    } else {
        polandCycleCache = null;
    }
}

function populatePolandCycleForm() {
    setStatusMessage(polandCycleMessage, "");
    if (!polandCycleCache) {
        polandCycleForm.reset();
        return;
    }
    polandCycleAnchorInput.value = dateKey(polandCycleCache.anchor);
    polandCycleWeeksInput.value = String(polandCycleCache.cycleDays / 7);
    polandCycleHomeDaysInput.value = String(polandCycleCache.homeDays);
}

polandCycleForm.onsubmit = async (event) => {
    event.preventDefault();
    const weeks = Number(polandCycleWeeksInput.value);
    const homeDays = Number(polandCycleHomeDaysInput.value);

    if (weeks < 1 || homeDays < 1 || homeDays > weeks * 7) {
        setStatusMessage(polandCycleMessage, "Dni w Polsce nie mogą przekraczać długości całego cyklu.", false);
        return;
    }

    const submitBtn = polandCycleForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { error } = await supabase
        .from("app_settings")
        .upsert(
            {
                user_id: currentUserId,
                poland_trip_anchor: polandCycleAnchorInput.value,
                poland_trip_cycle_weeks: weeks,
                poland_trip_home_days: homeDays,
                updated_at: new Date().toISOString()
            },
            { onConflict: "user_id" }
        );

    submitBtn.disabled = false;

    if (error) {
        console.error(error);
        setStatusMessage(polandCycleMessage, "Nie udało się zapisać ustawień.", false);
        return;
    }

    const [y, m, d] = polandCycleAnchorInput.value.split("-").map(Number);
    polandCycleCache = { anchor: new Date(y, m - 1, d), cycleDays: weeks * 7, homeDays };
    setStatusMessage(polandCycleMessage, "Zapisano.", true);
    renderPolandStatus();
};

async function loadHistory() {
    const { data, error } = await supabase
        .from("work_sessions")
        .select("*")
        .order("start_time", { ascending: false });

    if (error) {
        console.error(error);
        alert("Błąd wczytywania historii z bazy.");
        return [];
    }
    return data;
}

async function saveEntry(entry) {
    const { error } = await supabase.from("work_sessions").insert({ ...entry, user_id: currentUserId });
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

// Ile godzin z przedziału [start, end] wypada w niedzielę (kalendarzowo, 00:00-24:00).
function sundayOverlapHours(start, end) {
    let totalMs = 0;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    while (cursor.getTime() < end.getTime()) {
        if (cursor.getDay() === 0) {
            const dayStart = new Date(cursor);
            const dayEnd = new Date(cursor);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const overlapStart = start > dayStart ? start : dayStart;
            const overlapEnd = end < dayEnd ? end : dayEnd;
            if (overlapEnd > overlapStart) {
                totalMs += overlapEnd - overlapStart;
            }
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return totalMs / 1000 / 60 / 60;
}

function buildVacationDates(entries) {
    const dates = new Set();
    entries.forEach((entry) => {
        if (entry.note === "Urlop") {
            dates.add(dateKey(new Date(entry.start_time)));
        }
    });
    return dates;
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
            breakMinutes: Number(entry.break_minutes ?? DEFAULT_BREAK_MINUTES),
            note: entry.note || null
        });
    });
    return months;
}

function monthNetTotal(key) {
    const month = monthsIndexCache.get(key);
    if (!month) return 0;

    let total = 0;
    month.days.forEach((day) => {
        day.sessions.forEach((session) => {
            total += netHours(session);
        });
    });
    return total;
}

function renderQuickStats() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayHours = dayTotalsCache.get(dateKey(now))?.hours || 0;
    const yesterdayHours = dayTotalsCache.get(dateKey(yesterday))?.hours || 0;

    let customLabel = "Inny dzień";
    let customValue = "Wybierz ▸";

    if (customStat) {
        if (customStat.mode === "day") {
            const [y, m, d] = customStat.key.split("-").map(Number);
            const date = new Date(y, m - 1, d);
            const hours = dayTotalsCache.get(customStat.key)?.hours || 0;
            customLabel = date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
            customValue = `${hours.toFixed(2)} godz.`;
        } else {
            const [y, m] = customStat.key.split("-").map(Number);
            const hours = monthNetTotal(customStat.key);
            customLabel = `${MONTH_NAMES[m - 1]} ${y}`;
            customValue = `${hours.toFixed(2)} godz.`;
        }
    }

    quickStats.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Dziś</span>
            <span class="stat-value">${todayHours.toFixed(2)} godz.</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Wczoraj</span>
            <span class="stat-value">${yesterdayHours.toFixed(2)} godz.</span>
        </div>
        <button type="button" class="stat-card stat-card--action" id="customStatBtn">
            <span class="stat-label">${customLabel}</span>
            <span class="stat-value">${customValue}</span>
        </button>
    `;
}

quickStats.addEventListener("click", (event) => {
    if (event.target.closest("#customStatBtn")) {
        if (!customStatsDate.value) customStatsDate.value = dateKey(new Date());
        if (!customStatsMonth.value) customStatsMonth.value = monthKey(new Date());
        customStatsDialog.showModal();
    }
});

customStatsForm.querySelectorAll('input[name="statMode"]').forEach((radio) => {
    radio.onchange = () => {
        const mode = customStatsForm.querySelector('input[name="statMode"]:checked').value;
        customStatsDate.style.display = mode === "day" ? "" : "none";
        customStatsMonth.style.display = mode === "month" ? "" : "none";
    };
});

closeCustomStatsBtn.onclick = () => customStatsDialog.close();

customStatsForm.onsubmit = (event) => {
    event.preventDefault();
    const mode = customStatsForm.querySelector('input[name="statMode"]:checked').value;

    if (mode === "day") {
        if (!customStatsDate.value) return;
        customStat = { mode: "day", key: customStatsDate.value };
    } else {
        if (!customStatsMonth.value) return;
        customStat = { mode: "month", key: customStatsMonth.value };
    }

    renderQuickStats();
    customStatsDialog.close();
};

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

const CAL_WEEKDAY_LETTERS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function matchShiftPresetIndex(session) {
    const startHM = timeInputValue(session.start);
    const endHM = timeInputValue(session.end);
    return SHIFT_PRESETS.findIndex((p) => p.start === startHM && p.end === endHM);
}

function renderMonthCalendar(key) {
    monthCalendar.innerHTML = "";
    if (!key) return;

    const [y, m] = key.split("-").map(Number);
    const firstOfMonth = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const month = monthsIndexCache.get(key);
    const todayKey = dateKey(new Date());

    CAL_WEEKDAY_LETTERS.forEach((label) => {
        const head = document.createElement("div");
        head.className = "cal-weekday";
        head.textContent = label;
        monthCalendar.appendChild(head);
    });

    const firstDow = (firstOfMonth.getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
        const filler = document.createElement("div");
        filler.className = "cal-cell cal-cell--empty";
        monthCalendar.appendChild(filler);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m - 1, d);
        const dKey = dateKey(date);
        const day = month?.days.get(dKey);

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cal-cell";
        cell.dataset.dayKey = dKey;
        cell.textContent = String(d);

        if (day) {
            const isVacation = day.sessions.some((s) => s.note === "Urlop");
            const isDayOff = day.sessions.some((s) => s.hours === 0 && s.start.getTime() === s.end.getTime());
            const hasHours = day.sessions.some((s) => !(s.hours === 0 && s.start.getTime() === s.end.getTime()));

            if (isVacation) {
                cell.classList.add("cal-cell--vacation");
            } else if (isDayOff) {
                cell.classList.add("cal-cell--off");
            } else if (hasHours) {
                const workedSession = day.sessions.find((s) => !(s.hours === 0 && s.start.getTime() === s.end.getTime()));
                const hasSundayHours = workedSession && sundayOverlapHours(workedSession.start, workedSession.end) > 0.005;

                if (hasSundayHours) {
                    cell.classList.add("cal-cell--sunday-work");
                } else {
                    const presetIdx = workedSession ? matchShiftPresetIndex(workedSession) : -1;
                    cell.classList.add(presetIdx >= 0 ? `cal-cell--preset-${presetIdx}` : "cal-cell--worked");
                }
            }
        } else {
            const dow = date.getDay();
            if (dow === 0 || dow === 6) cell.classList.add("cal-cell--weekend");
        }

        if (dKey === todayKey) cell.classList.add("cal-cell--today");
        if (dKey > todayKey) cell.classList.add("cal-cell--future");

        monthCalendar.appendChild(cell);
    }
}

monthCalendar.addEventListener("click", (event) => {
    const cell = event.target.closest(".cal-cell:not(.cal-cell--empty)");
    if (!cell) return;

    const dKey = cell.dataset.dayKey;
    const day = monthsIndexCache.get(selectedMonthKey)?.days.get(dKey);

    if (day) {
        openDayDetails(dKey);
        return;
    }

    const [y, m, d] = dKey.split("-").map(Number);
    const clickedDate = new Date(y, m - 1, d);
    const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (clickedDate > todayMidnight) {
        return;
    }

    openEditDialog({
        original: null,
        date: clickedDate,
        start: null,
        end: null,
        breakMinutes: DEFAULT_BREAK_MINUTES
    });
});

function buildDaySessionsHtml(day) {
    let dayHours = 0;
    let dayNight = 0;
    let daySunday = 0;

    const sessionsHtml = day.sessions
        .sort((a, b) => a.start - b.start)
        .map((session) => {
            const net = netHours(session);
            const night = nightOverlapHours(session.start, session.end);
            const sunday = sundayOverlapHours(session.start, session.end);
            dayHours += net;
            dayNight += night;
            daySunday += sunday;

            const nightNote = night > 0.005
                ? `<span class="night-badge">🌙 ${night.toFixed(2)} godz. nocnych</span>`
                : "";
            const sundayNote = sunday > 0.005
                ? `<span class="sunday-badge">🔴 ${sunday.toFixed(2)} godz. niedzielnych</span>`
                : "";

            const isDayOff = session.hours === 0 && session.start.getTime() === session.end.getTime();
            const timeRow = isDayOff
                ? `<div class="session-row"><span>Dzień wolny</span><span>0.00 godz.</span></div>`
                : `<div class="session-row">
                    <span>${formatTime(session.start)}–${formatTime(session.end)}</span>
                    <span>${net.toFixed(2)} godz.</span>
                </div>`;
            const metaRow = isDayOff
                ? ""
                : `<div class="session-meta">brutto ${session.hours.toFixed(2)} godz. &middot; −${session.breakMinutes} min przerwy</div>`;
            const noteRow = session.note
                ? `<div class="session-note">📝 ${session.note}</div>`
                : "";

            return `
                ${timeRow}
                ${metaRow}
                ${noteRow}
                ${nightNote}
                ${sundayNote}
            `;
        })
        .join("");

    return { sessionsHtml, dayHours, dayNight, daySunday };
}

function openEditDialogForDay(dayKey) {
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
}

function openDayDetails(dKey) {
    const day = monthsIndexCache.get(selectedMonthKey)?.days.get(dKey);
    if (!day) return;

    dayDetailsCurrentKey = dKey;
    const { sessionsHtml, dayHours } = buildDaySessionsHtml(day);

    dayDetailsTitle.textContent = day.date.toLocaleDateString("pl-PL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    dayDetailsBody.innerHTML = `
        <p class="day-summary">Suma: ${dayHours.toFixed(2)} godz.</p>
        ${sessionsHtml}
    `;
    dayDetailsDialog.showModal();
}

dayDetailsEditBtn.onclick = () => {
    dayDetailsDialog.close();
    openEditDialogForDay(dayDetailsCurrentKey);
};

closeDayDetailsBtn.onclick = () => dayDetailsDialog.close();

function renderMonth(key) {
    selectedMonthKey = key;
    history.innerHTML = "";
    renderMonthCalendar(key);

    const month = monthsIndexCache.get(key);
    if (!month) {
        const empty = document.createElement("p");
        empty.textContent = "Brak zapisanych godzin w tym miesiącu.";
        history.appendChild(empty);
        monthTotalEl.textContent = "";
        return;
    }

    let monthHours = 0;
    let monthNight = 0;
    let monthSunday = 0;
    let monthVacationDays = 0;
    let monthVacationChargeableDays = 0;

    [...month.days.keys()].sort().reverse().forEach((dKey) => {
        const day = month.days.get(dKey);
        const { sessionsHtml, dayHours, dayNight, daySunday } = buildDaySessionsHtml(day);

        monthHours += dayHours;
        monthNight += dayNight;
        monthSunday += daySunday;

        const isVacation = day.sessions.some((s) => s.note === "Urlop");
        const dow = day.date.getDay();
        const isWeekendDay = dow === 0 || dow === 6;

        if (isVacation) {
            monthVacationDays += 1;
            if (!isWeekendDay) monthVacationChargeableDays += 1;
        }

        const isWeekend = !isVacation && isWeekendDay;

        const card = document.createElement("div");
        card.className = "day-card" + (isVacation ? " day-card--vacation" : isWeekend ? " day-card--weekend" : "");
        card.dataset.dayKey = dKey;
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

    const totalParts = [`Suma: ${monthHours.toFixed(2)} godz.`];
    if (monthNight > 0.005) totalParts.push(`🌙 ${monthNight.toFixed(2)} godz. nocnych`);
    if (monthSunday > 0.005) totalParts.push(`🔴 ${monthSunday.toFixed(2)} godz. niedzielnych`);
    if (monthVacationDays > 0) {
        totalParts.push(`🌴 ${monthVacationDays} ${monthVacationDays === 1 ? "dzień" : "dni"} urlopu (${monthVacationChargeableDays} z puli, bez sob/nd)`);
    }

    monthTotalEl.textContent = totalParts.join(" · ");
}

function csvEscape(value) {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function buildMonthCsv(key) {
    const month = monthsIndexCache.get(key);
    if (!month) return null;

    const rows = [[
        "Data", "Dzień tygodnia", "Od", "Do", "Brutto (godz.)",
        "Przerwa (min)", "Netto (godz.)", "Nocne (godz.)", "Niedzielne (godz.)", "Notatka"
    ]];

    let totalNet = 0;
    let totalNight = 0;
    let totalSunday = 0;
    let rowCount = 0;

    [...month.days.keys()].sort().forEach((dKey) => {
        const day = month.days.get(dKey);
        day.sessions
            .sort((a, b) => a.start - b.start)
            .forEach((session) => {
                const net = netHours(session);
                const night = nightOverlapHours(session.start, session.end);
                const sunday = sundayOverlapHours(session.start, session.end);
                totalNet += net;
                totalNight += night;
                totalSunday += sunday;
                rowCount += 1;

                const isDayOff = session.hours === 0 && session.start.getTime() === session.end.getTime();

                rows.push([
                    day.date.toLocaleDateString("pl-PL"),
                    day.date.toLocaleDateString("pl-PL", { weekday: "long" }),
                    isDayOff ? "-" : formatTime(session.start),
                    isDayOff ? "-" : formatTime(session.end),
                    session.hours.toFixed(2),
                    String(session.breakMinutes),
                    net.toFixed(2),
                    night > 0.005 ? night.toFixed(2) : "",
                    sunday > 0.005 ? sunday.toFixed(2) : "",
                    session.note || ""
                ]);
            });
    });

    if (rowCount === 0) return null;

    rows.push([]);
    rows.push(["Suma", "", "", "", "", "", totalNet.toFixed(2), totalNight.toFixed(2), totalSunday.toFixed(2), ""]);

    return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

exportMonthBtn.onclick = async () => {
    if (!selectedMonthKey) return;

    const csv = buildMonthCsv(selectedMonthKey);
    if (!csv) {
        alert("Brak danych do eksportu w tym miesiącu.");
        return;
    }

    const monthLabel = monthPicker.options[monthPicker.selectedIndex]?.textContent || selectedMonthKey;
    const filename = `godziny-${selectedMonthKey}.csv`;
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const file = new File([blob], filename, { type: "text/csv" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: `Godziny pracy — ${monthLabel}` });
            return;
        } catch (err) {
            if (err.name === "AbortError") return;
            console.error(err);
        }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function refreshHistoryView(entries) {
    dayTotalsCache = buildDayTotals(entries);
    monthsIndexCache = buildMonthsIndex(entries);
    vacationDatesCache = buildVacationDates(entries);
    renderQuickStats();
    renderPolandStatus();

    const key = populateMonthPicker(monthsIndexCache);

    if (key) {
        renderMonth(key);
    } else {
        history.innerHTML = "";
        renderMonthCalendar(null);
        const empty = document.createElement("p");
        empty.textContent = "Brak zapisanych godzin.";
        history.appendChild(empty);
    }
}

monthPicker.onchange = () => renderMonth(monthPicker.value);

addTodayShiftBtn.onclick = async () => {
    if (!activeShiftCache) {
        alert("Najpierw wybierz zmianę w tym tygodniu.");
        return;
    }

    const today = new Date();
    const [sh, sm] = activeShiftCache.start.split(":").map(Number);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sh, sm, 0, 0);

    const [eh, em] = activeShiftCache.end.split(":").map(Number);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eh, em, 0, 0);
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }

    addTodayShiftBtn.disabled = true;
    await replaceDaySession(today, start, end, DEFAULT_BREAK_MINUTES);
    refreshHistoryView(await loadHistory());
    addTodayShiftBtn.disabled = false;
};

function openSettingsDialog(tab = "account") {
    settingsTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
    settingsPanels.forEach((p) => { p.hidden = p.dataset.tabPanel !== tab; });
    populatePolandCycleForm();
    settingsDialog.showModal();
}
settingsTabs.forEach((t) => { t.onclick = () => openSettingsDialog(t.dataset.tab); });

settingsBtn.onclick = () => openSettingsDialog("account");
closeSettingsBtn.onclick = () => settingsDialog.close();

accountBtn.onclick = () => {
    accountDialogEmail.textContent = accountEmail.textContent;
    accountDialog.showModal();
};

closeAccountBtn.onclick = () => accountDialog.close();

accountManageBtn.onclick = () => {
    accountDialog.close();
    openSettingsDialog("account");
};

accountLogoutBtn.onclick = async () => {
    accountDialog.close();
    await supabase.auth.signOut();
};

// editingDate = data dnia, ktory faktycznie istnieje w bazie (do skasowania/przeniesienia).
// null oznacza tryb "dodaj nowy dzien" - nic nie trzeba usuwac przed zapisem.
const editDayPresetOptions = SHIFT_PRESETS
    .map((p, i) => `<option value="${i}">${p.label}</option>`)
    .join("");

editDayPreset.onchange = () => {
    const preset = SHIFT_PRESETS[editDayPreset.value];
    if (!preset) return;
    editDayStart.value = preset.start;
    editDayEnd.value = preset.end;
    editDayPreset.value = "";
};

function openEditDialog({ original, date, start, end, breakMinutes }) {
    editingDate = original;
    editDayTitle.textContent = original ? "Edytuj dzień" : "Dodaj dzień";
    deleteDayBtn.style.display = original ? "" : "none";
    editDayDateInput.value = dateKey(date);
    editDayDateInput.max = dateKey(new Date());
    editDayPreset.innerHTML = `<option value="">— wybierz —</option>${editDayPresetOptions}`;
    editDayStart.value = start ? timeInputValue(start) : "";
    editDayEnd.value = end ? timeInputValue(end) : "";
    editDayBreak.value = breakMinutes;
    editDayMarkTripOff.checked = false;
    editDayDialog.showModal();
}

history.addEventListener("click", (event) => {
    const btn = event.target.closest(".edit-day-btn");
    if (!btn) return;
    openEditDialogForDay(btn.dataset.dayKey);
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
    const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (targetDate > todayMidnight) {
        alert("Nie można dodać godzin dla dnia, który jeszcze nie nastąpił.");
        return;
    }

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

    if (editDayMarkTripOff.checked) {
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        await deleteSessionsForDay(nextDay);
        const nextDayStart = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0, 0, 0);
        await saveEntry({
            start_time: nextDayStart.toISOString(),
            end_time: nextDayStart.toISOString(),
            hours: 0,
            break_minutes: 0,
            note: "Dzień wolny (wyjazd do Polski)"
        });
    }

    selectedMonthKey = monthKey(targetDate);
    refreshHistoryView(await loadHistory());
    submitBtn.disabled = false;
    editDayDialog.close();
};

deleteDayBtn.onclick = async () => {
    if (!editingDate) return;

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

polandTripBtn.onclick = () => {
    if (!polandTripDate.value) {
        const today = new Date();
        const nextThursday = new Date(today);
        const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
        nextThursday.setDate(today.getDate() + daysUntilThursday);
        polandTripDate.value = dateKey(nextThursday);
    }
    polandTripDialog.showModal();
};

closePolandTripBtn.onclick = () => polandTripDialog.close();

polandTripForm.onsubmit = async (event) => {
    event.preventDefault();
    if (!polandTripDate.value) return;

    const [y, m, d] = polandTripDate.value.split("-").map(Number);
    const tripDay = new Date(y, m - 1, d);
    const dayOff = new Date(tripDay);
    dayOff.setDate(dayOff.getDate() + 1);

    const submitBtn = polandTripForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    await deleteSessionsForDay(tripDay);
    const tripStart = new Date(tripDay);
    tripStart.setHours(6, 0, 0, 0);
    const tripBreakMinutes = 15;
    // Brutto = 6h netto + przerwa, zeby po odjeciu przerwy wyszlo dokladnie 6h.
    const tripGrossMs = (6 * 60 + tripBreakMinutes) * 60 * 1000;
    const tripEnd = new Date(tripStart.getTime() + tripGrossMs);
    const tripGrossHours = tripGrossMs / (1000 * 60 * 60);
    await saveEntry({
        start_time: tripStart.toISOString(),
        end_time: tripEnd.toISOString(),
        hours: Number(tripGrossHours.toFixed(2)),
        break_minutes: tripBreakMinutes,
        note: "Wyjazd do Polski – skrócony dzień (6h netto)"
    });

    await deleteSessionsForDay(dayOff);
    const dayOffStart = new Date(dayOff);
    dayOffStart.setHours(0, 0, 0, 0);
    await saveEntry({
        start_time: dayOffStart.toISOString(),
        end_time: dayOffStart.toISOString(),
        hours: 0,
        break_minutes: 0,
        note: "Dzień wolny (wyjazd do Polski)"
    });

    selectedMonthKey = monthKey(tripDay);
    refreshHistoryView(await loadHistory());
    submitBtn.disabled = false;
    polandTripDialog.close();
};

vacationBtn.onclick = () => {
    if (!vacationStartDate.value) vacationStartDate.value = dateKey(new Date());
    if (!vacationEndDate.value) vacationEndDate.value = vacationStartDate.value;
    vacationDialog.showModal();
};

closeVacationBtn.onclick = () => vacationDialog.close();

vacationForm.onsubmit = async (event) => {
    event.preventDefault();
    if (!vacationStartDate.value || !vacationEndDate.value) return;

    const [sy, sm, sd] = vacationStartDate.value.split("-").map(Number);
    const [ey, em, ed] = vacationEndDate.value.split("-").map(Number);
    const rangeStart = new Date(sy, sm - 1, sd);
    const rangeEnd = new Date(ey, em - 1, ed);

    if (rangeEnd < rangeStart) {
        alert("Data \"Do\" nie może być wcześniejsza niż \"Od\".");
        return;
    }

    const submitBtn = vacationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const day = new Date(rangeStart);
    while (day <= rangeEnd) {
        await deleteSessionsForDay(day);
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
        await saveEntry({
            start_time: dayStart.toISOString(),
            end_time: dayStart.toISOString(),
            hours: 0,
            break_minutes: 0,
            note: "Urlop"
        });
        day.setDate(day.getDate() + 1);
    }

    selectedMonthKey = monthKey(rangeStart);
    refreshHistoryView(await loadHistory());
    submitBtn.disabled = false;
    vacationDialog.close();
};

function previousWeekRange() {
    const today = new Date();
    const daysSinceMonday = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevSunday.getDate() + 6);
    return { start: prevMonday, end: prevSunday };
}

weekHoursPreset.onchange = () => {
    const preset = SHIFT_PRESETS[weekHoursPreset.value];
    if (!preset) return;
    weekHoursStart.value = preset.start;
    weekHoursEnd.value = preset.end;
    weekHoursPreset.value = "";
};

function renderWeekRangeSummary() {
    if (weekRangeStart && weekRangeEnd) {
        weekRangeSummary.textContent = `Zaznaczono: ${weekRangeStart.toLocaleDateString("pl-PL")} – ${weekRangeEnd.toLocaleDateString("pl-PL")}`;
    } else if (weekRangeStart) {
        weekRangeSummary.textContent = `Początek: ${weekRangeStart.toLocaleDateString("pl-PL")} — stuknij dzień końcowy.`;
    } else {
        weekRangeSummary.textContent = "Stuknij dzień początkowy zakresu.";
    }
}

function renderWeekRangeCalendar() {
    weekRangeCalendar.innerHTML = "";

    const y = weekRangeViewDate.getFullYear();
    const m = weekRangeViewDate.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    weekRangeMonthLabel.textContent = firstOfMonth.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
    weekRangeNextBtn.disabled = y === todayMidnight.getFullYear() && m === todayMidnight.getMonth();

    const monthData = monthsIndexCache.get(monthKey(firstOfMonth));

    CAL_WEEKDAY_LETTERS.forEach((label) => {
        const head = document.createElement("div");
        head.className = "cal-weekday";
        head.textContent = label;
        weekRangeCalendar.appendChild(head);
    });

    const firstDow = (firstOfMonth.getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
        const filler = document.createElement("div");
        filler.className = "cal-cell cal-cell--empty";
        weekRangeCalendar.appendChild(filler);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cal-cell";
        cell.textContent = String(d);
        cell.dataset.date = dateKey(date);

        if (date > todayMidnight) {
            cell.classList.add("cal-cell--future");
        }
        if (date.getTime() === todayMidnight.getTime()) {
            cell.classList.add("cal-cell--today");
        }
        if (weekRangeStart && date.getTime() === weekRangeStart.getTime()) {
            cell.classList.add("cal-cell--range-start");
        }
        if (weekRangeEnd && date.getTime() === weekRangeEnd.getTime()) {
            cell.classList.add("cal-cell--range-end");
        }
        if (weekRangeStart && weekRangeEnd && date > weekRangeStart && date < weekRangeEnd) {
            cell.classList.add("cal-cell--range-mid");
        }
        if (monthData?.days.has(dateKey(date))) {
            cell.classList.add("cal-cell--has-data");
        }

        weekRangeCalendar.appendChild(cell);
    }

    renderWeekRangeSummary();
}

weekRangeCalendar.addEventListener("click", (event) => {
    const cell = event.target.closest(".cal-cell:not(.cal-cell--empty):not(.cal-cell--future)");
    if (!cell) return;

    const [y, m, d] = cell.dataset.date.split("-").map(Number);
    const clicked = new Date(y, m - 1, d);

    if (!weekRangeStart || (weekRangeStart && weekRangeEnd)) {
        weekRangeStart = clicked;
        weekRangeEnd = null;
    } else if (clicked < weekRangeStart) {
        weekRangeEnd = weekRangeStart;
        weekRangeStart = clicked;
    } else {
        weekRangeEnd = clicked;
    }

    renderWeekRangeCalendar();
});

weekRangePrevBtn.onclick = () => {
    weekRangeViewDate = new Date(weekRangeViewDate.getFullYear(), weekRangeViewDate.getMonth() - 1, 1);
    renderWeekRangeCalendar();
};

weekRangeNextBtn.onclick = () => {
    weekRangeViewDate = new Date(weekRangeViewDate.getFullYear(), weekRangeViewDate.getMonth() + 1, 1);
    renderWeekRangeCalendar();
};

weekHoursBtn.onclick = () => {
    const { start, end } = previousWeekRange();
    weekRangeStart = start;
    weekRangeEnd = end;
    weekRangeViewDate = new Date(start.getFullYear(), start.getMonth(), 1);
    weekHoursPreset.innerHTML = `<option value="">— wybierz —</option>${editDayPresetOptions}`;
    if (activeShiftCache) {
        weekHoursStart.value = activeShiftCache.start;
        weekHoursEnd.value = activeShiftCache.end;
    }
    renderWeekRangeCalendar();
    weekHoursDialog.showModal();
};

closeWeekHoursBtn.onclick = () => weekHoursDialog.close();

weekHoursForm.onsubmit = async (event) => {
    event.preventDefault();
    if (!weekRangeStart || !weekRangeEnd) {
        alert("Zaznacz dzień początkowy i końcowy zakresu w kalendarzu.");
        return;
    }

    const rangeStart = weekRangeStart;
    const rangeEnd = weekRangeEnd;

    const [sh, smi] = weekHoursStart.value.split(":").map(Number);
    const [eh, emi] = weekHoursEnd.value.split(":").map(Number);
    const breakMinutes = parseInt(weekHoursBreak.value, 10);
    if ([sh, smi, eh, emi].some((n) => Number.isNaN(n)) || Number.isNaN(breakMinutes) || breakMinutes < 0) return;

    const skipWeekends = weekHoursSkipWeekends.checked;

    const submitBtn = weekHoursForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const day = new Date(rangeStart);
    while (day <= rangeEnd) {
        const dow = day.getDay();
        if (!(skipWeekends && (dow === 0 || dow === 6))) {
            const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, smi, 0, 0);
            const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eh, emi, 0, 0);
            if (end <= start) {
                end.setDate(end.getDate() + 1);
            }
            await replaceDaySession(new Date(day), start, end, breakMinutes);
        }
        day.setDate(day.getDate() + 1);
    }

    selectedMonthKey = monthKey(rangeStart);
    refreshHistoryView(await loadHistory());
    submitBtn.disabled = false;
    weekHoursDialog.close();
};

function daysBetween(a, b) {
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// Faktyczne przekroczenie granicy nie wypada o polnocy, tylko wieczorem - w dniu zjazdu
// koniec pracy + dojazd, w dniu powrotu wyjazd z Polski + dojazd. Ta godzina przesuwa
// oba brzegi pobytu w Polsce (przyjazd i wyjazd), zamiast liczyc pelnymi dobami od polnocy.
const POLAND_TRIP_TRANSITION_HOUR = 20;

function findNearestFutureDate(dateKeySet, fromDate) {
    let nearest = null;
    dateKeySet.forEach((key) => {
        const [y, m, d] = key.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        if (date > fromDate && (!nearest || date < nearest)) {
            nearest = date;
        }
    });
    return nearest;
}

// Pokazuje osobne okienko z odliczaniem do najblizszego zaplanowanego urlopu,
// o ile nie jest on juz opisany w glownej karcie statusu (unikamy duplikatu).
function updateVacationCountdown(todayMidnight, { suppress = false } = {}) {
    if (suppress) {
        polandVacationCard.style.display = "none";
        return;
    }

    const nearestVacationStart = findNearestFutureDate(vacationDatesCache, todayMidnight);
    if (!nearestVacationStart) {
        polandVacationCard.style.display = "none";
        return;
    }

    const daysUntilVacation = daysBetween(todayMidnight, nearestVacationStart);
    const label = nearestVacationStart.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

    polandVacationCountdownText.textContent = daysUntilVacation === 0
        ? "Zaczyna się dziś!"
        : `Za ${daysUntilVacation} ${daysUntilVacation === 1 ? "dzień" : "dni"} (${label})`;
    polandVacationCard.style.display = "";
}

function renderPolandStatus() {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayKey = dateKey(todayMidnight);

    // Urlop = jestes w domu (Polska), niezaleznie od normalnej rotacji.
    if (vacationDatesCache.has(todayKey)) {
        let cursor = new Date(todayMidnight);
        let daysUntilReturn = 0;
        while (vacationDatesCache.has(dateKey(cursor))) {
            cursor.setDate(cursor.getDate() + 1);
            daysUntilReturn += 1;
        }

        polandStatusFlag.textContent = "🇵🇱";
        polandStatusText.textContent = "Jesteś w Polsce (urlop)";
        polandCountdownText.textContent = daysUntilReturn === 0
            ? "Dziś wracasz do Niemiec"
            : `Wracasz do Niemiec za ${daysUntilReturn} ${daysUntilReturn === 1 ? "dzień" : "dni"} (urlop)`;
        updateVacationCountdown(todayMidnight, { suppress: true });
        return;
    }

    if (!polandCycleCache) {
        polandStatusFlag.textContent = "🧭";
        polandStatusText.textContent = "Cykl zjazdów nieskonfigurowany";
        polandCountdownText.textContent = "Kliknij, żeby go ustawić";
        updateVacationCountdown(todayMidnight);
        return;
    }

    const { anchor, cycleDays, homeDays } = polandCycleCache;
    const anchorArrival = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), POLAND_TRIP_TRANSITION_HOUR, 0, 0);
    const cycleDurationMs = cycleDays * 24 * 60 * 60 * 1000;
    const homeDurationMs = Math.max(0, homeDays - 1) * 24 * 60 * 60 * 1000;
    const msSinceAnchorArrival = today.getTime() - anchorArrival.getTime();
    const cyclePosMs = ((msSinceAnchorArrival % cycleDurationMs) + cycleDurationMs) % cycleDurationMs;
    const inPolandByCycle = cyclePosMs < homeDurationMs;

    if (inPolandByCycle) {
        const returnMoment = new Date(today.getTime() + (homeDurationMs - cyclePosMs));
        const returnMidnight = new Date(returnMoment.getFullYear(), returnMoment.getMonth(), returnMoment.getDate());
        const daysUntilReturn = daysBetween(todayMidnight, returnMidnight);
        polandStatusFlag.textContent = "🇵🇱";
        polandStatusText.textContent = "Jesteś w Polsce";
        polandCountdownText.textContent = daysUntilReturn === 0
            ? "Dziś wracasz do Niemiec"
            : `Wracasz do Niemiec za ${daysUntilReturn} ${daysUntilReturn === 1 ? "dzień" : "dni"}`;
        updateVacationCountdown(todayMidnight);
        return;
    }

    // W Niemczech - sprawdz, czy zaplanowany urlop wypada wczesniej niz normalny zjazd.
    const nextArrivalMoment = new Date(today.getTime() + (cycleDurationMs - cyclePosMs));
    const cycleTripDate = new Date(nextArrivalMoment.getFullYear(), nextArrivalMoment.getMonth(), nextArrivalMoment.getDate());

    const nearestVacationStart = findNearestFutureDate(vacationDatesCache, todayMidnight);

    let nextTripDate = cycleTripDate;
    let isVacationTrip = false;
    if (nearestVacationStart && nearestVacationStart < cycleTripDate) {
        nextTripDate = nearestVacationStart;
        isVacationTrip = true;
    }

    const daysUntilNextTrip = daysBetween(todayMidnight, nextTripDate);
    const nextTripLabel = nextTripDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

    polandStatusFlag.textContent = "🇩🇪";
    polandStatusText.textContent = "Jesteś w Niemczech";
    polandCountdownText.textContent = daysUntilNextTrip === 0
        ? (isVacationTrip ? "Dziś zaczyna się Twój urlop w Polsce!" : "Dziś jedziesz do Polski!")
        : `Zjazd do Polski za ${daysUntilNextTrip} ${daysUntilNextTrip === 1 ? "dzień" : "dni"} (${nextTripLabel}${isVacationTrip ? " — urlop" : ""})`;
    // Jesli najblizszy urlop to ten sam wyjazd co wyzej (isVacationTrip), nie duplikujemy informacji.
    updateVacationCountdown(todayMidnight, { suppress: isVacationTrip });
}

function nextPolandTripDates(count) {
    if (!polandCycleCache) return [];

    const { anchor, cycleDays } = polandCycleCache;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysSinceAnchor = daysBetween(anchor, todayMidnight);
    const cyclePos = ((daysSinceAnchor % cycleDays) + cycleDays) % cycleDays;
    const daysUntilNextTrip = cyclePos === 0 ? 0 : cycleDays - cyclePos;

    const dates = [];
    for (let i = 0; i < count; i++) {
        const d = new Date(todayMidnight);
        d.setDate(d.getDate() + daysUntilNextTrip + i * cycleDays);
        dates.push(d);
    }
    return dates;
}

polandStatusCard.onclick = () => {
    if (!polandCycleCache) {
        openSettingsDialog("poland");
        return;
    }
    const dates = nextPolandTripDates(10);
    polandScheduleList.innerHTML = dates
        .map((d, i) => {
            const label = d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            return `<li>${label}${i === 0 ? " — najbliższy" : ""}</li>`;
        })
        .join("");
    polandScheduleDialog.showModal();
};

closePolandScheduleBtn.onclick = () => polandScheduleDialog.close();

async function initApp() {
    await refreshPolandCycleCache();
    renderPolandStatus();

    await refreshActiveShiftCache();
    populateActiveShiftSelect();
    refreshHistoryView(await loadHistory());
}
