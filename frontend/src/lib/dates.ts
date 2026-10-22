/**
 * Date helpers for pt-BR labels. API dates are Brasília calendar days
 * ("YYYY-MM-DD"), so they are parsed by splitting the string: a `Date` read
 * through local getters would shift the day in other time zones.
 */
import type { IsoDate, Period } from "../types/api.ts";

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Brasília is UTC-3 all year (no daylight saving since 2019). */
const BRASILIA_UTC_OFFSET_HOURS = -3;

interface DayParts {
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function checkMonth(month: number, input: string): void {
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid month in ${JSON.stringify(input)}`);
  }
}

/** Splits "YYYY-MM-DD" into integers; throws RangeError on a malformed or impossible day. */
function parseIsoDate(isoDate: IsoDate): DayParts {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (!match) {
    throw new RangeError(`Expected "YYYY-MM-DD", received ${JSON.stringify(isoDate)}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  checkMonth(month, isoDate);
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`Invalid day in ${JSON.stringify(isoDate)}`);
  }
  return { year, month, day };
}

function shortMonth(month: number): string {
  // parseIsoDate already checked 1..12, so the lookup always hits.
  return SHORT_MONTHS[month - 1] ?? "";
}

/** "2026-10-20" -> "20 out" */
export function formatShortDate(isoDate: IsoDate): string {
  const { month, day } = parseIsoDate(isoDate);
  return `${day} ${shortMonth(month)}`;
}

/** "2026-10" (the `month` field of `GET /budget`) -> "outubro" */
export function monthName(isoMonth: string): string {
  const match = ISO_MONTH_PATTERN.exec(isoMonth);
  if (!match) {
    throw new RangeError(`Expected "YYYY-MM", received ${JSON.stringify(isoMonth)}`);
  }
  const month = Number(match[2]);
  checkMonth(month, isoMonth);
  return MONTH_NAMES[month - 1] ?? "";
}

/** "outubro" -> "Outubro" */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Week label: "19 a 25 de out", "29 de set a 5 de out" or, across years, with both years. */
function weekLabel(start: DayParts, end: DayParts): string {
  if (start.year !== end.year) {
    return (
      `${start.day} de ${shortMonth(start.month)} de ${start.year} a ` +
      `${end.day} de ${shortMonth(end.month)} de ${end.year}`
    );
  }
  if (start.month !== end.month) {
    return `${start.day} de ${shortMonth(start.month)} a ${end.day} de ${shortMonth(end.month)}`;
  }
  return `${start.day} a ${end.day} de ${shortMonth(end.month)}`;
}

/**
 * Label of a charts period (`start` and `end` from `GET /dashboard/charts`):
 * month "Outubro de 2026", week "19 a 25 de out", year "2026".
 */
export function periodLabel(period: Period, start: IsoDate, end: IsoDate): string {
  const first = parseIsoDate(start);
  const last = parseIsoDate(end);
  // ISO strings of the same shape compare in calendar order.
  if (end < start) {
    throw new RangeError(`Period ends (${end}) before it starts (${start})`);
  }
  switch (period) {
    case "month":
      return `${capitalize(MONTH_NAMES[first.month - 1] ?? "")} de ${first.year}`;
    case "year":
      return String(first.year);
    case "week":
      return weekLabel(first, last);
  }
}

/** Hour of day (0..23) in Brasília for an instant, read from UTC fields only. */
export function brasiliaHour(now: Date): number {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("brasiliaHour received an invalid Date");
  }
  return (now.getUTCHours() + BRASILIA_UTC_OFFSET_HOURS + 24) % 24;
}

/** Greeting for a Brasília hour: 5..11 "Bom dia", 12..17 "Boa tarde", otherwise "Boa noite". */
export function greeting(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`greeting expects an hour 0..23, received ${String(hour)}`);
  }
  if (hour >= 5 && hour < 12) {
    return "Bom dia";
  }
  if (hour >= 12 && hour < 18) {
    return "Boa tarde";
  }
  return "Boa noite";
}
