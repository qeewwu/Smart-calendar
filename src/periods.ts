import { moment } from "obsidian";
import type { Moment } from "moment";
import type { Settings, WeekStart } from "./settings";

export type Granularity = "day" | "week" | "month" | "quarter" | "year";

export const GRANULARITIES: Granularity[] = ["day", "week", "month", "quarter", "year"];

/** Единица moment для granularity ("week" уже понимает moment нативно). */
function unitOf(g: Granularity): "day" | "isoWeek" | "week" | "month" | "quarter" | "year" {
  if (g === "week") return "isoWeek";
  return g;
}

export function startOf(date: Moment, g: Granularity, weekStart: WeekStart = "monday"): Moment {
  if (g === "week" && weekStart === "sunday") {
    return date.clone().startOf("week");
  }
  return date.clone().startOf(unitOf(g));
}

export function endOf(date: Moment, g: Granularity, weekStart: WeekStart = "monday"): Moment {
  if (g === "week" && weekStart === "sunday") {
    return date.clone().endOf("week");
  }
  return date.clone().endOf(unitOf(g));
}

function addUnitOf(g: Granularity): "day" | "week" | "month" | "quarter" | "year" {
  return g === "week" ? "week" : g;
}

export function prev(date: Moment, g: Granularity): Moment {
  return date.clone().subtract(1, addUnitOf(g));
}

export function next(date: Moment, g: Granularity): Moment {
  return date.clone().add(1, addUnitOf(g));
}

/** Нормализует формат в стиле date-fns (yyyy, dd) к формату moment (YYYY, DD), если он попал в настройки по ошибке. */
export function normalizeFormat(format: string): string {
  // Заменяем только явно date-fns-конфликтующие токены нижнего регистра, не трогая уже валидные moment-токены.
  return format
    .replace(/\byyyy\b/g, "YYYY")
    .replace(/\byy\b/g, "YY")
    .replace(/\bdd\b/g, "DD");
}

export function formatName(date: Moment, format: string): string {
  return date.clone().locale("en").format(normalizeFormat(format));
}

/** Строгий парсинг имени файла (без расширения) под заданный формат. Возвращает null, если не совпало. */
export function parseName(name: string, format: string): Moment | null {
  const m = moment(name, normalizeFormat(format), "en", true);
  return m.isValid() ? m : null;
}

/** Имя папки месяца всегда на английском (например "September 2026"), независимо от локали интерфейса. */
export function monthFolderName(date: Moment, format: string): string {
  return date.clone().locale("en").format(normalizeFormat(format));
}

export function titleFor(date: Moment, g: Granularity, settings: Settings): string {
  return formatName(date, settings.periods[g].format);
}

/** Смещение вида "+3d", "-1w", "+2M" и т.п., как в Daily Notes / Templater. */
export function applyOffset(date: Moment, offset: string): Moment {
  const match = offset.match(/^([+-])(\d+)([dwMQy])$/);
  if (!match) return date.clone();
  const [, sign, amountStr, unitChar] = match;
  const amount = Number(amountStr) * (sign === "-" ? -1 : 1);
  const unitMap: Record<string, moment.unitOfTime.DurationConstructor> = {
    d: "days",
    w: "weeks",
    M: "months",
    Q: "quarters" as moment.unitOfTime.DurationConstructor,
    y: "years",
  };
  return date.clone().add(amount, unitMap[unitChar]);
}
