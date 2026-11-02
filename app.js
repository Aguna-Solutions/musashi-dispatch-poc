/* ============================================================================
   MUSASHI DISPATCH OS — POC
   Vanilla JavaScript state, rendering and interaction layer.

   Flow:
   1. Transporter sends vehicle + driver    -> status "Awaiting Dispatch"
   2. Musashi dispatch verifies at the gate -> captures destination, DL, bins, invoice
   3. Dispatch issues the GRN               -> status "Completed"
   4. Admin ledger and metrics update       -> ready for transporter billing
   ========================================================================== */

"use strict";

/* ------------------------------- Configuration ------------------------------ */
const STORAGE_KEY = "musashi-dispatch-poc-v1";
const STORAGE_VERSION = 3;
const MAX_ACTIVITY = 30;

/* ------------------------------ Access control ------------------------------ */
const SESSION_KEY = "musashi-dispatch-session-v1";

const ACCOUNTS = [
  {
    username: "stc",
    password: "demo1234",
    role: "transporter",
    transporterName: "STC Services",
    name: "STC Services",
    title: "Transporter Portal",
    initials: "ST",
  },
  {
    username: "dlv",
    password: "demo1234",
    role: "transporter",
    transporterName: "Delhivery Freight",
    name: "Delhivery Freight",
    title: "Transporter Portal",
    initials: "DV",
  },
  {
    username: "dispatch",
    password: "demo1234",
    role: "dispatch",
    name: "Musashi Dispatch",
    title: "Musashi Dispatch",
    initials: "MD",
  },
  {
    username: "admin",
    password: "demo1234",
    role: "admin",
    name: "Admin Office",
    title: "Admin Dashboard",
    initials: "AD",
  },
];

const ROLE_ACCESS = {
  transporter: ["transporter"],
  dispatch: ["dispatch"],
  admin: ["admin"],
};

const CUSTOMERS_SEED = [
  { id: 1, name: "Maruti Suzuki", code: "MSIL", city: "Manesar, Haryana" },
  { id: 2, name: "Hero Honda", code: "HH", city: "Gurugram, Haryana" },
  { id: 3, name: "FCC Clutch India", code: "FCC", city: "Tapukara, Rajasthan" },
];

const TRANSPORTERS_SEED = [
  { id: 1, name: "STC Services", code: "STC", currentSequence: 24 },
  { id: 2, name: "Delhivery Freight", code: "DLV", currentSequence: 18 },
];

const COMPLETED_SEED = [
  {
    dispatchId: "D-1001",
    transporterName: "STC Services",
    vehicleNo: "HR47H5590",
    driverName: "Ramesh Kumar",
    driverId: "DL-HR-2015-8821",
    customer: "FCC Clutch India",
    status: "Completed",
    binsLoaded: 240,
    invoiceNo: "8261110404",
    grnNumber: "STC-0021",
    date: "2026-10-09",
    completedAt: "2026-10-09T17:42:00+05:30",
  },
  {
    dispatchId: "D-0998",
    transporterName: "STC Services",
    vehicleNo: "HR47E1439",
    driverName: "Suresh Singh",
    driverId: "DL-HR-2019-4417",
    customer: "Hero Honda",
    status: "Completed",
    binsLoaded: 186,
    invoiceNo: "8261110398",
    grnNumber: "STC-0024",
    date: "2026-10-28",
    completedAt: "2026-10-28T18:05:00+05:30",
  },
  {
    dispatchId: "D-0997",
    transporterName: "Delhivery Freight",
    vehicleNo: "HR26DK4521",
    driverName: "Imran Khan",
    driverId: "DL-HR-2018-9931",
    customer: "Maruti Suzuki",
    status: "Completed",
    binsLoaded: 312,
    invoiceNo: "8261110391",
    grnNumber: "DLV-0018",
    date: "2026-10-28",
    completedAt: "2026-10-28T15:20:00+05:30",
  },
  {
    dispatchId: "D-0995",
    transporterName: "STC Services",
    vehicleNo: "HR47C1187",
    driverName: "Mahesh Kumar",
    driverId: "DL-HR-2017-7712",
    customer: "FCC Clutch India",
    status: "Completed",
    binsLoaded: 278,
    invoiceNo: "8261110384",
    grnNumber: "STC-0020",
    date: "2026-10-06",
    completedAt: "2026-10-06T16:55:00+05:30",
  },
  {
    dispatchId: "D-0993",
    transporterName: "Delhivery Freight",
    vehicleNo: "HR55AB1234",
    driverName: "Arjun Nair",
    driverId: "DL-HR-2016-5540",
    customer: "Maruti Suzuki",
    status: "Completed",
    binsLoaded: 355,
    invoiceNo: "8261110377",
    grnNumber: "DLV-0017",
    date: "2026-10-26",
    completedAt: "2026-10-26T19:12:00+05:30",
  },
  {
    dispatchId: "D-0990",
    transporterName: "STC Services",
    vehicleNo: "HR47F5782",
    driverName: "Vikram Yadav",
    driverId: "DL-HR-2021-3320",
    customer: "Hero Honda",
    status: "Completed",
    binsLoaded: 164,
    invoiceNo: "8261110369",
    grnNumber: "STC-0023",
    date: "2026-10-24",
    completedAt: "2026-10-24T14:35:00+05:30",
  },
  {
    dispatchId: "D-0987",
    transporterName: "Delhivery Freight",
    vehicleNo: "HR26CZ9087",
    driverName: "Sandeep Rana",
    driverId: "DL-HR-2014-2289",
    customer: "FCC Clutch India",
    status: "Completed",
    binsLoaded: 204,
    invoiceNo: "8261110352",
    grnNumber: "DLV-0015",
    date: "2026-10-03",
    completedAt: "2026-10-03T17:10:00+05:30",
  },
  {
    dispatchId: "D-0984",
    transporterName: "STC Services",
    vehicleNo: "HR47B7721",
    driverName: "Deepak Sharma",
    driverId: "DL-HR-2013-6645",
    customer: "Maruti Suzuki",
    status: "Completed",
    binsLoaded: 298,
    invoiceNo: "8261110344",
    grnNumber: "STC-0022",
    date: "2026-10-18",
    completedAt: "2026-10-18T16:25:00+05:30",
  },
  {
    dispatchId: "D-0981",
    transporterName: "Delhivery Freight",
    vehicleNo: "HR55AE6612",
    driverName: "Naveen Yadav",
    driverId: "DL-HR-2020-1187",
    customer: "Maruti Suzuki",
    status: "Completed",
    binsLoaded: 341,
    invoiceNo: "8261110331",
    grnNumber: "DLV-0016",
    date: "2026-10-15",
    completedAt: "2026-10-15T15:50:00+05:30",
  },
];

