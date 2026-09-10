import { App, PluginSettingTab, Setting } from "obsidian";
import type SmartCalendarPlugin from "./main";
import { GRANULARITIES, formatName } from "./periods";
import { GRANULARITY_LABELS } from "./settings";
import { moment } from "obsidian";

export class SmartCalendarSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SmartCalendarPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const enabledPlugins: Set<string> | undefined = (this.app as unknown as {
      plugins?: { enabledPlugins?: Set<string> };
    }).plugins?.enabledPlugins;
    if (enabledPlugins?.has("calendar")) {
      new Setting(containerEl).setDesc(
        "⚠️ The built-in Calendar plugin is enabled — consider disabling it to avoid duplication."
      );
    }
    if (enabledPlugins?.has("periodic-notes")) {
      new Setting(containerEl).setDesc(
        "⚠️ The Periodic Notes plugin is enabled — its features overlap with Smart Calendar."
      );
    }

    containerEl.createEl("h2", { text: "General" });

    new Setting(containerEl)
      .setName("Week starts on")
      .setDesc("Which day counts as the first day of the week for weekly notes and the calendar")
      .addDropdown((d) =>
        d
          .addOption("monday", "Monday (ISO)")
          .addOption("sunday", "Sunday")
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (v) => {
            this.plugin.settings.weekStart = v as "monday" | "sunday";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show week numbers")
      .setDesc("A column of week numbers to the left of the calendar grid")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showWeekNumbers).onChange(async (v) => {
          this.plugin.settings.showWeekNumbers = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Mark days with notes")
      .setDesc("A small dot under the date, no word-count indicators")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.markExistingNotes).onChange(async (v) => {
          this.plugin.settings.markExistingNotes = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Open in a new tab")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.openInNewTab).onChange(async (v) => {
          this.plugin.settings.openInNewTab = v;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h2", { text: "Daily notes" });

    new Setting(containerEl)
      .setName("Auto-organize into month folders")
      .setDesc('New notes are placed straight into a subfolder like "September 2026"')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.autoOrganize).onChange(async (v) => {
          this.plugin.settings.autoOrganize = v;
          await this.plugin.saveSettings();
        })
      );

    const subExample = containerEl.createEl("div", { cls: "setting-item-description" });
    new Setting(containerEl)
      .setName("Month subfolder format")
      .setDesc("Always in English, regardless of the interface language")
      .addText((t) => {
        t.setValue(this.plugin.settings.dailySubfolderFormat).onChange(async (v) => {
          this.plugin.settings.dailySubfolderFormat = v || "MMMM YYYY";
          await this.plugin.saveSettings();
          this.updateExample(subExample, this.plugin.settings.dailySubfolderFormat);
        });
      });
    this.updateExample(subExample, this.plugin.settings.dailySubfolderFormat);

    for (const g of GRANULARITIES) {
      this.buildPeriodSection(containerEl, g);
    }

    containerEl.createEl("h2", { text: "Maintenance" });
    new Setting(containerEl)
      .setName("Organize daily notes into folders")
      .setDesc("One-off move of all existing notes into their month folders")
      .addButton((b) =>
        b.setButtonText("Run").onClick(() => {
          this.plugin.runOrganizeCommand();
        })
      );
  }

  private updateExample(el: HTMLElement, format: string): void {
    el.empty();
    try {
      el.setText(`Example: → ${formatName(moment(), format)}`);
    } catch {
      el.setText("Invalid format");
    }
  }

  private buildPeriodSection(containerEl: HTMLElement, g: (typeof GRANULARITIES)[number]): void {
    const cfg = this.plugin.settings.periods[g];
    containerEl.createEl("h3", { text: GRANULARITY_LABELS[g] });

    if (g !== "day") {
      new Setting(containerEl).setName("Enable").addToggle((t) =>
        t.setValue(cfg.enabled).onChange(async (v) => {
          cfg.enabled = v;
          await this.plugin.saveSettings();
          this.plugin.refreshCalendarView();
        })
      );
    }

    new Setting(containerEl).setName("Folder").addText((t) =>
      t.setValue(cfg.folder).onChange(async (v) => {
        cfg.folder = v || cfg.folder;
        await this.plugin.saveSettings();
      })
    );

    const example = containerEl.createEl("div", { cls: "setting-item-description smart-calendar-format-example" });
    new Setting(containerEl).setName("Filename format").addText((t) => {
      t.setValue(cfg.format).onChange(async (v) => {
        cfg.format = v || cfg.format;
        await this.plugin.saveSettings();
        this.updateExample(example, cfg.format);
      });
    });
    this.updateExample(example, cfg.format);

    new Setting(containerEl)
      .setName("Template file")
      .setDesc("Path to a .md template file, empty = no template")
      .addText((t) => {
        t.setPlaceholder("Templates/Daily.md");
        t.setValue(cfg.template).onChange(async (v) => {
          cfg.template = v;
          await this.plugin.saveSettings();
        });
      });
  }
}
