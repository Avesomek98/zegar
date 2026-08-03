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

// Supabase Auth zwraca komunikaty błędów po angielsku - tlumaczymy te najczestsze,
// zeby cala apka (poza tym jednym miejscem) nie przelaczala sie nagle na angielski.
const AUTH_ERROR_TRANSLATIONS = {
    "Invalid login credentials": "Nieprawidłowy e-mail lub hasło.",
    "Email not confirmed": "E-mail nie został jeszcze potwierdzony. Sprawdź skrzynkę odbiorczą.",
    "User already registered": "Konto z tym adresem e-mail już istnieje.",
    "A user with this email address has already been registered": "Konto z tym adresem e-mail już istnieje.",
    "Password should be at least 6 characters": "Hasło musi mieć co najmniej 6 znaków.",
    "Unable to validate email address: invalid format": "Nieprawidłowy format adresu e-mail.",
    "New password should be different from the old password.": "Nowe hasło musi różnić się od poprzedniego.",
    "Email address is invalid": "Nieprawidłowy adres e-mail.",
    "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie za chwilę."
};

function translateAuthError(message) {
    if (!message) return message;
    if (AUTH_ERROR_TRANSLATIONS[message]) return AUTH_ERROR_TRANSLATIONS[message];
    if (/^For security purposes, you can only request this/i.test(message)) {
        return "Ze względów bezpieczeństwa spróbuj ponownie za chwilę.";
    }
    return message;
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
        showAuthMessage(translateAuthError(error.message), false);
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
        showAuthMessage(translateAuthError(error.message), false);
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
        alert(translateAuthError(error.message));
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
        setStatusMessage(changeEmailMessage, translateAuthError(error.message), false);
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
        setStatusMessage(changePasswordMessage, translateAuthError(error.message), false);
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
        alert("Nie udało się usunąć konta: " + translateAuthError(error.message));
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
    { label: "19:30–6:15", start: "19:30", end: "06:15" },
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
const exportPolandScheduleBtn = document.getElementById("exportPolandScheduleBtn");
const exportPolandScheduleDialog = document.getElementById("exportPolandScheduleDialog");
const exportPolandScheduleForm = document.getElementById("exportPolandScheduleForm");
const exportPolandScheduleRange = document.getElementById("exportPolandScheduleRange");
const exportPolandScheduleFormat = document.getElementById("exportPolandScheduleFormat");
const exportPolandScheduleMessage = document.getElementById("exportPolandScheduleMessage");
const closeExportPolandScheduleBtn = document.getElementById("closeExportPolandScheduleBtn");
const history = document.getElementById("history");
const monthTotalEl = document.getElementById("monthTotal");
const accountBtn = document.getElementById("accountBtn");
const accountDialog = document.getElementById("accountDialog");
const accountDialogEmail = document.getElementById("accountDialogEmail");
const accountDialogEmployeeNumber = document.getElementById("accountDialogEmployeeNumber");
const accountLogoutBtn = document.getElementById("accountLogoutBtn");
const accountManageBtn = document.getElementById("accountManageBtn");
const closeAccountBtn = document.getElementById("closeAccountBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const settingsTabs = [...document.querySelectorAll(".dialog-tab")];
const settingsPanels = [...document.querySelectorAll(".dialog-tab-panel")];
const configBtn = document.getElementById("configBtn");
const configDialog = document.getElementById("configDialog");
const closeConfigBtn = document.getElementById("closeConfigBtn");
const employeeNumberForm = document.getElementById("employeeNumberForm");
const employeeNumberInput = document.getElementById("employeeNumberInput");
const employeeNumberMessage = document.getElementById("employeeNumberMessage");
const clearEmployeeNumberBtn = document.getElementById("clearEmployeeNumberBtn");
const employeeNumberFooter = document.getElementById("employeeNumberFooter");
const polandCycleForm = document.getElementById("polandCycleForm");
const polandCycleAnchorInput = document.getElementById("polandCycleAnchorInput");
const polandCycleWeeksInput = document.getElementById("polandCycleWeeksInput");
const polandCycleHomeDaysInput = document.getElementById("polandCycleHomeDaysInput");
const polandCycleMessage = document.getElementById("polandCycleMessage");
const clearPolandCycleBtn = document.getElementById("clearPolandCycleBtn");
const vacationAllowanceForm = document.getElementById("vacationAllowanceForm");
const vacationAllowanceInput = document.getElementById("vacationAllowanceInput");
const vacationAllowanceMessage = document.getElementById("vacationAllowanceMessage");
const vacationAllowanceYear = document.getElementById("vacationAllowanceYear");

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
const exportMonthDialog = document.getElementById("exportMonthDialog");
const exportMonthForm = document.getElementById("exportMonthForm");
const exportMonthSelect = document.getElementById("exportMonthSelect");
const exportMonthFormat = document.getElementById("exportMonthFormat");
const exportMonthMessage = document.getElementById("exportMonthMessage");
const closeExportMonthBtn = document.getElementById("closeExportMonthBtn");
const monthCalendar = document.getElementById("monthCalendar");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const authThemeToggleBtn = document.getElementById("authThemeToggleBtn");
const refreshBtn = document.getElementById("refreshBtn");
const changelogBtn = document.getElementById("changelogBtn");
const changelogDialog = document.getElementById("changelogDialog");
const closeChangelogBtn = document.getElementById("closeChangelogBtn");
const helpBtn = document.getElementById("helpBtn");
const helpDialog = document.getElementById("helpDialog");
const closeHelpBtn = document.getElementById("closeHelpBtn");

const editDayDialog = document.getElementById("editDayDialog");
const editDayTitle = document.getElementById("editDayTitle");
const editDayForm = document.getElementById("editDayForm");
const editDayDateInput = document.getElementById("editDayDateInput");
const editDayDateField = document.getElementById("editDayDateField");
const editDayPreset = document.getElementById("editDayPreset");
const editDayStart = document.getElementById("editDayStart");
const editDayEnd = document.getElementById("editDayEnd");
const editDayBreak = document.getElementById("editDayBreak");
const editDayMarkTripOff = document.getElementById("editDayMarkTripOff");
const deleteDayBtn = document.getElementById("deleteDayBtn");
const closeEditDayBtn = document.getElementById("closeEditDayBtn");
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

const dayActionDialog = document.getElementById("dayActionDialog");
const dayActionTitle = document.getElementById("dayActionTitle");
const dayActionHint = document.getElementById("dayActionHint");
const dayActionHoursBtn = document.getElementById("dayActionHoursBtn");
const dayActionVacationBtn = document.getElementById("dayActionVacationBtn");
const dayActionSickLeaveBtn = document.getElementById("dayActionSickLeaveBtn");
const dayActionPolandTripBtn = document.getElementById("dayActionPolandTripBtn");
const closeDayActionBtn = document.getElementById("closeDayActionBtn");
let dayActionDate = null;

const polandTripDialog = document.getElementById("polandTripDialog");
const polandTripForm = document.getElementById("polandTripForm");
const polandTripDate = document.getElementById("polandTripDate");
const closePolandTripBtn = document.getElementById("closePolandTripBtn");

const vacationBtn = document.getElementById("vacationBtn");
const vacationDialog = document.getElementById("vacationDialog");
const vacationForm = document.getElementById("vacationForm");
const vacationRangeCalendar = document.getElementById("vacationRangeCalendar");
const vacationRangePrevBtn = document.getElementById("vacationRangePrevBtn");
const vacationRangeNextBtn = document.getElementById("vacationRangeNextBtn");
const vacationRangeMonthLabel = document.getElementById("vacationRangeMonthLabel");
const vacationRangeSummary = document.getElementById("vacationRangeSummary");
const closeVacationBtn = document.getElementById("closeVacationBtn");

const sickLeaveBtn = document.getElementById("sickLeaveBtn");
const sickLeaveDialog = document.getElementById("sickLeaveDialog");
const sickLeaveSummary = document.getElementById("sickLeaveSummary");
const sickLeaveForm = document.getElementById("sickLeaveForm");
const sickLeaveRangeCalendar = document.getElementById("sickLeaveRangeCalendar");
const sickLeaveRangePrevBtn = document.getElementById("sickLeaveRangePrevBtn");
const sickLeaveRangeNextBtn = document.getElementById("sickLeaveRangeNextBtn");
const sickLeaveRangeMonthLabel = document.getElementById("sickLeaveRangeMonthLabel");
const sickLeaveRangeSummary = document.getElementById("sickLeaveRangeSummary");
const sickLeaveNoteInput = document.getElementById("sickLeaveNoteInput");
const closeSickLeaveBtn = document.getElementById("closeSickLeaveBtn");
const openSickLeaveHistoryBtn = document.getElementById("openSickLeaveHistoryBtn");
const sickLeaveHistoryDialog = document.getElementById("sickLeaveHistoryDialog");
const sickLeaveHistoryBody = document.getElementById("sickLeaveHistoryBody");
const closeSickLeaveHistoryBtn = document.getElementById("closeSickLeaveHistoryBtn");

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

let editingDate = null;
let dayTotalsCache = new Map();
let monthsIndexCache = new Map();
let selectedMonthKey = null;
let activeShiftCache = null; // { start, end, label } | null
let vacationDatesCache = new Set(); // Set<"YYYY-MM-DD"> dni oznaczonych jako Urlop
let sickLeaveDatesCache = new Set(); // Set<"YYYY-MM-DD"> dni oznaczonych jako zwolnienie lekarskie
let sickLeaveRecordsCache = []; // [{ date, reason }], najnowsze pierwsze - do okienka Historia zwolnien
let polandCycleCache = null; // { anchor: Date, cycleDays: number, homeDays: number } | null
let vacationAllowanceCache = null; // liczba dni urlopu przyznanych na biezacy rok | null (nieustawiony)
let employeeNumberCache = null; // numer pracownika (string, zeby zachowac wiodace zera) | null

const NIGHT_START_HOUR = 20;
const NIGHT_END_HOUR = 6;
const DEFAULT_BREAK_MINUTES = 45;
const BREAK_HOUR = 2; // przerwa jest realnie brana o 2:00 w nocy, gdy zmiana obejmuje te pore

// Zwolnienie lekarskie rozpoznajemy po prefiksie notatki - "Zwolnienie lekarskie" (bez powodu)
// albo "Zwolnienie lekarskie: <powod>" (gdy uzytkownik poda opcjonalna notatke).
const SICK_LEAVE_NOTE_PREFIX = "Zwolnienie lekarskie";

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

// Na telefonie "Dzisiejsza zmiana" ma byc widoczna od razu, wyzej niz szybkie akcje -
// przenosimy ja do panelu bocznego (nad "quick-actions"). Na desktopie wraca na swoje
// pierwotne miejsce w kolumnie glownej (nad statystykami i kalendarzem).
const appMain = document.querySelector(".app-main");
const activeShiftRow = document.querySelector(".active-shift-row");
const quickActionsCard = document.querySelector(".quick-actions");

function placeActiveShiftRow(isDesktop) {
    if (isDesktop) {
        if (activeShiftRow.parentElement !== appMain) {
            appMain.insertBefore(activeShiftRow, appMain.firstChild);
        }
    } else if (activeShiftRow.nextElementSibling !== quickActionsCard) {
        appSidebar.insertBefore(activeShiftRow, quickActionsCard);
    }
}

placeActiveShiftRow(desktopLayoutQuery.matches);
desktopLayoutQuery.addEventListener("change", (event) => placeActiveShiftRow(event.matches));

refreshBtn.onclick = () => {
    window.location.reload();
};

changelogBtn.onclick = () => changelogDialog.showModal();

helpBtn.onclick = () => helpDialog.showModal();
closeHelpBtn.onclick = () => helpDialog.close();

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
    activeShiftSelect.innerHTML = `${presetOptions}<option value="custom">Własne godziny</option>`;

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

async function refreshVacationAllowanceCache() {
    const { data, error } = await supabase
        .from("app_settings")
        .select("vacation_days_per_year")
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }
    vacationAllowanceCache = data?.vacation_days_per_year ?? null;
}

function populateVacationAllowanceForm() {
    setStatusMessage(vacationAllowanceMessage, "");
    vacationAllowanceYear.textContent = String(new Date().getFullYear());
    vacationAllowanceInput.value = vacationAllowanceCache != null ? String(vacationAllowanceCache) : "";
}

vacationAllowanceForm.onsubmit = async (event) => {
    event.preventDefault();
    const days = Number(vacationAllowanceInput.value);
    if (!Number.isInteger(days) || days < 0) return;

    const submitBtn = vacationAllowanceForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { error } = await supabase
        .from("app_settings")
        .upsert(
            { user_id: currentUserId, vacation_days_per_year: days, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );

    submitBtn.disabled = false;

    if (error) {
        console.error(error);
        setStatusMessage(vacationAllowanceMessage, "Nie udało się zapisać ustawień.", false);
        return;
    }

    vacationAllowanceCache = days;
    setStatusMessage(vacationAllowanceMessage, "Zapisano.", true);
    renderQuickStats();
};

async function refreshEmployeeNumberCache() {
    const { data, error } = await supabase
        .from("app_settings")
        .select("employee_number")
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }
    employeeNumberCache = data?.employee_number || null;
}

function populateEmployeeNumberForm() {
    setStatusMessage(employeeNumberMessage, "");
    employeeNumberInput.value = employeeNumberCache || "";
}

// Widoczna w szybkich akcjach i w oknie Konto - subtelny sygnal "jestes rozpoznany jako X",
// podobnie jak e-mail zalogowanego konta.
function renderEmployeeNumberFooter() {
    if (employeeNumberCache) {
        employeeNumberFooter.textContent = `Nr pracownika: ${employeeNumberCache}`;
        employeeNumberFooter.style.display = "block";
    } else {
        employeeNumberFooter.style.display = "none";
    }
}

async function saveEmployeeNumber(value) {
    const { error } = await supabase
        .from("app_settings")
        .upsert(
            { user_id: currentUserId, employee_number: value || null, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );

    if (error) {
        console.error(error);
        setStatusMessage(employeeNumberMessage, "Nie udało się zapisać numeru.", false);
        return;
    }

    employeeNumberCache = value || null;
    employeeNumberInput.value = employeeNumberCache || "";
    setStatusMessage(employeeNumberMessage, employeeNumberCache ? "Zapisano." : "Numer usunięty.", true);
    renderEmployeeNumberFooter();
}

employeeNumberForm.onsubmit = async (event) => {
    event.preventDefault();
    const submitBtn = employeeNumberForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    await saveEmployeeNumber(employeeNumberInput.value.trim());
    submitBtn.disabled = false;
};

clearEmployeeNumberBtn.onclick = async () => {
    clearEmployeeNumberBtn.disabled = true;
    await saveEmployeeNumber("");
    clearEmployeeNumberBtn.disabled = false;
};

const configTabs = [...document.querySelectorAll(".config-tab")];
const configPanels = [...document.querySelectorAll(".config-tab-panel")];

function setConfigTab(tab) {
    configTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.configTab === tab));
    configPanels.forEach((p) => { p.hidden = p.dataset.configTabPanel !== tab; });
}
configTabs.forEach((t) => { t.onclick = () => setConfigTab(t.dataset.configTab); });

