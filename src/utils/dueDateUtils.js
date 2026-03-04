// Due date helper utilities (client-side)
// Mirrors server/app/Services/DueDateService.php behavior for preview/display.

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAME_TO_NUM = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const DEFAULT_DAY = 15;
const END_OF_SY_MONTH = 3; // March (DepEd PH)

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDateLabel(ymd) {
  if (!ymd) return "—";
  try {
    const d = new Date(`${ymd}T12:00:00`);
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return ymd;
  }
}

export function toYmd(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function endOfMonthDate(year, month1to12) {
  // JS Date: month is 0-based; day 0 gives last day of previous month.
  return new Date(year, month1to12, 0, 12, 0, 0);
}

export function parseDayOfMonth(rule) {
  if (!rule || typeof rule !== "string") return DEFAULT_DAY;
  const m = rule.trim().match(/^(\d{1,2})(?:st|nd|rd|th)?\s*(?:day\s+of\s+the\s+month)?/i);
  if (!m) return DEFAULT_DAY;
  const day = Math.max(1, Math.min(31, Number(m[1]) || DEFAULT_DAY));
  return day;
}

export function parseMonths(rule) {
  if (!rule || typeof rule !== "string") return [];
  const lower = rule.toLowerCase();
  const found = [];
  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    if (lower.includes(name)) found.push(num);
  }
  found.sort((a, b) => a - b);
  return Array.from(new Set(found));
}

export function monthNumToName(month1to12) {
  return MONTHS[Math.max(1, Math.min(12, month1to12)) - 1];
}

export function ordinalDayLabel(day) {
  const d = Math.max(1, Math.min(31, Number(day) || DEFAULT_DAY));
  const mod10 = d % 10;
  const mod100 = d % 100;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) suffix = "st";
    else if (mod10 === 2) suffix = "nd";
    else if (mod10 === 3) suffix = "rd";
  }
  return `${d}${suffix}`;
}

export function buildMonthlyRule(day) {
  return `${ordinalDayLabel(day)} day of the month`;
}

export function buildMonthPairRule(monthA, monthB) {
  const a = monthNumToName(monthA);
  const b = monthNumToName(monthB);
  if (!a || !b) return "";
  return `${a} & ${b}`;
}

export function buildYearlyRule(month) {
  return monthNumToName(month);
}

export function computeNextDueDateYmd({ frequency, submission_date_rule }, from = new Date()) {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0);
  const fromY = fromDate.getFullYear();

  const freq = frequency || "yearly";
  const rule = submission_date_rule || "";

  if (freq === "monthly") {
    const day = parseDayOfMonth(rule);
    let candidate = new Date(fromY, fromDate.getMonth(), day, 12, 0, 0);
    if (candidate <= fromDate) {
      candidate = new Date(fromY, fromDate.getMonth() + 1, day, 12, 0, 0);
    }
    // clamp day to days in month
    const daysInMonth = endOfMonthDate(candidate.getFullYear(), candidate.getMonth() + 1).getDate();
    candidate.setDate(Math.min(day, daysInMonth));
    return toYmd(candidate);
  }

  if (freq === "twice_a_year" || freq === "once_or_twice_a_year") {
    const months = parseMonths(rule);
    const monthPair = months.length ? months : [6, 12]; // default June & December
    for (const m of monthPair) {
      const candidate = endOfMonthDate(fromY, m);
      if (candidate > fromDate) return toYmd(candidate);
    }
    return toYmd(endOfMonthDate(fromY + 1, monthPair[0]));
  }

  if (freq === "yearly") {
    const months = parseMonths(rule);
    const m = months.length ? months[0] : 12;
    let candidate = endOfMonthDate(fromY, m);
    if (candidate <= fromDate) candidate = endOfMonthDate(fromY + 1, m);
    return toYmd(candidate);
  }

  if (freq === "end_of_sy") {
    let candidate = endOfMonthDate(fromY, END_OF_SY_MONTH);
    if (candidate <= fromDate) candidate = endOfMonthDate(fromY + 1, END_OF_SY_MONTH);
    return toYmd(candidate);
  }

  if (freq === "quarterly") {
    const quarterMonths = [3, 6, 9, 12];
    for (const m of quarterMonths) {
      const candidate = endOfMonthDate(fromY, m);
      if (candidate > fromDate) return toYmd(candidate);
    }
    return toYmd(endOfMonthDate(fromY + 1, 3));
  }

  if (freq === "every_two_months") {
    const bimonthlyMonths = [1, 3, 5, 7, 9, 11];
    for (const m of bimonthlyMonths) {
      const candidate = endOfMonthDate(fromY, m);
      if (candidate > fromDate) return toYmd(candidate);
    }
    return toYmd(endOfMonthDate(fromY + 1, 1));
  }

  // default: yearly end of year
  let candidate = endOfMonthDate(fromY, 12);
  if (candidate <= fromDate) candidate = endOfMonthDate(fromY + 1, 12);
  return toYmd(candidate);
}