/* --------------------------------- Utilities -------------------------------- */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatISODate(value) {
  const iso = String(value ?? "").slice(0, 10);
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return "—";
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Date.now() - time;

  if (diff < 45 * 1000) return "just now";
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
  return formatISODate(String(value).slice(0, 10));
}

function formatGRN(code, sequence) {
  return `${code}-${pad(sequence, 4)}`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const totalMinutes = Math.floor(milliseconds / 60000);
  if (totalMinutes < 1) return "just now";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}h ${pad(totalMinutes % 60)}m`;
}

function formatTime(value) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "—";
  return time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/* --------------------------------- SVG icons -------------------------------- */
const ICONS = {
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v10H3z"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17.5" cy="18.5" r="1.6"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/><path d="M4 8.5 12 13l8-4.5M12 13v7"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`,
};

/* ----------------------------------- State ---------------------------------- */
function seedState() {
  const now = Date.now();
  const today = todayISO();
  const nominatedAt = (minutesAgo) => new Date(now - minutesAgo * 60000).toISOString();

  const waitingSeeds = [
    {
      dispatchId: "D-1002",
      transporterName: "STC Services",
      vehicleNo: "HR47E1439",
      driverName: "Suresh Singh",
      driverId: null,
      customer: null,
      status: "Awaiting Dispatch",
      binsLoaded: null,
      invoiceNo: null,
      grnNumber: null,
      date: today,
      nominatedAt: nominatedAt(38),
    },
    {
      dispatchId: "D-1003",
      transporterName: "Delhivery Freight",
      vehicleNo: "HR26DK4521",
      driverName: "Imran Khan",
      driverId: null,
      customer: null,
      status: "Awaiting Dispatch",
      binsLoaded: null,
      invoiceNo: null,
      grnNumber: null,
      date: today,
      nominatedAt: nominatedAt(71),
    },
    {
      dispatchId: "D-1004",
      transporterName: "Delhivery Freight",
      vehicleNo: "HR47F5782",
      driverName: "Vikram Yadav",
      driverId: null,
      customer: null,
      status: "Awaiting Dispatch",
      binsLoaded: null,
      invoiceNo: null,
      grnNumber: null,
      date: today,
      nominatedAt: nominatedAt(96),
    },
    {
      dispatchId: "D-1005",
      transporterName: "STC Services",
      vehicleNo: "HR47C1187",
      driverName: "Mahesh Kumar",
      driverId: null,
      customer: null,
      status: "Awaiting Dispatch",
      binsLoaded: null,
      invoiceNo: null,
      grnNumber: null,
      date: today,
      nominatedAt: nominatedAt(124),
    },
  ];

  const dispatches = [
    ...COMPLETED_SEED.map((dispatch) => ({ ...dispatch })),
    ...waitingSeeds,
  ];

  const activity = [
    ...waitingSeeds.map((dispatch) => ({
      id: makeId(),
      type: "nominate",
      message: `Vehicle ${dispatch.vehicleNo} sent to dispatch by ${dispatch.transporterName}.`,
      at: dispatch.nominatedAt,
    })),
    {
      id: makeId(),
      type: "grn",
      message: "GRN STC-0024 issued · 186 bins for Hero Honda.",
      at: "2026-10-28T18:05:00+05:30",
    },
    {
      id: makeId(),
      type: "grn",
      message: "GRN DLV-0018 issued · 312 bins for Maruti Suzuki.",
      at: "2026-10-28T15:20:00+05:30",
    },
    {
      id: makeId(),
      type: "grn",
      message: "GRN STC-0021 issued · 240 bins for FCC Clutch India.",
      at: "2026-10-09T17:42:00+05:30",
    },
  ];

  return {
    version: STORAGE_VERSION,
    customers: CUSTOMERS_SEED.map((customer) => ({ ...customer })),
    transporters: TRANSPORTERS_SEED.map((transporter) => ({ ...transporter })),
    dispatches,
    activity,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();

    const parsed = JSON.parse(raw);
    const valid = parsed
      && parsed.version === STORAGE_VERSION
      && Array.isArray(parsed.dispatches)
      && Array.isArray(parsed.customers)
      && Array.isArray(parsed.transporters);

    if (!valid) return seedState();

    if (!Array.isArray(parsed.activity)) parsed.activity = [];
    return parsed;
  } catch (error) {
    console.warn("Could not read saved dispatch data. Starting from seed data.", error);
    return seedState();
  }
}

let state = loadState();

/* Runtime-only UI state (not persisted) */
let activeDispatchId = null;
let lastIssuedDispatchId = null;
let lastFocusedElement = null;
let modalCloseTimer = null;
let modalSession = 0;

const adminFilters = {
  search: "",
  customer: "",
  transporter: "",
};

/* Signed-in demo account for this tab (null while the login screen is showing) */
let currentUser = null;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save dispatch data to localStorage.", error);
  }
}