function openConfigDialog(tab = "employee") {
    setConfigTab(tab);
    populateEmployeeNumberForm();
    populatePolandCycleForm();
    populateVacationAllowanceForm();
    configDialog.showModal();
}

configBtn.onclick = () => openConfigDialog();
closeConfigBtn.onclick = () => configDialog.close();

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
    renderMonthCalendar(selectedMonthKey);
};

clearPolandCycleBtn.onclick = async () => {
    if (!confirm("Na pewno usunąć ustawienia cyklu zjazdów? Status Polska/Niemcy pokaże się jako nieskonfigurowany, dopóki nie ustawisz go ponownie.")) return;

    clearPolandCycleBtn.disabled = true;
    const { error } = await supabase
        .from("app_settings")
        .update({
            poland_trip_anchor: null,
            poland_trip_cycle_weeks: null,
            poland_trip_home_days: null,
            updated_at: new Date().toISOString()
        })
        .eq("user_id", currentUserId);
    clearPolandCycleBtn.disabled = false;

    if (error) {
        console.error(error);
        setStatusMessage(polandCycleMessage, "Nie udało się usunąć ustawień.", false);
        return;
    }

    polandCycleCache = null;
    populatePolandCycleForm();
    setStatusMessage(polandCycleMessage, "Ustawienia cyklu usunięte.", true);
    renderPolandStatus();
    renderMonthCalendar(selectedMonthKey);
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

// Przerwa jest realnie brana o 2:00 w nocy - jesli zmiana obejmuje te godzine, zwraca
// dwa przepracowane odcinki [start,end] z wycieta dokladnie ta przerwa. W przeciwnym razie
// (zmiana nie siega 2:00, np. dzienna) zwraca null - nie da sie dokladnie umiejscowic przerwy.
function netWorkedIntervals(session) {
    const { start, end, breakMinutes } = session;
    if (breakMinutes <= 0) return [[start, end]];

    const breakStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), BREAK_HOUR, 0, 0, 0);
    if (breakStart <= start) breakStart.setDate(breakStart.getDate() + 1);
    const breakEnd = new Date(breakStart.getTime() + breakMinutes * 60 * 1000);

    if (breakStart >= start && breakEnd <= end) {
        return [[start, breakStart], [breakEnd, end]];
    }
    return null;
}

