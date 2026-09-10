import type { Granularity } from "./periods";

export type WeekStart = "monday" | "sunday" | "locale";

export interface PeriodConfig {
  enabled: boolean;
  folder: string;
  format: string;
  template: string;
}

export interface Settings {
  periods: Record<Granularity, PeriodConfig>;
  dailySubfolderFormat: string;
  autoOrganize: boolean;
  weekStart: WeekStart;
  showWeekNumbers: boolean;
  markExistingNotes: boolean;
  openInNewTab: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  periods: {
    day: { enabled: true, folder: "Daily", format: "YYYY-MM-DD", template: "" },
    week: { enabled: false, folder: "Weekly", format: "GGGG-[W]WW", template: "" },
    month: { enabled: false, folder: "Monthly", format: "YYYY-MM", template: "" },
    quarter: { enabled: false, folder: "Quarterly", format: "YYYY-[Q]Q", template: "" },
    year: { enabled: false, folder: "Yearly", format: "YYYY", template: "" },
  },
  dailySubfolderFormat: "MMMM YYYY",
  autoOrganize: true,
  weekStart: "monday",
  showWeekNumbers: true,
  markExistingNotes: true,
  openInNewTab: false,
};

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  quarter: "Quarterly",
  year: "Yearly",
};