function pushActivity(type, message) {
  state.activity.unshift({ id: makeId(), type, message, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, MAX_ACTIVITY);
}

/* -------------------------------- DOM handles ------------------------------- */
const dom = {
  loginScreen: $("#loginScreen"),
  appShell: $("#appShell"),
  loginForm: $("#loginForm"),
  loginUser: $("#loginUser"),
  loginPass: $("#loginPass"),
  loginError: $("#loginError"),
  loginSubmit: $("#loginSubmit"),
  roleOptions: $$("[data-demo-user]"),
  logoutBtn: $("#logoutBtn"),
  userAvatar: $("#userAvatar"),
  userName: $("#userName"),
  userRole: $("#userRole"),

  navItems: $$(".nav-item"),
  views: $$(".view"),
  viewCrumb: $("#viewCrumb"),
  clock: $("#liveClock"),
  navGateBadge: $("#navGateBadge"),
  navAdminBadge: $("#navAdminBadge"),

  transporterForm: $("#nominateForm"),
  vehicleNo: $("#vehicleNo"),
  driverName: $("#driverName"),
  transporterWaitingCount: $("#transporterWaitingCount"),
  transporterGrnCount: $("#transporterGrnCount"),
  queueCountPill: $("#queueCountPill"),
  transporterQueue: $("#transporterQueue"),
  queueSentToday: $("#queueSentToday"),
  queueLongestWait: $("#queueLongestWait"),
  queueHealth: $("#queueHealth"),
  queueNextGrn: $("#queueNextGrn"),
  transporterTrips: $("#transporterTrips"),
  transporterTripsCount: $("#transporterTripsCount"),

  dispatchWaitingCount: $("#dispatchWaitingCount"),
  dispatchTodayCount: $("#dispatchTodayCount"),
  waitingCountLabel: $("#waitingCountLabel"),
  waitingGrid: $("#waitingGrid"),
  recentGrnList: $("#recentGrnList"),
  ruleNextGrn: $("#ruleNextGrn"),
  lastDispatchPanel: $("#lastDispatchPanel"),
  lastGrn: $("#lastGrn"),
  lastGrnMeta: $("#lastGrnMeta"),

  metricCompleted: $("#metricCompleted"),
  metricBins: $("#metricBins"),
  metricActive: $("#metricActive"),
  metricAvgBins: $("#metricAvgBins"),
  metricToday: $("#metricToday"),
  metricTransporters: $("#metricTransporters"),
  adminSearch: $("#adminSearch"),
  filterCustomer: $("#filterCustomer"),
  filterTransporter: $("#filterTransporter"),
  completedBody: $("#completedBody"),
  ledgerCountPill: $("#ledgerCountPill"),
  tableCount: $("#tableCount"),
  customerLedger: $("#customerLedger"),
  activityList: $("#activityList"),

  modalBackdrop: $("#dispatchModal"),
  modal: $("#dispatchModal .modal"),
  modalClose: $("#modalClose"),
  modalDispatchId: $("#modalDispatchId"),
  modalVehicle: $("#modalVehicle"),
  modalTransporter: $("#modalTransporter"),
  modalDriver: $("#modalDriver"),
  modalGrnPreview: $("#modalGrnPreview"),
  modalSequenceNote: $("#modalSequenceNote"),
  dispatchForm: $("#dispatchForm"),
  dispatchCustomer: $("#dispatchCustomer"),
  dispatchDriverId: $("#dispatchDriverId"),
  binsLoaded: $("#binsLoaded"),
  invoiceNo: $("#invoiceNo"),
  cancelDispatchBtn: $("#cancelDispatchBtn"),

  toastStack: $("#toastStack"),
};

/* -------------------------------- Data helpers ------------------------------ */
function getWaitingDispatches() {
  return state.dispatches
    .filter((dispatch) => dispatch.status === "Awaiting Dispatch")
    .sort((a, b) => new Date(a.nominatedAt || a.date) - new Date(b.nominatedAt || b.date));
}

function getTransporterWaitingDispatches(transporterName) {
  return getWaitingDispatches().filter((dispatch) => dispatch.transporterName === transporterName);
}

function getTransporterCompletedDispatches(transporterName) {
  return getCompletedDispatches().filter((dispatch) => dispatch.transporterName === transporterName);
}

function getCompletedDispatches() {
  return state.dispatches
    .filter((dispatch) => dispatch.status === "Completed")
    .sort((a, b) => {
      const aTime = new Date(a.completedAt || `${a.date}T00:00:00`).getTime();
      const bTime = new Date(b.completedAt || `${b.date}T00:00:00`).getTime();
      return bTime - aTime;
    });
}

function getCustomerByName(name) {
  return state.customers.find((customer) => customer.name === name);
}

function getCustomerCode(name) {
  return getCustomerByName(name)?.code || "CUST";
}

function getTransporterByName(name) {
  return state.transporters.find((transporter) => transporter.name === name);
}

function getTransporterCode(name) {
  return getTransporterByName(name)?.code || "CARR";
}

function nextDispatchId() {
  const highest = state.dispatches.reduce((max, dispatch) => {
    const numeric = Number(String(dispatch.dispatchId).replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 1000);
  return `D-${highest + 1}`;
}

/* -------------------------------- Navigation -------------------------------- */
const VIEW_META = {
  transporter: { crumb: "Transporter Portal", title: "Transporter Portal" },
  dispatch: { crumb: "Musashi Dispatch Portal", title: "Musashi Dispatch Portal" },
  admin: { crumb: "Admin Dashboard", title: "Admin Dashboard" },
};

function switchView(view, { updateHash = true, scroll = true } = {}) {
  if (!VIEW_META[view]) return;

  if (!currentUser || !canAccess(view)) {
    showToast({
      title: "Access restricted",
      message: "Your role does not have access to this workspace.",
      variant: "error",
    });
    return;
  }

  dom.navItems.forEach((item) => {
    const isActive = item.dataset.view === view;
    item.classList.toggle("is-active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  dom.views.forEach((section) => {
    const isActive = section.id === `view-${view}`;
    section.classList.toggle("is-active", isActive);
    section.setAttribute("aria-hidden", String(!isActive));
  });

  dom.viewCrumb.textContent = VIEW_META[view].crumb;
  document.title = `${VIEW_META[view].title} · Musashi Dispatch`;

  if (updateHash) {
    try {
      history.replaceState(null, "", `#${view}`);
    } catch (error) {
      /* hash updates are non-critical */
    }
  }

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ----------------------------------- Auth ----------------------------------- */
function canAccess(view) {
  if (!currentUser) return false;
  return (ROLE_ACCESS[currentUser.role] || []).includes(view);
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return ACCOUNTS.find((account) => account.username === data?.username) || null;
  } catch (error) {
    return null;
  }
}

function showLoginError(message) {
  dom.loginError.textContent = message;
  dom.loginError.hidden = false;
}

function applyRoleChrome() {
  const allowed = ROLE_ACCESS[currentUser.role] || [];

  dom.navItems.forEach((item) => {
    item.hidden = !allowed.includes(item.dataset.view);
  });

  dom.userAvatar.textContent = currentUser.initials;
  dom.userName.textContent = currentUser.name;
  dom.userRole.textContent = currentUser.title;
}

function showLogin() {
  currentUser = null;
  dom.appShell.hidden = true;
  dom.loginScreen.hidden = false;

  closeDispatchModal({ restoreFocus: false });
  document.body.classList.remove("modal-open");

  dom.loginError.hidden = true;
  dom.loginError.textContent = "";
  dom.loginUser.value = "";
  dom.loginPass.value = "";
  dom.roleOptions.forEach((option) => option.classList.remove("is-selected"));

  document.title = "Sign in · Musashi Dispatch";
  try {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch (error) {
    /* hash cleanup is non-critical in the POC */
  }

  window.setTimeout(() => dom.loginUser.focus(), 60);
}

function showApp() {
  const allowed = ROLE_ACCESS[currentUser.role] || [];
  const hashView = window.location.hash.replace("#", "");
  const target = allowed.includes(hashView) ? hashView : allowed[0];

  dom.loginScreen.hidden = true;
  dom.appShell.hidden = false;
  applyRoleChrome();

  switchView(target, { updateHash: true, scroll: false });
  renderAll();
  window.scrollTo({ top: 0 });
}

function handleLogin(event) {
  event.preventDefault();

  const username = dom.loginUser.value.trim().toLowerCase();
  const password = dom.loginPass.value;
  dom.loginError.hidden = true;

  if (!username || !password) {
    showLoginError("Enter a username and password to continue.");
    (username ? dom.loginPass : dom.loginUser).focus();
    return;
  }

  const account = ACCOUNTS.find((item) => item.username === username);
  if (!account || account.password !== password) {
    showLoginError("Incorrect username or password. Pick a demo workspace to fill valid credentials.");
    dom.loginPass.select();
    return;
  }

  currentUser = account;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: account.username, signedInAt: Date.now() }));
  } catch (error) {
    console.warn("Could not persist the demo session.", error);
  }

  showApp();
  showToast({
    title: `Signed in as ${account.name}`,
    message: `You have access to the ${account.title}.`,
    variant: "success",
  });
}

function handleLogout() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn("Could not clear the demo session.", error);
  }

  showLogin();
  showToast({
    title: "Signed out",
    message: "The demo session for this tab has ended.",
    variant: "info",
  });
}