// Godziny nocne/niedzielne licza sie normalnie z surowego zakresu [start, end], ale z wycieta
// przerwa (patrz netWorkedIntervals) - inaczej moglyby przekroczyc rzeczywiste godziny netto.
// Gdy nie da sie dokladnie umiejscowic przerwy w zmianie (np. zmiana dzienna), przycinamy
// proporcjonalnie do udzialu przerwy w calej (brutto) zmianie - to i tak wtedy zwykle 0.
function overlapNetHours(session, overlapFn) {
    const intervals = netWorkedIntervals(session);
    if (intervals) {
        return intervals.reduce((sum, [s, e]) => sum + (e > s ? overlapFn(s, e) : 0), 0);
    }
    if (session.hours <= 0) return 0;
    return overlapFn(session.start, session.end) * (netHours(session) / session.hours);
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

function buildSickLeaveDates(entries) {
    const dates = new Set();
    entries.forEach((entry) => {
        if (entry.note && entry.note.startsWith(SICK_LEAVE_NOTE_PREFIX)) {
            dates.add(dateKey(new Date(entry.start_time)));
        }
    });
    return dates;
}

function sickLeaveReasonFromNote(note) {
    const withReasonPrefix = `${SICK_LEAVE_NOTE_PREFIX}: `;
    return note.startsWith(withReasonPrefix) ? note.slice(withReasonPrefix.length) : null;
}

// Pelna lista dni zwolnienia (data + opcjonalny powod) do okienka "Historia zwolnien" -
// w odroznieniu od sickLeaveDatesCache (tylko klucze dat, do szybkich sprawdzen w kalendarzu).
function buildSickLeaveRecords(entries) {
    const records = [];
    entries.forEach((entry) => {
        if (entry.note && entry.note.startsWith(SICK_LEAVE_NOTE_PREFIX)) {
            records.push({ date: new Date(entry.start_time), reason: sickLeaveReasonFromNote(entry.note) });
        }
    });
    records.sort((a, b) => b.date - a.date);
    return records;
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

    // Biezacy miesiac ma byc zawsze wybieralny (i domyslny) w historii, nawet bez wpisow.
    const currentKey = monthKey(new Date());
    if (!months.has(currentKey)) {
        months.set(currentKey, { date: new Date(), days: new Map() });
    }

    return months;
}

// Ile dni urlopu z biezacego roku kalendarzowego "zabiera" pule urlopowa - bez sobot/niedziel
// i bez dni, ktore i tak wypadaja w Polsce wg cyklu zjazdow (patrz isVacationChargeableDate) -
// ta sama zasada, co w podsumowaniu miesiaca (monthVacationChargeableDays w renderMonth).
function currentYearVacationChargeableDays() {
    const year = new Date().getFullYear();
    let count = 0;
    vacationDatesCache.forEach((key) => {
        const [y, m, d] = key.split("-").map(Number);
        if (y !== year) return;
        if (isVacationChargeableDate(new Date(y, m - 1, d))) count += 1;
    });
    return count;
}

// null = limit urlopu nieustawiony (kafelek "Pozostały urlop" zaprasza do konfiguracji).
function remainingVacationDays() {
    if (vacationAllowanceCache == null) return null;
    return vacationAllowanceCache - currentYearVacationChargeableDays();
}

function renderQuickStats() {
    const now = new Date();
    const todayHours = dayTotalsCache.get(dateKey(now))?.hours || 0;

    const currentMonthPrefix = monthKey(now);
    let monthHours = 0;
    dayTotalsCache.forEach((day, key) => {
        if (key.startsWith(currentMonthPrefix)) {
            monthHours += day.hours;
        }
    });

    const remaining = remainingVacationDays();
    const vacationCardHtml = remaining === null
        ? `<div class="stat-card stat-card--clickable" id="vacationStatCard">
                <span class="stat-label">Pozostały urlop</span>
                <span class="stat-value">Skonfiguruj →</span>
           </div>`
        : `<div class="stat-card stat-card--clickable${remaining < 0 ? " stat-card--warning" : ""}" id="vacationStatCard">
                <span class="stat-label">Pozostały urlop</span>
                <span class="stat-value">${remaining} ${remaining === 1 ? "dzień" : "dni"}</span>
           </div>`;

    quickStats.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Dziś</span>
            <span class="stat-value">${todayHours.toFixed(2)} godz.</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">W tym miesiącu</span>
            <span class="stat-value">${monthHours.toFixed(2)} godz.</span>
        </div>
        ${vacationCardHtml}
    `;
}

quickStats.addEventListener("click", (event) => {
    if (event.target.closest("#vacationStatCard")) openConfigDialog("vacation");
});

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

    const currentMonthKey = monthKey(new Date());
    const keep = sortedKeys.includes(selectedMonthKey)
        ? selectedMonthKey
        : (sortedKeys.includes(currentMonthKey) ? currentMonthKey : sortedKeys[0]);
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
            const isSickLeave = day.sessions.some((s) => s.note && s.note.startsWith(SICK_LEAVE_NOTE_PREFIX));
            const isDayOff = day.sessions.some((s) => s.hours === 0 && s.start.getTime() === s.end.getTime());
            const hasHours = day.sessions.some((s) => !(s.hours === 0 && s.start.getTime() === s.end.getTime()));

            if (isVacation) {
                cell.classList.add("cal-cell--vacation");
            } else if (isSickLeave) {
                cell.classList.add("cal-cell--sick");
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
        if (isDateInPolandCycle(date)) cell.classList.add("cal-cell--poland-home");

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
    openDayActionMenu(clickedDate);
});

// Klikniecie pustego dnia w kalendarzu otwiera menu wyboru akcji zamiast od razu skakac do
// dodawania godzin - urlop/zwolnienie/wyjazd do Polski mozna zaplanowac tez na przyszlosc,
// ale przepracowanych godzin nie da sie dodac dla dnia, ktory jeszcze sie nie odbyl.
function openDayActionMenu(date) {
    dayActionDate = date;
    const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const isFuture = date > todayMidnight;

    dayActionTitle.textContent = date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    dayActionHoursBtn.disabled = isFuture;
    dayActionHint.style.display = isFuture ? "block" : "none";

    dayActionDialog.showModal();
}

dayActionHoursBtn.onclick = () => {
    dayActionDialog.close();
    openEditDialog({
        original: null,
        date: dayActionDate,
        start: null,
        end: null,
        breakMinutes: DEFAULT_BREAK_MINUTES,
        dateEditable: false
    });
};

dayActionVacationBtn.onclick = () => {
    dayActionDialog.close();
    vacationRangePicker.setRange(dayActionDate, dayActionDate);
    vacationDialog.showModal();
};

dayActionSickLeaveBtn.onclick = () => {
    dayActionDialog.close();
    renderSickLeaveSummary();
    sickLeaveNoteInput.value = "";
    sickLeaveRangePicker.setRange(dayActionDate, dayActionDate);
    sickLeaveDialog.showModal();
};

dayActionPolandTripBtn.onclick = () => {
    dayActionDialog.close();
    polandTripDate.value = dateKey(dayActionDate);
    polandTripDialog.showModal();
};

closeDayActionBtn.onclick = () => dayActionDialog.close();

function buildDaySessionsHtml(day) {
    let dayHours = 0;
    let dayNight = 0;
    let daySunday = 0;

    const sessionsHtml = day.sessions
        .sort((a, b) => a.start - b.start)
        .map((session) => {
            const net = netHours(session);
            const night = overlapNetHours(session, nightOverlapHours);
            const sunday = overlapNetHours(session, sundayOverlapHours);
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

function openEditDialogForDay(dayKey, dateEditable = true) {
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
        breakMinutes: primarySession.breakMinutes,
        dateEditable
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
    openEditDialogForDay(dayDetailsCurrentKey, false);
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
    let monthSickDays = 0;

    [...month.days.keys()].sort().reverse().forEach((dKey) => {
        const day = month.days.get(dKey);
        const { sessionsHtml, dayHours, dayNight, daySunday } = buildDaySessionsHtml(day);

        monthHours += dayHours;
        monthNight += dayNight;
        monthSunday += daySunday;

        const isVacation = day.sessions.some((s) => s.note === "Urlop");
        const isSickLeave = day.sessions.some((s) => s.note && s.note.startsWith(SICK_LEAVE_NOTE_PREFIX));
        const dow = day.date.getDay();
        const isWeekendDay = dow === 0 || dow === 6;

        if (isVacation) {
            monthVacationDays += 1;
            if (isVacationChargeableDate(day.date)) monthVacationChargeableDays += 1;
        }
        if (isSickLeave) monthSickDays += 1;

        const isWeekend = !isVacation && !isSickLeave && isWeekendDay;

        const card = document.createElement("div");
        card.className = "day-card" + (isVacation ? " day-card--vacation" : isSickLeave ? " day-card--sick" : isWeekend ? " day-card--weekend" : "");
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
        totalParts.push(`🌴 ${monthVacationDays} ${monthVacationDays === 1 ? "dzień" : "dni"} urlopu (${monthVacationChargeableDays} z puli, bez sob/nd i dni w PL)`);
    }
    if (monthSickDays > 0) {
        totalParts.push(`🤒 ${monthSickDays} ${monthSickDays === 1 ? "dzień" : "dni"} zwolnienia`);
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

function rowsToCsv(rows) {
    return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

// Excel (.xlsx) i PDF wymagaja zewnetrznych bibliotek - doladowywane leniwie (dynamic import
// z tego samego CDN, z ktorego juz korzysta Supabase) tylko wtedy, gdy user faktycznie wybierze
// jeden z tych formatow. CSV dziala w pelni offline, te dwa formaty wymagaja polaczenia z siecia
// przy pierwszym takim eksporcie.
async function rowsToXlsxBlob(rows, sheetName) {
    const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// jsPDF (standardowe 14 fontow) nie obsluguje polskich znakow (a, c, e, l, n, o, s, z, z) -
// osadzamy wlasny font (PT Sans, ma pelne wsparcie Central European) zamiast domyslnego.
// Font doladowywany leniwie z lokalnego pliku (fonts/pt-sans-regular.js), tylko przy eksporcie PDF.
async function createPdfDocument(orientation) {
    const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2/+esm");
    const { PT_SANS_REGULAR_BASE64 } = await import("./fonts/pt-sans-regular.js");

    const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
    doc.addFileToVFS("PTSans-Regular.ttf", PT_SANS_REGULAR_BASE64);
    doc.addFont("PTSans-Regular.ttf", "PTSans", "normal");
    doc.setFont("PTSans", "normal");
    return doc;
}

// Rysuje profesjonalnie wygladajacy naglowek raportu: nazwa apki, tytul, cienka linia pod spodem.
// Zwraca Y, od ktorego mozna rysowac dalsza tresc (np. tabele).
function drawPdfReportHeader(doc, marginX, title) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 42;

    doc.setFontSize(17);
    doc.setTextColor(30, 33, 45);
    doc.text("Kalendarz Pracy", marginX, y);

    if (employeeNumberCache) {
        doc.setFontSize(10.5);
        doc.setTextColor(100, 105, 120);
        doc.text(`Nr pracownika: ${employeeNumberCache}`, pageWidth - marginX, y, { align: "right" });
        doc.setTextColor(30, 33, 45);
    }

    y += 18;
    doc.setFontSize(11.5);
    doc.setTextColor(100, 105, 120);
    doc.text(title, marginX, y);
    doc.setTextColor(0, 0, 0);

    y += 10;
    doc.setDrawColor(74, 144, 217);
    doc.setLineWidth(1.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);

    return y + 22;
}

// Generyczna tabela z zawijaniem tresci w komorkach (kazda kolumna moze miec wiele linii,
// wysokosc wiersza dopasowuje sie do najdluzszej z nich) i automatycznym przechodzeniem na
// kolejna strone, z ponownym rysowaniem naglowka tabeli na kazdej nowej stronie.
function drawPdfTable(doc, { columns, headerRow, bodyRows, marginX, startY, marginBottom = 56, fontSize = 8.5 }) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const cellPadding = 4;
    const lineGap = fontSize + 2.5;

    function colX(index) {
        let x = marginX;
        for (let i = 0; i < index; i++) x += columns[i].width;
        return x;
    }

    function measure(cells, size) {
        doc.setFontSize(size);
        const wrapped = cells.map((cell, i) => doc.splitTextToSize(String(cell ?? ""), columns[i].width - cellPadding * 2));
        const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
        return { wrapped, height: lineCount * lineGap + cellPadding * 2 };
    }

    function drawHeaderRow(y) {
        const { wrapped, height } = measure(headerRow, fontSize);
        doc.setFillColor(238, 242, 250);
        doc.rect(marginX, y, totalWidth, height, "F");
        doc.setFontSize(fontSize);
        doc.setTextColor(50, 60, 90);
        wrapped.forEach((lines, i) => {
            lines.forEach((line, li) => {
                doc.text(line, colX(i) + cellPadding, y + cellPadding + lineGap * (li + 1) - 3);
            });
        });
        doc.setTextColor(0, 0, 0);
        const bottom = y + height;
        doc.setDrawColor(180, 190, 210);
        doc.line(marginX, bottom, marginX + totalWidth, bottom);
        doc.setDrawColor(0, 0, 0);
        return bottom;
    }

    let y = drawHeaderRow(startY);

    bodyRows.forEach((row) => {
        const { wrapped, height } = measure(row, fontSize);

        if (y + height > pageHeight - marginBottom) {
            doc.addPage();
            y = drawHeaderRow(42);
        }

        doc.setFontSize(fontSize);
        wrapped.forEach((lines, i) => {
            lines.forEach((line, li) => {
                doc.text(line, colX(i) + cellPadding, y + cellPadding + lineGap * (li + 1) - 3);
            });
        });

        const rowBottom = y + height;
        doc.setDrawColor(228, 231, 238);
        doc.line(marginX, rowBottom, marginX + totalWidth, rowBottom);
        doc.setDrawColor(0, 0, 0);
        y = rowBottom;
    });

    return y;
}

// Sekcja "Podsumowanie" pod tabela - osobno stylowana (nie jako kolejne wiersze tabeli, w
// odroznieniu od CSV/Excel, gdzie podsumowanie to po prostu dodatkowe wiersze arkusza).
function drawPdfSummarySection(doc, marginX, startY, lines) {
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = startY;

    if (y > pageHeight - 90) {
        doc.addPage();
        y = 42;
    } else {
        y += 26;
    }

    doc.setFontSize(12.5);
    doc.text("Podsumowanie", marginX, y);
    y += 6;
    doc.setDrawColor(200, 205, 215);
    doc.line(marginX, y, doc.internal.pageSize.getWidth() - marginX, y);
    doc.setDrawColor(0, 0, 0);
    y += 18;

    doc.setFontSize(10);
    lines.forEach((line) => {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 42;
        }
        doc.text(line, marginX, y);
        y += 16;
    });

    return y;
}

// Wspolny zapis/udostepnienie pliku dla wszystkich formatow eksportu - na telefonie przez
// natywne okno "Udostepnij" (jesli obslugiwane dla danego typu pliku), na komputerze zwykle pobranie.
async function downloadOrShareFile(blob, filename, shareTitle) {
    const file = new File([blob], filename, { type: blob.type });

    if (!desktopLayoutQuery.matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: shareTitle });
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
}

// Numer pracownika w nagłówku arkusza (CSV/Excel) - w PDF ten sam numer dorysowany jest
// osobno w drawPdfReportHeader (wlasny layout, nie kolejny wiersz tabeli).
function withEmployeeHeaderRows(rows) {
    if (!employeeNumberCache) return rows;
    return [["Nr pracownika", employeeNumberCache], [], ...rows];
}

// format: "csv" | "xlsx" | "pdf". `buildPdf` generuje PDF osobno (inny layout niz plaskie
// wiersze CSV/Excel - patrz buildMonthPdfBlob/buildPolandSchedulePdfBlob).
async function exportReport({ rows, format, baseFilename, shareTitle, sheetName, buildPdf }) {
    if (format === "xlsx") {
        const blob = await rowsToXlsxBlob(withEmployeeHeaderRows(rows), sheetName);
        await downloadOrShareFile(blob, `${baseFilename}.xlsx`, shareTitle);
    } else if (format === "pdf") {
        const blob = await buildPdf();
        await downloadOrShareFile(blob, `${baseFilename}.pdf`, shareTitle);
    } else {
        const blob = new Blob(["﻿" + rowsToCsv(withEmployeeHeaderRows(rows))], { type: "text/csv;charset=utf-8" });
        await downloadOrShareFile(blob, `${baseFilename}.csv`, shareTitle);
    }
}

const MONTH_REPORT_HEADER = [
    "Data", "Dzień tygodnia", "Od", "Do", "Brutto (godz.)",
    "Przerwa (min)", "Netto (godz.)", "Nocne (godz.)", "Niedzielne (godz.)", "Notatka"
];

// Dane raportu miesiaca w formie strukturalnej (nie od razu jako plaskie wiersze CSV) - zeby
// PDF mogl pokazac podsumowanie jako osobno stylowana sekcja, a nie kolejne wiersze tabeli
// (tak jak w CSV/Excel, gdzie to po prostu dodatkowe wiersze arkusza - patrz monthReportToRows).
function buildMonthReportData(key) {
    const month = monthsIndexCache.get(key);
    if (!month) return null;

    const dataRows = [];
    let totalNet = 0;
    let totalNight = 0;
    let totalSunday = 0;
    let rowCount = 0;
    let vacationDays = 0;
    let vacationChargeableDays = 0;
    let sickDays = 0;

    [...month.days.keys()].sort().forEach((dKey) => {
        const day = month.days.get(dKey);

        if (day.sessions.some((s) => s.note === "Urlop")) {
            vacationDays += 1;
            if (isVacationChargeableDate(day.date)) vacationChargeableDays += 1;
        }
        if (day.sessions.some((s) => s.note && s.note.startsWith(SICK_LEAVE_NOTE_PREFIX))) {
            sickDays += 1;
        }

        day.sessions
            .sort((a, b) => a.start - b.start)
            .forEach((session) => {
                const net = netHours(session);
                const night = overlapNetHours(session, nightOverlapHours);
                const sunday = overlapNetHours(session, sundayOverlapHours);
                totalNet += net;
                totalNight += night;
                totalSunday += sunday;
                rowCount += 1;

                const isDayOff = session.hours === 0 && session.start.getTime() === session.end.getTime();

                dataRows.push([
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

    return {
        dataRows,
        summary: { totalNet, totalNight, totalSunday, vacationDays, vacationChargeableDays, sickDays }
    };
}

// Do CSV/Excel podsumowanie to po prostu dodatkowe wiersze na koncu tego samego arkusza.
function monthReportToRows(reportData) {
    const { totalNet, totalNight, totalSunday, vacationDays, vacationChargeableDays, sickDays } = reportData.summary;
    const rows = [MONTH_REPORT_HEADER, ...reportData.dataRows];

    rows.push([]);
    rows.push(["Suma", "", "", "", "", "", totalNet.toFixed(2), totalNight.toFixed(2), totalSunday.toFixed(2), ""]);
    if (vacationDays > 0) {
        rows.push([`Dni urlopu: ${vacationDays} (${vacationChargeableDays} z puli, bez sob/nd i dni w PL)`]);
    }
    if (sickDays > 0) {
        rows.push([`Dni zwolnienia lekarskiego: ${sickDays}`]);
    }

    return rows;
}

// PDF: A4 pionowo, wlasny font (polskie znaki), Notatka dostaje najwiecej miejsca z kolumn,
// podsumowanie jako osobna, stylowana sekcja pod tabela (nie kolejne wiersze).
async function buildMonthPdfBlob(reportData, monthLabel) {
    const doc = await createPdfDocument("portrait");
    const marginX = 36;
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = drawPdfReportHeader(doc, marginX, `Zestawienie godzin pracy — ${monthLabel}`);

    // Dzien tygodnia i Od/Do dostaja wiecej miejsca - "poniedzialek" oraz "06:00" nie miescily
    // sie wczesniej w jednej linii i lamaly sie w polowie slowa/liczby.
    const fixedWidths = [50, 62, 34, 34, 34, 36, 34, 34, 40];
    const usableWidth = pageWidth - marginX * 2;
    const columns = [
        ...fixedWidths.map((width) => ({ width })),
        { width: usableWidth - fixedWidths.reduce((sum, w) => sum + w, 0) }
    ];

    y = drawPdfTable(doc, {
        columns,
        headerRow: ["Data", "Dzień tyg.", "Od", "Do", "Brutto", "Przerwa", "Netto", "Nocne", "Niedz.", "Notatka"],
        bodyRows: reportData.dataRows,
        marginX,
        startY: y
    });

    const { totalNet, totalNight, totalSunday, vacationDays, vacationChargeableDays, sickDays } = reportData.summary;
    const summaryLines = [`Suma godzin netto: ${totalNet.toFixed(2)} godz.`];
    if (totalNight > 0.005) summaryLines.push(`Godziny nocne: ${totalNight.toFixed(2)} godz.`);
    if (totalSunday > 0.005) summaryLines.push(`Godziny niedzielne: ${totalSunday.toFixed(2)} godz.`);
    if (vacationDays > 0) summaryLines.push(`Dni urlopu: ${vacationDays} (${vacationChargeableDays} z puli, bez sob/nd i dni w PL)`);
    if (sickDays > 0) summaryLines.push(`Dni zwolnienia lekarskiego: ${sickDays}`);

    drawPdfSummarySection(doc, marginX, y, summaryLines);

    return doc.output("blob");
}

// Eksport ma wlasny wybor miesiaca (niezalezny od monthPicker w Historii) - zeby dalo sie
// pobrac dowolny miesiac z historii bez konieczności najpierw przelaczania na niego widoku.
function populateExportMonthSelect() {
    const sortedKeys = [...monthsIndexCache.keys()].sort().reverse();
    exportMonthSelect.innerHTML = sortedKeys
        .map((key) => {
            const month = monthsIndexCache.get(key);
            const label = `${MONTH_NAMES[month.date.getMonth()]} ${month.date.getFullYear()}`;
            return `<option value="${key}">${label}</option>`;
        })
        .join("");
    exportMonthSelect.value = sortedKeys.includes(selectedMonthKey) ? selectedMonthKey : sortedKeys[0];
}

exportMonthBtn.onclick = () => {
    populateExportMonthSelect();
    exportMonthDialog.showModal();
};

closeExportMonthBtn.onclick = () => exportMonthDialog.close();

exportMonthForm.onsubmit = async (event) => {
    event.preventDefault();
    const key = exportMonthSelect.value;
    if (!key) return;

    const reportData = buildMonthReportData(key);
    if (!reportData) {
        alert("Brak danych do eksportu w tym miesiącu.");
        return;
    }

    const monthLabel = exportMonthSelect.options[exportMonthSelect.selectedIndex]?.textContent || key;
    const submitBtn = exportMonthForm.querySelector('button[type="submit"]');
    setStatusMessage(exportMonthMessage, "");
    submitBtn.disabled = true;

    try {
        await exportReport({
            rows: monthReportToRows(reportData),
            format: exportMonthFormat.value,
            baseFilename: `godziny-${key}`,
            shareTitle: `Godziny pracy — ${monthLabel}`,
            sheetName: "Godziny",
            buildPdf: () => buildMonthPdfBlob(reportData, monthLabel)
        });
        exportMonthDialog.close();
    } catch (err) {
        console.error(err);
        setStatusMessage(exportMonthMessage, "Nie udało się wygenerować pliku — sprawdź połączenie z internetem (Excel/PDF wymagają sieci).", false);
    } finally {
        submitBtn.disabled = false;
    }
};

function refreshHistoryView(entries) {
    dayTotalsCache = buildDayTotals(entries);
    monthsIndexCache = buildMonthsIndex(entries);
    vacationDatesCache = buildVacationDates(entries);
    sickLeaveDatesCache = buildSickLeaveDates(entries);
    sickLeaveRecordsCache = buildSickLeaveRecords(entries);
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
    settingsDialog.showModal();
}
settingsTabs.forEach((t) => { t.onclick = () => openSettingsDialog(t.dataset.tab); });

settingsBtn.onclick = () => openSettingsDialog("account");
closeSettingsBtn.onclick = () => settingsDialog.close();

accountBtn.onclick = () => {
    accountDialogEmail.textContent = accountEmail.textContent;
    if (employeeNumberCache) {
        accountDialogEmployeeNumber.textContent = `Nr pracownika: ${employeeNumberCache}`;
        accountDialogEmployeeNumber.style.display = "block";
    } else {
        accountDialogEmployeeNumber.style.display = "none";
    }
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

function openEditDialog({ original, date, start, end, breakMinutes, dateEditable = true }) {
    editingDate = original;
    const dateLabel = date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
    editDayTitle.textContent = dateEditable
        ? (original ? "Edytuj dzień" : "Dodaj dzień")
        : `${original ? "Edytuj dzień" : "Dodaj dzień"} — ${dateLabel}`;
    editDayDateField.style.display = dateEditable ? "" : "none";
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
    if (!vacationRangePicker.state.start) {
        const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        vacationRangePicker.setRange(today, today);
    } else {
        vacationRangePicker.render();
    }
    vacationDialog.showModal();
};

closeVacationBtn.onclick = () => vacationDialog.close();

vacationForm.onsubmit = async (event) => {
    event.preventDefault();
    const { start: rangeStart, end: rangeEnd } = vacationRangePicker.state;
    if (!rangeStart || !rangeEnd) {
        alert("Zaznacz zakres w kalendarzu (dla jednego dnia stuknij go dwukrotnie).");
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

function renderSickLeaveSummary() {
    const count = sickLeaveDatesCache.size;
    sickLeaveSummary.textContent = count === 0
        ? "Nie masz jeszcze zapisanych dni zwolnienia lekarskiego."
        : `Łącznie dni na zwolnieniu lekarskim: ${count}.`;
}

function renderSickLeaveHistory() {
    if (sickLeaveRecordsCache.length === 0) {
        sickLeaveHistoryBody.innerHTML = `<p class="hint">Nie masz jeszcze zapisanych dni zwolnienia lekarskiego.</p>`;
        return;
    }

    const yearCounts = new Map();
    sickLeaveRecordsCache.forEach(({ date }) => {
        const year = date.getFullYear();
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });
    const years = [...yearCounts.keys()].sort((a, b) => b - a);

    // Podsumowanie roczne jako jedna zwarta linijka (zamiast listy punktowanej) - kompaktowo
    // nawet przy wielu latach historii.
    const summaryHtml = years
        .map((year) => {
            const count = yearCounts.get(year);
            return `<strong>${year}</strong> — ${count} ${count === 1 ? "dzień" : "dni"}`;
        })
        .join(" · ");

    // Szczegoly grupowane wg miesiaca (rozwijane <details>) - przy duzej liczbie zwolnien
    // plaska lista bylaby nieczytelna, a tak od razu widac miesiac i rozwija sie na klikniecie.
    const monthGroups = new Map(); // "YYYY-MM" -> { date: Date (dowolny dzien z miesiaca), records: [] }
    sickLeaveRecordsCache.forEach((record) => {
        const mKey = monthKey(record.date);
        if (!monthGroups.has(mKey)) {
            monthGroups.set(mKey, { date: record.date, records: [] });
        }
        monthGroups.get(mKey).records.push(record);
    });

    const detailsHtml = [...monthGroups.keys()]
        .sort()
        .reverse()
        .map((mKey) => {
            const group = monthGroups.get(mKey);
            const monthLabel = `${MONTH_NAMES[group.date.getMonth()]} ${group.date.getFullYear()}`;
            // W nagłówku miesiąca jest już nazwa miesiąca i rok, więc kazdy dzien pokazujemy
            // krotko (numer + skrot dnia tygodnia) - pelna data w kazdej linijce (np. przy
            // calym miesiacu zwolnienia) robila z tego dlugi, nieczytelny bazgrol.
            const itemsHtml = group.records
                .slice()
                .sort((a, b) => a.date - b.date)
                .map(({ date, reason }) => {
                    const dow = CAL_WEEKDAY_LETTERS[(date.getDay() + 6) % 7];
                    return `<li><strong>${date.getDate()}</strong> <span class="hint">(${dow})</span>${reason ? ` — ${reason}` : ""}</li>`;
                })
                .join("");

            return `
                <details class="sick-history-month">
                    <summary>${monthLabel} (${group.records.length} ${group.records.length === 1 ? "dzień" : "dni"})</summary>
                    <ul class="changelog-list">${itemsHtml}</ul>
                </details>
            `;
        })
        .join("");

    sickLeaveHistoryBody.innerHTML = `
        <p class="hint">${summaryHtml}</p>
        <h3>Szczegóły</h3>
        ${detailsHtml}
    `;
}

openSickLeaveHistoryBtn.onclick = () => {
    renderSickLeaveHistory();
    sickLeaveHistoryDialog.showModal();
};

closeSickLeaveHistoryBtn.onclick = () => sickLeaveHistoryDialog.close();

sickLeaveBtn.onclick = () => {
    renderSickLeaveSummary();
    sickLeaveNoteInput.value = "";
    if (!sickLeaveRangePicker.state.start) {
        const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        sickLeaveRangePicker.setRange(today, today);
    } else {
        sickLeaveRangePicker.render();
    }
    sickLeaveDialog.showModal();
};

closeSickLeaveBtn.onclick = () => sickLeaveDialog.close();

sickLeaveForm.onsubmit = async (event) => {
    event.preventDefault();
    const { start: rangeStart, end: rangeEnd } = sickLeaveRangePicker.state;
    if (!rangeStart || !rangeEnd) {
        alert("Zaznacz zakres w kalendarzu (dla jednego dnia stuknij go dwukrotnie).");
        return;
    }

    const reason = sickLeaveNoteInput.value.trim();
    const note = reason ? `${SICK_LEAVE_NOTE_PREFIX}: ${reason}` : SICK_LEAVE_NOTE_PREFIX;

    const submitBtn = sickLeaveForm.querySelector('button[type="submit"]');
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
            note
        });
        day.setDate(day.getDate() + 1);
    }

    selectedMonthKey = monthKey(rangeStart);
    refreshHistoryView(await loadHistory());
    submitBtn.disabled = false;
    sickLeaveDialog.close();
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

function defaultRangeSummary(start, end) {
    if (start && end) {
        return `Zaznaczono: ${start.toLocaleDateString("pl-PL")} – ${end.toLocaleDateString("pl-PL")}`;
    }
    if (start) {
        return `Początek: ${start.toLocaleDateString("pl-PL")} — stuknij dzień końcowy.`;
    }
    return "Stuknij dzień początkowy zakresu.";
}

// Wspolny "kalendarz z zaznaczaniem zakresu" (stuknij dzien poczatkowy, potem koncowy) -
// uzywany zarowno przez "Dodaj caly tydzien" (tylko przeszlosc/dzisiaj), jak i "Urlop"
// (planowanie w przyszlosc, wiec allowFuture:true odblokowuje przyszle dni i miesiace).
function createRangePicker({ calendarEl, prevBtn, nextBtn, monthLabelEl, summaryEl, allowFuture = false, formatSummary = defaultRangeSummary }) {
    const state = { start: null, end: null, viewDate: new Date() };

    function render() {
        calendarEl.innerHTML = "";

        const y = state.viewDate.getFullYear();
        const m = state.viewDate.getMonth();
        const firstOfMonth = new Date(y, m, 1);
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

        monthLabelEl.textContent = firstOfMonth.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
        if (!allowFuture) {
            nextBtn.disabled = y === todayMidnight.getFullYear() && m === todayMidnight.getMonth();
        }

        const monthData = monthsIndexCache.get(monthKey(firstOfMonth));

        CAL_WEEKDAY_LETTERS.forEach((label) => {
            const head = document.createElement("div");
            head.className = "cal-weekday";
            head.textContent = label;
            calendarEl.appendChild(head);
        });

        const firstDow = (firstOfMonth.getDay() + 6) % 7;
        for (let i = 0; i < firstDow; i++) {
            const filler = document.createElement("div");
            filler.className = "cal-cell cal-cell--empty";
            calendarEl.appendChild(filler);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(y, m, d);
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "cal-cell";
            cell.textContent = String(d);
            cell.dataset.date = dateKey(date);

            if (!allowFuture && date > todayMidnight) {
                cell.classList.add("cal-cell--future");
            }
            if (date.getTime() === todayMidnight.getTime()) {
                cell.classList.add("cal-cell--today");
            }
            if (state.start && date.getTime() === state.start.getTime()) {
                cell.classList.add("cal-cell--range-start");
            }
            if (state.end && date.getTime() === state.end.getTime()) {
                cell.classList.add("cal-cell--range-end");
            }
            if (state.start && state.end && date > state.start && date < state.end) {
                cell.classList.add("cal-cell--range-mid");
            }
            if (monthData?.days.has(dateKey(date))) {
                cell.classList.add("cal-cell--has-data");
            }

            calendarEl.appendChild(cell);
        }

        summaryEl.textContent = formatSummary(state.start, state.end);
    }

    calendarEl.addEventListener("click", (event) => {
        const selector = allowFuture
            ? ".cal-cell:not(.cal-cell--empty)"
            : ".cal-cell:not(.cal-cell--empty):not(.cal-cell--future)";
        const cell = event.target.closest(selector);
        if (!cell) return;

        const [y, m, d] = cell.dataset.date.split("-").map(Number);
        const clicked = new Date(y, m - 1, d);

        if (!state.start || (state.start && state.end)) {
            state.start = clicked;
            state.end = null;
        } else if (clicked < state.start) {
            state.end = state.start;
            state.start = clicked;
        } else {
            state.end = clicked;
        }

        render();
    });

    prevBtn.onclick = () => {
        state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
        render();
    };

    nextBtn.onclick = () => {
        state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
        render();
    };

    return {
        state,
        render,
        setRange(start, end) {
            state.start = start;
            state.end = end;
            state.viewDate = new Date(start.getFullYear(), start.getMonth(), 1);
            render();
        }
    };
}

const weekRangePicker = createRangePicker({
    calendarEl: weekRangeCalendar,
    prevBtn: weekRangePrevBtn,
    nextBtn: weekRangeNextBtn,
    monthLabelEl: weekRangeMonthLabel,
    summaryEl: weekRangeSummary
});

// Urlop to planowanie w przyszlosc (allowFuture), a podsumowanie od razu pokazuje ile dni
// z puli urlopowej zajmie zaznaczony zakres i ile zostanie po zapisaniu - zeby bylo widac
// skutek decyzji zanim jeszcze klikniemy "Zapisz".
function formatVacationRangeSummary(start, end) {
    if (!start) return "Stuknij dzień początkowy urlopu.";
    if (!end) return `Początek: ${start.toLocaleDateString("pl-PL")} — stuknij dzień końcowy.`;

    let totalDays = 0;
    let chargeableDays = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
        totalDays += 1;
        if (isVacationChargeableDate(cursor)) chargeableDays += 1;
        cursor.setDate(cursor.getDate() + 1);
    }

    let text = `Zaznaczono: ${start.toLocaleDateString("pl-PL")} – ${end.toLocaleDateString("pl-PL")} `
        + `(${totalDays} ${totalDays === 1 ? "dzień" : "dni"}, ${chargeableDays} z puli urlopowej)`;

    const remaining = remainingVacationDays();
    if (remaining !== null) {
        text += ` · zostanie ${remaining - chargeableDays} dni`;
    }
    return text;
}

const vacationRangePicker = createRangePicker({
    calendarEl: vacationRangeCalendar,
    prevBtn: vacationRangePrevBtn,
    nextBtn: vacationRangeNextBtn,
    monthLabelEl: vacationRangeMonthLabel,
    summaryEl: vacationRangeSummary,
    allowFuture: true,
    formatSummary: formatVacationRangeSummary
});

const sickLeaveRangePicker = createRangePicker({
    calendarEl: sickLeaveRangeCalendar,
    prevBtn: sickLeaveRangePrevBtn,
    nextBtn: sickLeaveRangeNextBtn,
    monthLabelEl: sickLeaveRangeMonthLabel,
    summaryEl: sickLeaveRangeSummary,
    allowFuture: true
});

weekHoursBtn.onclick = () => {
    const { start, end } = previousWeekRange();
    weekRangePicker.setRange(start, end);
    weekHoursPreset.innerHTML = `<option value="">— wybierz —</option>${editDayPresetOptions}`;
    if (activeShiftCache) {
        weekHoursStart.value = activeShiftCache.start;
        weekHoursEnd.value = activeShiftCache.end;
    }
    weekHoursDialog.showModal();
};

closeWeekHoursBtn.onclick = () => weekHoursDialog.close();

weekHoursForm.onsubmit = async (event) => {
    event.preventDefault();
    const { start: rangeStart, end: rangeEnd } = weekRangePicker.state;
    if (!rangeStart || !rangeEnd) {
        alert("Zaznacz dzień początkowy i końcowy zakresu w kalendarzu.");
        return;
    }

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

// Czy dany dzien (dowolna data - przeszla, przyszla, z zapisanymi godzinami albo bez)
// wypada w Polsce wg skonfigurowanego cyklu zjazdow - uzywane do zaznaczania w kalendarzu
// miesiaca dni "w domu", niezaleznie od tego, czy zapisano dla nich jakiekolwiek godziny pracy.
function isDateInPolandCycle(date) {
    if (!polandCycleCache) return false;
    const { anchor, cycleDays, homeDays } = polandCycleCache;
    const anchorMidnight = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysSinceAnchor = daysBetween(anchorMidnight, dateMidnight);
    const cyclePos = ((daysSinceAnchor % cycleDays) + cycleDays) % cycleDays;
    return cyclePos < homeDays;
}

// Dzien urlopu zabiera pule urlopowa tylko jesli i tak bylby dniem roboczym - czyli nie jest
// weekendem ani dniem, ktory i tak wypada w Polsce wg cyklu zjazdow (ten dzien i tak przysluguje
// jako wolny, wiec urlop na niego nie idzie "z puli").
function isVacationChargeableDate(date) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return false;
    if (isDateInPolandCycle(date)) return false;
    return true;
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

// Windows nie renderuje wiekszosci flag emoji jako grafiki (pokazuje literowy kod kraju),
// wiec flagi PL/DE w karcie statusu rysujemy klasa CSS (jak w kalendarzu), a nie emoji -
// kompas zostaje emoji, bo to zwykly (nie-flagowy) emoji i dziala wszedzie bez problemu.
function setPolandStatusFlag(kind) {
    polandStatusFlag.classList.remove("psf--pl", "psf--de");
    if (kind === "pl" || kind === "de") {
        polandStatusFlag.classList.add(`psf--${kind}`);
        polandStatusFlag.textContent = "";
    } else {
        polandStatusFlag.textContent = "🧭";
    }
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

        setPolandStatusFlag("pl");
        polandStatusText.textContent = "Jesteś w Polsce (urlop)";
        polandCountdownText.textContent = daysUntilReturn === 0
            ? "Dziś wracasz do Niemiec"
            : `Wracasz do Niemiec za ${daysUntilReturn} ${daysUntilReturn === 1 ? "dzień" : "dni"} (urlop)`;
        updateVacationCountdown(todayMidnight, { suppress: true });
        return;
    }

    if (!polandCycleCache) {
        setPolandStatusFlag("compass");
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
        setPolandStatusFlag("pl");
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

    setPolandStatusFlag("de");
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

// Lista pobytow w Polsce (od-do, kalendarzowo) w najblizszych `daysAhead` dniach - do eksportu,
// np. zeby pokazac komus kiedy bedziemy w domu. Dzien liczy sie jako "w Polsce" gdy wypada w
// zwyklym cyklu zjazdow ALBO jest zaplanowanym urlopem - sasiadujace dni laczone sa w jeden
// ciagly zakres (np. urlop doklejony do normalnego zjazdu wydluza go, zamiast pokazywac osobno).
function polandStayRanges(daysAhead) {
    if (!polandCycleCache) return [];

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const rangeEnd = new Date(todayMidnight);
    rangeEnd.setDate(rangeEnd.getDate() + daysAhead);

    const ranges = [];
    let currentStart = null;
    let currentVacationDays = 0;
    const cursor = new Date(todayMidnight);

    while (cursor <= rangeEnd) {
        const isVacationDay = vacationDatesCache.has(dateKey(cursor));
        const isHome = isDateInPolandCycle(cursor) || isVacationDay;

        if (isHome) {
            if (!currentStart) currentStart = new Date(cursor);
            if (isVacationDay) currentVacationDays += 1;
        } else if (currentStart) {
            const stayEnd = new Date(cursor);
            stayEnd.setDate(stayEnd.getDate() - 1);
            ranges.push({ start: currentStart, end: stayEnd, vacationDays: currentVacationDays });
            currentStart = null;
            currentVacationDays = 0;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    if (currentStart) {
        const stayEnd = new Date(cursor);
        stayEnd.setDate(stayEnd.getDate() - 1);
        ranges.push({ start: currentStart, end: stayEnd, vacationDays: currentVacationDays });
    }

    return ranges;
}

exportPolandScheduleBtn.onclick = () => {
    if (!polandCycleCache) {
        alert("Najpierw skonfiguruj cykl zjazdów w szybkich akcjach → 🛠️ Konfiguracja.");
        return;
    }
    exportPolandScheduleDialog.showModal();
};

closeExportPolandScheduleBtn.onclick = () => exportPolandScheduleDialog.close();

function buildPolandScheduleRows(daysAhead) {
    const ranges = polandStayRanges(daysAhead);
    if (ranges.length === 0) return null;

    const rows = [["Od", "Do", "Dni w Polsce", "Powód"]];
    ranges.forEach(({ start, end, vacationDays }) => {
        const totalDays = daysBetween(start, end) + 1;
        rows.push([
            start.toLocaleDateString("pl-PL"),
            end.toLocaleDateString("pl-PL"),
            String(totalDays),
            vacationDays > 0 ? `Urlop — dlatego ${totalDays} dni w Polsce` : ""
        ]);
    });
    return rows;
}

async function buildPolandSchedulePdfBlob(rows, subtitle) {
    const doc = await createPdfDocument("portrait");
    const marginX = 36;
    const pageWidth = doc.internal.pageSize.getWidth();

    const y = drawPdfReportHeader(doc, marginX, subtitle);

    const usableWidth = pageWidth - marginX * 2;
    const columns = [
        { width: usableWidth * 0.22 },
        { width: usableWidth * 0.22 },
        { width: usableWidth * 0.16 },
        { width: usableWidth * 0.4 }
    ];

    drawPdfTable(doc, {
        columns,
        headerRow: rows[0],
        bodyRows: rows.slice(1),
        marginX,
        startY: y
    });

    return doc.output("blob");
}

exportPolandScheduleForm.onsubmit = async (event) => {
    event.preventDefault();

    const daysAhead = Number(exportPolandScheduleRange.value);
    const rows = buildPolandScheduleRows(daysAhead);
    if (!rows) {
        alert("Brak zjazdów w wybranym okresie.");
        return;
    }

    const rangeLabel = exportPolandScheduleRange.options[exportPolandScheduleRange.selectedIndex].textContent;
    const submitBtn = exportPolandScheduleForm.querySelector('button[type="submit"]');
    setStatusMessage(exportPolandScheduleMessage, "");
    submitBtn.disabled = true;

    try {
        await exportReport({
            rows,
            format: exportPolandScheduleFormat.value,
            baseFilename: `zjazdy-do-polski-${dateKey(new Date())}`,
            shareTitle: `Zjazdy do Polski — ${rangeLabel}`,
            sheetName: "Zjazdy",
            buildPdf: () => buildPolandSchedulePdfBlob(rows, `Zjazdy do Polski — ${rangeLabel}`)
        });
        exportPolandScheduleDialog.close();
    } catch (err) {
        console.error(err);
        setStatusMessage(exportPolandScheduleMessage, "Nie udało się wygenerować pliku — sprawdź połączenie z internetem (Excel/PDF wymagają sieci).", false);
    } finally {
        submitBtn.disabled = false;
    }
};

polandStatusCard.onclick = () => {
    if (!polandCycleCache) {
        openConfigDialog("poland");
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

    await refreshVacationAllowanceCache();

    await refreshEmployeeNumberCache();
    renderEmployeeNumberFooter();

    refreshHistoryView(await loadHistory());
}
