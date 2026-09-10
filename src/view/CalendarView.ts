import { ItemView, WorkspaceLeaf, moment } from "obsidian";
import type { Moment } from "moment";
import type SmartCalendarPlugin from "../main";
import { findNote } from "../notes";

export const VIEW_TYPE_SMART_CALENDAR = "smart-calendar-view";

export class CalendarView extends ItemView {
  private cursor: Moment;

  constructor(leaf: WorkspaceLeaf, private plugin: SmartCalendarPlugin) {
    super(leaf);
    this.cursor = moment();
  }

  getViewType(): string {
    return VIEW_TYPE_SMART_CALENDAR;
  }

  getDisplayText(): string {
    return "Smart Calendar";
  }

  getIcon(): string {
    return "calendar";
  }

  async onOpen(): Promise<void> {
    this.render();

    // Живое обновление: создание/удаление/переименование заметки в любом месте хранилища
    // должно сразу отразиться на отметках "есть заметка" в открытом календаре.
    const scheduleRefresh = this.debouncedRender();
    this.registerEvent(this.app.vault.on("create", scheduleRefresh));
    this.registerEvent(this.app.vault.on("delete", scheduleRefresh));
    this.registerEvent(this.app.vault.on("rename", scheduleRefresh));
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  /** Схлопывает частые события хранилища (например, пачку файлов при синхронизации) в одну перерисовку. */
  private debouncedRender(): () => void {
    let timer: number | undefined;
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => this.render(), 200);
    };
  }

  public refresh(): void {
    this.render();
  }

  private goTo(date: Moment): void {
    this.cursor = date;
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("smart-calendar-view");

    const settings = this.plugin.settings;
    const root = contentEl.createDiv({ cls: "smart-calendar-root" });

    this.renderHeader(root);
    this.renderGrid(root);

    if (settings.periods.quarter.enabled || settings.periods.year.enabled) {
      this.renderPeriodBar(root);
    }
  }

  private renderHeader(root: HTMLElement): void {
    const header = root.createDiv({ cls: "smart-calendar-header" });

    const prevBtn = header.createDiv({ cls: "smart-calendar-nav-btn", text: "‹" });
    prevBtn.addEventListener("click", () => this.goTo(this.cursor.clone().subtract(1, "month")));

    const title = header.createDiv({ cls: "smart-calendar-title" });
    title.setText(this.cursor.clone().locale("en").format("MMMM YYYY"));
    if (this.plugin.settings.periods.month.enabled) {
      title.addClass("is-clickable");
      title.addEventListener("click", () => {
        void this.plugin.openPeriodNote("month", this.cursor);
      });
    }

    const nextBtn = header.createDiv({ cls: "smart-calendar-nav-btn", text: "›" });
    nextBtn.addEventListener("click", () => this.goTo(this.cursor.clone().add(1, "month")));

    const todayBtn = header.createDiv({ cls: "smart-calendar-today-btn", text: "Today" });
    todayBtn.addEventListener("click", () => this.goTo(moment()));
  }

  private renderPeriodBar(root: HTMLElement): void {
    const bar = root.createDiv({ cls: "smart-calendar-period-bar" });
    const settings = this.plugin.settings;

    if (settings.periods.quarter.enabled) {
      const q = bar.createDiv({ cls: "smart-calendar-period-chip", text: `Q${this.cursor.quarter()}` });
      q.addEventListener("click", () => void this.plugin.openPeriodNote("quarter", this.cursor));
    }
    if (settings.periods.year.enabled) {
      const y = bar.createDiv({ cls: "smart-calendar-period-chip", text: this.cursor.format("YYYY") });
      y.addEventListener("click", () => void this.plugin.openPeriodNote("year", this.cursor));
    }
  }

  private renderGrid(root: HTMLElement): void {
    const settings = this.plugin.settings;
    const grid = root.createDiv({ cls: "smart-calendar-grid" });

    const weekStartsOnMonday = settings.weekStart !== "sunday";
    const dayNames = weekStartsOnMonday
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (settings.showWeekNumbers) {
      grid.createDiv({ cls: "smart-calendar-cell smart-calendar-weeknum-header", text: "" });
    }
    for (const d of dayNames) {
      grid.createDiv({ cls: "smart-calendar-cell smart-calendar-day-header", text: d });
    }

    const monthStart = this.cursor.clone().startOf("month");
    const monthEnd = this.cursor.clone().endOf("month");
    const gridStart = weekStartsOnMonday ? monthStart.clone().startOf("isoWeek") : monthStart.clone().startOf("week");
    const gridEnd = weekStartsOnMonday ? monthEnd.clone().endOf("isoWeek") : monthEnd.clone().endOf("week");

    let day = gridStart.clone();
    while (day.isSameOrBefore(gridEnd, "day")) {
      if (settings.showWeekNumbers) {
        const weekNumCell = grid.createDiv({
          cls: "smart-calendar-cell smart-calendar-weeknum",
          text: String(day.isoWeek()),
        });
        if (settings.periods.week.enabled) {
          weekNumCell.addClass("is-clickable");
          const weekDate = day.clone();
          weekNumCell.addEventListener("click", () => void this.plugin.openPeriodNote("week", weekDate));
        }
      }

      for (let d = 0; d < 7; d++) {
        this.renderDayCell(grid, day.clone());
        day = day.add(1, "day");
      }
    }
  }

  private renderDayCell(grid: HTMLElement, date: Moment): void {
    const settings = this.plugin.settings;
    const isCurrentMonth = date.month() === this.cursor.month();
    const isToday = date.isSame(moment(), "day");

    const cell = grid.createDiv({ cls: "smart-calendar-cell smart-calendar-day" });
    if (!isCurrentMonth) cell.addClass("is-outside-month");
    if (isToday) cell.addClass("is-today");

    if (settings.markExistingNotes) {
      const existing = findNote(this.app, date, "day", settings);
      if (existing) cell.addClass("has-note");
    }

    cell.setText(String(date.date()));
    cell.addEventListener("click", () => {
      void this.plugin.openPeriodNote("day", date);
    });
  }
}