/* --------------------------------- Rendering -------------------------------- */
function renderAll() {
  renderChrome();
  renderTransporterView();
  renderDispatchView();
  renderAdminView();
}

function renderChrome() {
  const waitingCount = getWaitingDispatches().length;
  const completedCount = getCompletedDispatches().length;

  dom.navGateBadge.textContent = waitingCount;
  dom.navGateBadge.hidden = waitingCount === 0;

  dom.navAdminBadge.textContent = completedCount;
  dom.navAdminBadge.hidden = completedCount === 0;
}

function renderTransporterView() {
  const carrier = currentUser?.role === "transporter" ? currentUser.transporterName : null;
  const waiting = carrier ? getTransporterWaitingDispatches(carrier) : getWaitingDispatches();
  const completed = carrier ? getTransporterCompletedDispatches(carrier) : getCompletedDispatches();

  dom.transporterWaitingCount.textContent = waiting.length;
  dom.transporterGrnCount.textContent = completed.length;
  dom.queueCountPill.textContent = `${waiting.length} waiting`;

  /* Gate pulse: compact operational summary under the live queue */
  const sentToday = waiting.filter((dispatch) => dispatch.date === todayISO()).length;
  dom.queueSentToday.textContent = sentToday;

  if (waiting.length > 0) {
    const oldestWait = Date.now() - new Date(waiting[0].nominatedAt || waiting[0].date).getTime();
    dom.queueLongestWait.textContent = formatDuration(oldestWait);

    const nextTransporter = getTransporterByName(carrier || waiting[0].transporterName);
    dom.queueNextGrn.textContent = nextTransporter
      ? formatGRN(nextTransporter.code, nextTransporter.currentSequence + 1)
      : "—";
  } else {
    dom.queueLongestWait.textContent = "—";
    const nextTransporter = getTransporterByName(carrier);
    dom.queueNextGrn.textContent = nextTransporter
      ? formatGRN(nextTransporter.code, nextTransporter.currentSequence + 1)
      : "—";
  }

  const health = waiting.length === 0
    ? { label: "Clear", state: "smooth" }
    : waiting.length <= 2
      ? { label: "Smooth", state: "smooth" }
      : waiting.length <= 4
        ? { label: "Steady", state: "steady" }
        : { label: "Busy", state: "busy" };

  dom.queueHealth.textContent = health.label;
  dom.queueHealth.dataset.state = health.state;

  /* Completed trips for this carrier */
  dom.transporterTripsCount.textContent = `${completed.length} ${completed.length === 1 ? "trip" : "trips"}`;

  if (completed.length === 0) {
    dom.transporterTrips.innerHTML = `
      <div class="empty-state" style="border:0;background:transparent;padding:24px 6px;">
        <span class="empty-icon">${ICONS.box}</span>
        <h3>No completed trips yet</h3>
        <p>Trips appear here once dispatch issues the GRN.</p>
      </div>`;
  } else {
    dom.transporterTrips.innerHTML = completed.slice(0, 5).map((dispatch) => `
      <div class="recent-item">
        <div class="recent-main">
          <span class="grn-badge">${escapeHtml(dispatch.grnNumber)}</span>
          <span class="recent-customer">${escapeHtml(dispatch.vehicleNo)} · ${escapeHtml(dispatch.customer)}</span>
        </div>
        <div class="recent-meta">
          <strong>${formatCount(dispatch.binsLoaded)} bins</strong>
          <span>${escapeHtml(formatISODate(dispatch.date))}</span>
        </div>
      </div>
    `).join("");
  }

  if (waiting.length === 0) {
    dom.transporterQueue.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${ICONS.truck}</span>
        <h3>No vehicles sent yet</h3>
        <p>Vehicles you send to dispatch will appear here.</p>
      </div>`;
    return;
  }

  dom.transporterQueue.innerHTML = waiting.map((dispatch) => `
    <div class="queue-row">
      <span class="queue-avatar">${ICONS.truck}</span>
      <div class="queue-info">
        <strong>${escapeHtml(dispatch.vehicleNo)}</strong>
        <span>${escapeHtml(dispatch.driverName)} · Awaiting dispatch</span>
      </div>
      <span class="queue-time">${escapeHtml(formatRelative(dispatch.nominatedAt))}</span>
    </div>
  `).join("");
}

function renderDispatchView() {
  const waiting = getWaitingDispatches();
  const completed = getCompletedDispatches();
  const today = todayISO();
  const completedToday = completed.filter((dispatch) => dispatch.date === today).length;

  dom.dispatchWaitingCount.textContent = waiting.length;
  dom.dispatchTodayCount.textContent = completedToday;
  dom.waitingCountLabel.textContent = `${waiting.length} waiting`;

  if (waiting.length === 0) {
    dom.waitingGrid.innerHTML = `
      <div class="empty-state empty-state--wide">
        <span class="empty-icon">${ICONS.box}</span>
        <h3>No vehicles waiting</h3>
        <p>Vehicles sent from transporter portals will land here in real time.</p>
      </div>`;
  } else {
    dom.waitingGrid.innerHTML = waiting.map((dispatch) => vehicleCard(dispatch)).join("");
  }

  /* Recent GRNs rail */
  if (completed.length === 0) {
    dom.recentGrnList.innerHTML = `
      <div class="empty-state" style="border:0;background:transparent;padding:24px 6px;">
        <span class="empty-icon">${ICONS.box}</span>
        <h3>No GRNs yet</h3>
        <p>Completed loads will show their generated GRNs here.</p>
      </div>`;
  } else {
    dom.recentGrnList.innerHTML = completed.slice(0, 4).map((dispatch) => `
      <div class="recent-item">
        <div class="recent-main">
          <span class="grn-badge">${escapeHtml(dispatch.grnNumber)}</span>
          <span class="recent-customer">${escapeHtml(dispatch.customer)}</span>
        </div>
        <div class="recent-meta">
          <strong>${formatCount(dispatch.binsLoaded)} bins</strong>
          <span>${escapeHtml(formatISODate(dispatch.date))}</span>
        </div>
      </div>
    `).join("");
  }

  /* Next GRN preview for the oldest waiting vehicle */
  if (waiting.length > 0) {
    const transporter = getTransporterByName(waiting[0].transporterName);
    dom.ruleNextGrn.textContent = transporter
      ? formatGRN(transporter.code, transporter.currentSequence + 1)
      : "—";
  } else {
    dom.ruleNextGrn.textContent = "—";
  }

  renderLastIssuedDispatch();
}

function vehicleCard(dispatch) {
  return `
    <article class="vehicle-card">
      <div class="vehicle-card-top">
        <span class="plate"><span class="plate-dot"></span>${escapeHtml(dispatch.vehicleNo)}</span>
        <span class="status-pill status-pill--waiting">
          <span class="status-dot status-dot--sm"></span>Awaiting dispatch
        </span>
      </div>

      <div class="vehicle-dest vehicle-dest--pending">
        <span class="code-chip code-chip--pending">TBD</span>
        <div>
          <strong>Destination pending</strong>
          <span>Dispatch records customer, DL and invoice at the gate</span>
        </div>
      </div>

      <dl class="vehicle-meta">
        <div><dt>Transporter</dt><dd>${escapeHtml(dispatch.transporterName)}</dd></div>
        <div><dt>Driver</dt><dd>${escapeHtml(dispatch.driverName)}</dd></div>
        <div><dt>Driver ID</dt><dd class="mono">Verify at gate</dd></div>
        <div><dt>Sent</dt><dd>${escapeHtml(formatRelative(dispatch.nominatedAt))}</dd></div>
      </dl>

      <div class="vehicle-actions">
        <span class="vehicle-id mono">${escapeHtml(dispatch.dispatchId)}</span>
        <button class="btn btn-primary btn-sm" type="button" data-process="${escapeHtml(dispatch.dispatchId)}">
          Verify &amp; dispatch
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </article>
  `;
}

function renderLastIssuedDispatch() {
  if (!lastIssuedDispatchId) {
    dom.lastDispatchPanel.hidden = true;
    return;
  }

  const dispatch = state.dispatches.find((item) => item.dispatchId === lastIssuedDispatchId);
  if (!dispatch || dispatch.status !== "Completed") {
    dom.lastDispatchPanel.hidden = true;
    return;
  }

  dom.lastGrn.textContent = dispatch.grnNumber;
  dom.lastGrnMeta.textContent = `${dispatch.vehicleNo} · ${formatCount(dispatch.binsLoaded)} bins → ${dispatch.customer} · invoice ${dispatch.invoiceNo}`;
  dom.lastDispatchPanel.hidden = false;
}

function renderAdminView() {
  const completed = getCompletedDispatches();
  const waitingCount = getWaitingDispatches().length;
  const totalBins = completed.reduce((sum, dispatch) => sum + (Number(dispatch.binsLoaded) || 0), 0);
  const averageBins = completed.length ? Math.round(totalBins / completed.length) : 0;
  const today = todayISO();
  const completedToday = completed.filter((dispatch) => dispatch.date === today).length;
  const transportersUsed = new Set(completed.map((dispatch) => dispatch.transporterName)).size;

  dom.metricCompleted.textContent = formatCount(completed.length);
  dom.metricBins.textContent = formatCount(totalBins);
  dom.metricActive.textContent = formatCount(waitingCount);
  dom.metricAvgBins.textContent = formatCount(averageBins);
  dom.metricToday.textContent = formatCount(completedToday);
  dom.metricTransporters.textContent = formatCount(transportersUsed);
  dom.ledgerCountPill.textContent = `${completed.length} ${completed.length === 1 ? "trip" : "trips"}`;

  renderAdminTable();
  renderTransporterLedger();
  renderActivity();
}

function getFilteredCompletedDispatches() {
  const search = adminFilters.search.trim().toLowerCase();

  return getCompletedDispatches().filter((dispatch) => {
    if (adminFilters.customer && dispatch.customer !== adminFilters.customer) return false;
    if (adminFilters.transporter && dispatch.transporterName !== adminFilters.transporter) return false;
    if (!search) return true;

    const haystack = [
      dispatch.dispatchId,
      dispatch.grnNumber,
      dispatch.vehicleNo,
      dispatch.invoiceNo,
      dispatch.driverName,
      dispatch.customer,
      dispatch.transporterName,
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });
}

function renderAdminTable() {
  const completed = getCompletedDispatches();
  const filtered = getFilteredCompletedDispatches();

  if (filtered.length === 0) {
    dom.completedBody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state" style="border:0;background:transparent;padding:38px 16px;">
            <span class="empty-icon">${ICONS.box}</span>
            <h3>No matching dispatches</h3>
            <p>Adjust the search or filters to see completed trips.</p>
          </div>
        </td>
      </tr>`;
  } else {
    dom.completedBody.innerHTML = filtered.map((dispatch) => {
      const customer = getCustomerByName(dispatch.customer);
      const code = customer?.code || "CUST";

      return `
        <tr>
          <td>
            <span class="date-cell">
              <strong>${escapeHtml(formatISODate(dispatch.date))}</strong>
              <small>completed</small>
            </span>
          </td>
          <td><span class="mono">${escapeHtml(dispatch.dispatchId)}</span></td>
          <td>
            <span class="transporter-cell">
              <span class="transporter-dot"></span>${escapeHtml(dispatch.transporterName)}
            </span>
          </td>
          <td><span class="vehicle-cell">${escapeHtml(dispatch.vehicleNo)}</span></td>
          <td>
            <span class="driver-cell">
              <strong>${escapeHtml(dispatch.driverName || "—")}</strong>
              <small>${escapeHtml(dispatch.driverId || "—")}</small>
            </span>
          </td>
          <td>
            <span class="route-cell">
              <span class="code-chip">${escapeHtml(code)}</span>
              <span>${escapeHtml(dispatch.customer)}</span>
            </span>
          </td>
          <td><span class="invoice-cell">${escapeHtml(dispatch.invoiceNo || "—")}</span></td>
          <td class="num"><span class="bins-pill">${formatCount(dispatch.binsLoaded)}</span></td>
          <td><span class="grn-badge">${escapeHtml(dispatch.grnNumber)}</span></td>
          <td><span class="time-cell">${escapeHtml(formatTime(dispatch.completedAt))}</span></td>
        </tr>
      `;
    }).join("");
  }

  dom.tableCount.textContent = `Showing ${filtered.length} of ${completed.length} ${completed.length === 1 ? "trip" : "trips"}`;
}

