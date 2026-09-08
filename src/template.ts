import type { Moment } from "moment";
import type { Granularity } from "./periods";
import { applyOffset, endOf, formatName, next, prev, startOf } from "./periods";
import type { WeekStart } from "./settings";

export interface TemplateContext {
  date: Moment;
  granularity: Granularity;
  title: string;
  nameFormat: string;
  weekStart: WeekStart;
}

const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
const DEFAULT_TIME_FORMAT = "HH:mm";

/**
 * Подставляет переменные вида {{name}} / {{name:FORMAT}} в тексте шаблона.
 * Синтаксис умышленно ограничен собственным небольшим набором переменных —
 * без зависимости от Templater.
 */
export function applyTemplate(templateText: string, ctx: TemplateContext): string {
  return templateText.replace(/{{\s*([a-zA-Z_+\-0-9]+)\s*(?::\s*([^}]+?)\s*)?}}/g, (whole, rawName: string, rawFormat?: string) => {
    const resolved = resolveVariable(rawName, rawFormat, ctx);
    return resolved === undefined ? whole : resolved;
  });
}

function resolveVariable(rawName: string, format: string | undefined, ctx: TemplateContext): string | undefined {
  const { date, granularity, title, nameFormat, weekStart } = ctx;

  // date±Nunit (например date+3d, date-1w)
  const offsetMatch = rawName.match(/^date([+-]\d+[dwMQy])$/);
  if (offsetMatch) {
    const shifted = applyOffset(date, offsetMatch[1]);
    return formatName(shifted, format ?? nameFormat);
  }

  switch (rawName) {
    case "date":
      return formatName(date, format ?? nameFormat);
    case "time":
      return date.clone().format(format ?? DEFAULT_TIME_FORMAT);
    case "title":
      return title;
    case "prev":
      return formatName(prev(date, granularity), format ?? nameFormat);
    case "next":
      return formatName(next(date, granularity), format ?? nameFormat);
    case "yesterday":
      return formatName(date.clone().subtract(1, "day"), format ?? DEFAULT_DATE_FORMAT);
    case "tomorrow":
      return formatName(date.clone().add(1, "day"), format ?? DEFAULT_DATE_FORMAT);
    case "start":
      return formatName(startOf(date, granularity, weekStart), format ?? DEFAULT_DATE_FORMAT);
    case "end":
      return formatName(endOf(date, granularity, weekStart), format ?? DEFAULT_DATE_FORMAT);
    case "week":
      return date.clone().format(format ?? "WW");
    case "month":
      return date.clone().locale("en").format(format ?? "MMMM");
    case "quarter":
      return String(date.quarter());
    case "year":
      return date.clone().format(format ?? "YYYY");
    default:
      return undefined;
  }
}
