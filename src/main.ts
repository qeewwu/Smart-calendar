import { Notice, Plugin, TFile, WorkspaceLeaf, moment } from "obsidian";
import type { Moment } from "moment";
import { DEFAULT_SETTINGS, GRANULARITY_LABELS, type Settings } from "./settings";
import { SmartCalendarSettingTab } from "./settings-tab";
import { GRANULARITIES, type Granularity, next, prev } from "./periods";
import { getOrCreateNote } from "./notes";
import { planMigration, registerAutoOrganize, runMigration } from "./organizer";
import { ConfirmMigrationModal } from "./view/ConfirmModal";
import { CalendarView, VIEW_TYPE_SMART_CALENDAR } from "./view/CalendarView";

export default class SmartCalendarPlugin extends Plugin {
  settings!: Settings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_SMART_CALENDAR, (leaf: WorkspaceLeaf) => new CalendarView(leaf, this));

    this.addRibbonIcon("calendar", "Open Smart Calendar", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-calendar",
      name: "Open calendar",
      callback: () => void this.activateView(),
    });

    for (const g of GRANULARITIES) {
      this.addCommand({
        id: `open-today-${g}`,
        name: `Open current ${GRANULARITY_LABELS[g].toLowerCase()} note`,
        callback: () => void this.openPeriodNote(g, moment()),
      });
      this.addCommand({
        id: `open-prev-${g}`,
        name: `Open previous note (${GRANULARITY_LABELS[g].toLowerCase()})`,
        checkCallback: (checking) => {
          const active = this.activeNoteDate(g);
          if (!active) return false;
          if (!checking) void this.openPeriodNote(g, prev(active, g));
          return true;
        },
      });
      this.addCommand({
        id: `open-next-${g}`,
        name: `Open next note (${GRANULARITY_LABELS[g].toLowerCase()})`,
        checkCallback: (checking) => {
          const active = this.activeNoteDate(g);
          if (!active) return false;
          if (!checking) void this.openPeriodNote(g, next(active, g));
          return true;
        },
      });
    }

    this.addCommand({
      id: "organize-daily-notes",
      name: "Organize daily notes into folders",
      callback: () => this.runOrganizeCommand(),
    });

    const handler = registerAutoOrganize(this.app, () => this.settings);
    this.registerEvent(this.app.vault.on("create", handler));

    this.addSettingTab(new SmartCalendarSettingTab(this.app, this));
  }

  onunload(): void {
    // registerView/registerEvent отписываются автоматически.
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<Settings> | null;
    this.settings = mergeSettings(DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  refreshCalendarView(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_SMART_CALENDAR)) {
      const view = leaf.view;
      if (view instanceof CalendarView) view.refresh();
    }
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SMART_CALENDAR);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_SMART_CALENDAR, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async openPeriodNote(g: Granularity, date: Moment): Promise<void> {
    const file = await getOrCreateNote(this.app, date, g, this.settings);
    const leaf = this.settings.openInNewTab
      ? this.app.workspace.getLeaf("tab")
      : this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }

  /** Дата активной заметки, если она распознаётся как заметка данного типа. */
  private activeNoteDate(g: Granularity): Moment | null {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) return null;
    const cfg = this.settings.periods[g];
    const parsed = moment(file.basename, cfg.format, "en", true);
    return parsed.isValid() ? parsed : null;
  }

  runOrganizeCommand(): void {
    const moves = planMigration(this.app, this.settings);
    new ConfirmMigrationModal(this.app, moves, async () => {
      const result = await runMigration(this.app, moves);
      if (result.skipped.length > 0) {
        new Notice(
          `Notes moved: ${result.moved}. Skipped due to name conflicts: ${result.skipped.length}.`
        );
      } else {
        new Notice(`Notes moved: ${result.moved}.`);
      }
    }).open();
  }
}

function mergeSettings(defaults: Settings, saved: Partial<Settings> | null): Settings {
  if (!saved) return structuredCloneSettings(defaults);
  const merged = structuredCloneSettings(defaults);
  if (saved.periods) {
    for (const g of GRANULARITIES) {
      if (saved.periods[g]) merged.periods[g] = { ...merged.periods[g], ...saved.periods[g] };
    }
  }
  return { ...merged, ...saved, periods: merged.periods };
}

function structuredCloneSettings(settings: Settings): Settings {
  return JSON.parse(JSON.stringify(settings)) as Settings;
}