function renderTransporterLedger() {
  const completed = getCompletedDispatches();
  const maxSequence = Math.max(...state.transporters.map((transporter) => Number(transporter.currentSequence) || 0), 1);

  dom.customerLedger.innerHTML = state.transporters.map((transporter) => {
    const sequence = Number(transporter.currentSequence) || 0;
    const trips = completed.filter((dispatch) => dispatch.transporterName === transporter.name);
    const binCount = trips.reduce((sum, dispatch) => sum + (Number(dispatch.binsLoaded) || 0), 0);
    const lastGRN = sequence > 0 ? formatGRN(transporter.code, sequence) : "—";
    const nextGRN = formatGRN(transporter.code, sequence + 1);
    const width = Math.max(5, Math.round((sequence / maxSequence) * 100));

    return `
      <div class="sequence-row">
        <div class="sequence-top">
          <span class="code-chip">${escapeHtml(transporter.code)}</span>
          <div class="sequence-customer">
            <strong>${escapeHtml(transporter.name)}</strong>
            <small>${trips.length} trip${trips.length === 1 ? "" : "s"} · ${formatCount(binCount)} bins</small>
          </div>
          <div class="sequence-next">
            <span>Next GRN</span>
            <strong>${escapeHtml(nextGRN)}</strong>
          </div>
        </div>
        <div class="sequence-bar"><span style="width:${width}%"></span></div>
        <div class="sequence-meta">
          <span>Last issued <b>${escapeHtml(lastGRN)}</b></span>
          <span>Sequence <b>${sequence}</b></span>
        </div>
      </div>
    `;
  }).join("");
}

function renderActivity() {
  const items = [...state.activity]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 7);

  if (items.length === 0) {
    dom.activityList.innerHTML = `
      <div class="empty-state" style="border:0;background:transparent;padding:24px 6px;">
        <span class="empty-icon">${ICONS.info}</span>
        <h3>No activity yet</h3>
        <p>Vehicle requests and GRN generation will be recorded here.</p>
      </div>`;
    return;
  }

  dom.activityList.innerHTML = items.map((item) => {
    const message = escapeHtml(item.message).replace(/\b(GRN [A-Z0-9-]+)/g, "<b>$1</b>");
    return `
      <div class="activity-item ${item.type === "grn" ? "activity-item--grn" : ""}">
        <span class="activity-dot" aria-hidden="true"></span>
        <div class="activity-body">
          <p>${message}</p>
          <span class="activity-time">${escapeHtml(formatRelative(item.at))}</span>
        </div>
      </div>
    `;
  }).join("");
}

/* ---------------------------------- Selects --------------------------------- */
function populateSelects() {
  const customerOptions = state.customers.map((customer) => `
    <option value="${escapeHtml(customer.name)}">${escapeHtml(customer.name)} · ${escapeHtml(customer.code)}</option>
  `).join("");

  dom.dispatchCustomer.innerHTML = `
    <option value="">Select destination customer</option>
    ${customerOptions}
  `;

  dom.filterCustomer.innerHTML = `
    <option value="">All customers</option>
    ${state.customers.map((customer) => `
      <option value="${escapeHtml(customer.name)}">${escapeHtml(customer.name)}</option>
    `).join("")}
  `;

  dom.filterTransporter.innerHTML = `
    <option value="">All transporters</option>
    ${state.transporters.map((transporter) => `
      <option value="${escapeHtml(transporter.name)}">${escapeHtml(transporter.name)}</option>
    `).join("")}
  `;
}

/* ------------------------------- Form validation ---------------------------- */
function setFieldError(input, message) {
  const field = input.closest(".field");
  if (!field) return;
  field.classList.add("has-error");
  const error = field.querySelector(".field-error");
  if (error) error.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function clearFormErrors(form) {
  $$(".field.has-error", form).forEach((field) => field.classList.remove("has-error"));
  $$(".field-error", form).forEach((error) => { error.textContent = ""; });
  $$("[aria-invalid]", form).forEach((input) => input.removeAttribute("aria-invalid"));
}

function handleNomination(event) {
  event.preventDefault();
  const form = dom.transporterForm;
  clearFormErrors(form);

  if (currentUser?.role !== "transporter" || !currentUser.transporterName) {
    showToast({ title: "Not available", message: "Only transporter accounts can send vehicles to dispatch.", variant: "error" });
    return;
  }

  const transporterName = currentUser.transporterName;
  const vehicleNo = dom.vehicleNo.value.replace(/\s+/g, "").toUpperCase();
  const driverName = dom.driverName.value.trim().replace(/\s+/g, " ");

  const invalidFields = [];
  const platePattern = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;

  if (!platePattern.test(vehicleNo)) {
    setFieldError(dom.vehicleNo, "Enter a valid plate, e.g. HR47F5782.");
    invalidFields.push(dom.vehicleNo);
  } else if (getWaitingDispatches().some((dispatch) => dispatch.vehicleNo.replace(/\s+/g, "").toUpperCase() === vehicleNo)) {
    setFieldError(dom.vehicleNo, "This vehicle is already in the gate queue.");
    invalidFields.push(dom.vehicleNo);
  }

  if (driverName.length < 2) {
    setFieldError(dom.driverName, "Enter the driver's full name.");
    invalidFields.push(dom.driverName);
  }

  if (invalidFields.length > 0) {
    invalidFields[0].focus();
    return;
  }

  const dispatch = {
    dispatchId: nextDispatchId(),
    transporterName,
    vehicleNo,
    driverName,
    driverId: null,
    customer: null,
    status: "Awaiting Dispatch",
    binsLoaded: null,
    invoiceNo: null,
    grnNumber: null,
    date: todayISO(),
    nominatedAt: new Date().toISOString(),
  };

  state.dispatches.push(dispatch);
  pushActivity("nominate", `Vehicle ${vehicleNo} sent to dispatch by ${transporterName}.`);
  saveState();
  renderAll();

  form.reset();
  clearFormErrors(form);
  dom.vehicleNo.focus();

  showToast({
    title: "Vehicle sent to dispatch",
    message: `${vehicleNo} · ${driverName} is now queued for gate verification. Musashi dispatch will record the destination, driver DL, bins and invoice.`,
    variant: "success",
  });
}

/* ----------------------------------- Modal ---------------------------------- */
function openDispatchModal(dispatchId) {
  const dispatch = state.dispatches.find((item) => item.dispatchId === dispatchId);

  if (!dispatch || dispatch.status !== "Awaiting Dispatch") {
    showToast({ title: "Vehicle unavailable", message: "This vehicle is no longer waiting at the gate.", variant: "error" });
    renderAll();
    return;
  }

  const transporter = getTransporterByName(dispatch.transporterName);
  if (!transporter) {
    showToast({ title: "Transporter missing", message: "The carrier for this vehicle could not be found.", variant: "error" });
    return;
  }

  window.clearTimeout(modalCloseTimer);
  const session = ++modalSession;
  activeDispatchId = dispatch.dispatchId;
  lastFocusedElement = document.activeElement;

  dom.modalDispatchId.value = dispatch.dispatchId;
  dom.modalVehicle.textContent = `${dispatch.vehicleNo} · ${dispatch.driverName}`;
  dom.modalTransporter.textContent = dispatch.transporterName;
  dom.modalDriver.textContent = "Verify at gate";
  dom.modalGrnPreview.textContent = formatGRN(transporter.code, transporter.currentSequence + 1);
  dom.modalSequenceNote.textContent = `${transporter.code} sequence ${transporter.currentSequence} → ${transporter.currentSequence + 1}`;

  dom.dispatchCustomer.value = "";
  dom.dispatchDriverId.value = "";
  dom.binsLoaded.value = "";
  dom.invoiceNo.value = "";
  clearFormErrors(dom.dispatchForm);

  dom.modalBackdrop.hidden = false;
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    if (session !== modalSession) return;
    dom.modalBackdrop.classList.add("is-open");
    window.setTimeout(() => {
      if (session === modalSession) dom.dispatchCustomer.focus();
    }, 80);
  });
}

function closeDispatchModal({ restoreFocus = true } = {}) {
  if (dom.modalBackdrop.hidden) return;

  modalSession += 1;
  dom.modalBackdrop.classList.remove("is-open");
  document.body.classList.remove("modal-open");
  activeDispatchId = null;

  window.clearTimeout(modalCloseTimer);
  modalCloseTimer = window.setTimeout(() => {
    if (!dom.modalBackdrop.classList.contains("is-open")) dom.modalBackdrop.hidden = true;
  }, 240);

  if (restoreFocus && lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus({ preventScroll: true });
  }
  lastFocusedElement = null;
}

function handleDispatchSubmit(event) {
  event.preventDefault();
  clearFormErrors(dom.dispatchForm);

  const dispatchId = activeDispatchId || dom.modalDispatchId.value;
  const dispatch = state.dispatches.find((item) => item.dispatchId === dispatchId);

  if (!dispatch || dispatch.status !== "Awaiting Dispatch") {
    showToast({ title: "Dispatch unavailable", message: "This trip was already processed or removed.", variant: "error" });
    closeDispatchModal();
    renderAll();
    return;
  }

  const transporter = getTransporterByName(dispatch.transporterName);
  if (!transporter) {
    showToast({ title: "Transporter missing", message: "Cannot generate a GRN without a transporter code.", variant: "error" });
    return;
  }

  const customerName = dom.dispatchCustomer.value;
  const customer = getCustomerByName(customerName);
  const driverId = dom.dispatchDriverId.value.trim().toUpperCase();
  const binsRaw = dom.binsLoaded.value.trim();
  const invoiceNo = dom.invoiceNo.value.trim().toUpperCase();
  const bins = Number(binsRaw);
  const invalidFields = [];

  if (!customer) {
    setFieldError(dom.dispatchCustomer, "Select the destination customer.");
    invalidFields.push(dom.dispatchCustomer);
  }

  if (!/^[A-Z0-9-]{4,24}$/.test(driverId)) {
    setFieldError(dom.dispatchDriverId, "Enter the driver's DL / ID (4–24 characters).");
    invalidFields.push(dom.dispatchDriverId);
  }

  if (!binsRaw || !Number.isInteger(bins) || bins < 1 || bins > 2000) {
    setFieldError(dom.binsLoaded, "Enter a whole number between 1 and 2,000.");
    invalidFields.push(dom.binsLoaded);
  }

  if (!/^[A-Z0-9][A-Z0-9/._-]{2,29}$/.test(invoiceNo)) {
    setFieldError(dom.invoiceNo, "Enter a valid invoice number (3–30 characters).");
    invalidFields.push(dom.invoiceNo);
  }

  if (invalidFields.length > 0) {
    invalidFields[0].focus();
    return;
  }

  /* Custom GRN logic: transporter code + incremented transporter sequence */
  const nextSequence = Number(transporter.currentSequence) + 1;
  const grnNumber = formatGRN(transporter.code, nextSequence);

  transporter.currentSequence = nextSequence;
  dispatch.status = "Completed";
  dispatch.customer = customer.name;
  dispatch.driverId = driverId;
  dispatch.binsLoaded = bins;
  dispatch.invoiceNo = invoiceNo;
  dispatch.grnNumber = grnNumber;
  dispatch.date = todayISO();
  dispatch.completedAt = new Date().toISOString();

  lastIssuedDispatchId = dispatch.dispatchId;
  pushActivity("grn", `GRN ${grnNumber} issued for ${dispatch.transporterName} · ${bins} bins to ${customer.name}.`);
  saveState();

  closeDispatchModal({ restoreFocus: false });
  renderAll();

  showToast({
    title: `GRN ${grnNumber} issued`,
    message: `${dispatch.transporterName} · ${dispatch.vehicleNo} · ${formatCount(bins)} bins → ${customer.name}. Moved to the admin ledger.`,
    variant: "success",
  });
}

/* ----------------------------------- Toasts --------------------------------- */
function removeToast(toast) {
  if (!toast || !toast.isConnected) return;
  toast.classList.remove("is-show");
  toast.classList.add("is-hiding");
  window.setTimeout(() => toast.remove(), 260);
}

function showToast({ title, message = "", variant = "success", duration = 4800 }) {
  while (dom.toastStack.children.length >= 4) {
    dom.toastStack.firstElementChild.remove();
  }

  const icon = variant === "error" ? ICONS.alert : variant === "info" ? ICONS.info : ICONS.check;
  const toast = document.createElement("div");
  toast.className = `toast toast--${variant}`;
  toast.setAttribute("role", variant === "error" ? "alert" : "status");
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <div class="toast-body">
      <strong class="toast-title">${escapeHtml(title)}</strong>
      ${message ? `<p class="toast-message">${escapeHtml(message)}</p>` : ""}
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss notification">×</button>
  `;

  dom.toastStack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-show"));

  const timer = window.setTimeout(() => removeToast(toast), duration);
  toast.querySelector(".toast-close").addEventListener("click", () => {
    window.clearTimeout(timer);
    removeToast(toast);
  });
}

/* ----------------------------------- Export --------------------------------- */
function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCompletedDispatches() {
  const rows = getFilteredCompletedDispatches();

  if (rows.length === 0) {
    showToast({ title: "Nothing to export", message: "Adjust the filters to include at least one trip.", variant: "info" });
    return;
  }

  const headers = [
    "Date",
    "Dispatch ID",
    "Transporter",
    "Transporter Code",
    "Vehicle No",
    "Driver",
    "Driver ID",
    "Customer",
    "Customer Code",
    "Bins Loaded",
    "Invoice No",
    "GRN Number",
    "Completed At",
  ];

  const data = rows.map((dispatch) => [
    dispatch.date,
    dispatch.dispatchId,
    dispatch.transporterName,
    getTransporterCode(dispatch.transporterName),
    dispatch.vehicleNo,
    dispatch.driverName,
    dispatch.driverId,
    dispatch.customer,
    getCustomerCode(dispatch.customer),
    dispatch.binsLoaded,
    dispatch.invoiceNo,
    dispatch.grnNumber,
    dispatch.completedAt || "",
  ]);

  const csv = [headers, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `musashi-dispatches-${todayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast({
    title: "CSV exported",
    message: `${rows.length} trip${rows.length === 1 ? "" : "s"} included in the billing export.`,
    variant: "success",
  });
}

/* ----------------------------------- Reset ---------------------------------- */
function resetDemo() {
  const confirmed = window.confirm(
    "Reset the demo? This clears all vehicle requests, completed dispatches, GRNs and transporter sequences, then restores the seed data."
  );
  if (!confirmed) return;

  closeDispatchModal({ restoreFocus: false });

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear localStorage.", error);
  }

  state = seedState();
  lastIssuedDispatchId = null;

  adminFilters.search = "";
  adminFilters.customer = "";
  adminFilters.transporter = "";
  dom.adminSearch.value = "";
  dom.filterCustomer.value = "";
  dom.filterTransporter.value = "";

  saveState();
  renderAll();

  showToast({
    title: "Demo reset",
    message: "Seed data and transporter GRN sequences have been restored.",
    variant: "info",
  });
}

/* ----------------------------------- Clock ---------------------------------- */
function updateClock() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  dom.clock.textContent = `${date} · ${time}`;
  dom.clock.setAttribute("datetime", now.toISOString());
}

/* ---------------------------------- Events ---------------------------------- */
function bindEvents() {
  /* Authentication */
  dom.loginForm.addEventListener("submit", handleLogin);
  dom.logoutBtn.addEventListener("click", handleLogout);

  dom.roleOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const account = ACCOUNTS.find((item) => item.username === option.dataset.demoUser);
      if (!account) return;

      dom.roleOptions.forEach((item) => {
        item.classList.toggle("is-selected", item === option);
      });

      dom.loginUser.value = account.username;
      dom.loginPass.value = account.password;
      dom.loginError.hidden = true;
      dom.loginSubmit.focus();
    });
  });

  [dom.loginUser, dom.loginPass].forEach((input) => {
    input.addEventListener("input", () => {
      dom.loginError.hidden = true;
    });
  });

  /* Navigation */
  dom.navItems.forEach((item) => {
    item.addEventListener("click", () => switchView(item.dataset.view));
  });

  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.go));
  });

  window.addEventListener("hashchange", () => {
    if (!currentUser) return;

    const view = window.location.hash.replace("#", "");
    if (!VIEW_META[view]) return;

    if (!canAccess(view)) {
      showToast({
        title: "Access restricted",
        message: `Your role cannot open the ${VIEW_META[view].title}.`,
        variant: "error",
      });
      switchView((ROLE_ACCESS[currentUser.role] || [])[0], { scroll: false });
      return;
    }

    switchView(view, { updateHash: false });
  });

  /* Transporter form */
  dom.transporterForm.addEventListener("submit", handleNomination);
  dom.transporterForm.addEventListener("input", (event) => {
    const field = event.target.closest(".field");
    if (!field) return;
    field.classList.remove("has-error");
    const error = field.querySelector(".field-error");
    if (error) error.textContent = "";
    event.target.removeAttribute("aria-invalid");
  });

  dom.vehicleNo.addEventListener("input", () => {
    const caret = dom.vehicleNo.selectionStart;
    dom.vehicleNo.value = dom.vehicleNo.value.toUpperCase().replace(/\s+/g, "");
    try {
      dom.vehicleNo.setSelectionRange(caret, caret);
    } catch (error) {
      /* Some browsers do not expose selection on every input state */
    }
  });

  dom.dispatchDriverId.addEventListener("input", () => {
    const caret = dom.dispatchDriverId.selectionStart;
    dom.dispatchDriverId.value = dom.dispatchDriverId.value.toUpperCase();
    try {
      dom.dispatchDriverId.setSelectionRange(caret, caret);
    } catch (error) {
      /* non-critical */
    }
  });

  /* Waiting vehicle cards (event delegation) */
  dom.waitingGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-process]");
    if (!button) return;
    openDispatchModal(button.dataset.process);
  });

  /* Modal controls */
  dom.modalClose.addEventListener("click", () => closeDispatchModal());
  dom.cancelDispatchBtn.addEventListener("click", () => closeDispatchModal());
  dom.dispatchForm.addEventListener("submit", handleDispatchSubmit);

  dom.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === dom.modalBackdrop) closeDispatchModal();
  });

  dom.dispatchForm.addEventListener("input", (event) => {
    const field = event.target.closest(".field");
    if (!field) return;
    field.classList.remove("has-error");
    const error = field.querySelector(".field-error");
    if (error) error.textContent = "";
    event.target.removeAttribute("aria-invalid");
  });

  dom.invoiceNo.addEventListener("input", () => {
    const caret = dom.invoiceNo.selectionStart;
    dom.invoiceNo.value = dom.invoiceNo.value.toUpperCase();
    try {
      dom.invoiceNo.setSelectionRange(caret, caret);
    } catch (error) {
      /* non-critical */
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.modalBackdrop.hidden) {
      closeDispatchModal();
      return;
    }

    /* Keep keyboard focus inside the modal while it is open */
    if (event.key !== "Tab" || dom.modalBackdrop.hidden) return;
    const focusable = $$('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])', dom.modal)
      .filter((element) => !element.disabled && element.offsetParent !== null);

    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* Admin filters */
  dom.adminSearch.addEventListener("input", () => {
    adminFilters.search = dom.adminSearch.value;
    renderAdminTable();
  });

  dom.filterCustomer.addEventListener("change", () => {
    adminFilters.customer = dom.filterCustomer.value;
    renderAdminTable();
  });

  dom.filterTransporter.addEventListener("change", () => {
    adminFilters.transporter = dom.filterTransporter.value;
    renderAdminTable();
  });

  $("#clearFiltersBtn").addEventListener("click", () => {
    adminFilters.search = "";
    adminFilters.customer = "";
    adminFilters.transporter = "";
    dom.adminSearch.value = "";
    dom.filterCustomer.value = "";
    dom.filterTransporter.value = "";
    renderAdminTable();
    dom.adminSearch.focus();
  });

  $("#exportBtn").addEventListener("click", exportCompletedDispatches);
  $("#resetBtn").addEventListener("click", resetDemo);

  /* Keep multiple tabs of the POC in sync */
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !currentUser) return;
    state = loadState();
    renderAll();
    showToast({
      title: "Ledger synced",
      message: "Dispatch data was updated from another tab.",
      variant: "info",
    });
  });
}

/* ----------------------------------- Init ----------------------------------- */
function init() {
  populateSelects();
  bindEvents();
  renderAll();

  currentUser = readSession();
  if (currentUser) {
    showApp();
  } else {
    showLogin();
  }

  updateClock();
  window.setInterval(updateClock, 1000);
  saveState();
}

init();
