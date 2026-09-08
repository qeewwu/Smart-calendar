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
        "⚠️ Включён стандартный плагин Calendar — рекомендуется отключить его, чтобы избежать дублирования."
      );
    }
    if (enabledPlugins?.has("periodic-notes")) {
      new Setting(containerEl).setDesc(
        "⚠️ Включён плагин Periodic Notes — его функции пересекаются со Smart Calendar."
      );
    }

    containerEl.createEl("h2", { text: "Общие настройки" });

    new Setting(containerEl)
      .setName("Начало недели")
      .setDesc("Как считать первый день недели для недельных заметок и календаря")
      .addDropdown((d) =>
        d
          .addOption("monday", "Понедельник (ISO)")
          .addOption("sunday", "Воскресенье")
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (v) => {
            this.plugin.settings.weekStart = v as "monday" | "sunday";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Показывать номера недель")
      .setDesc("Колонка с номерами недель слева от сетки календаря")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showWeekNumbers).onChange(async (v) => {
          this.plugin.settings.showWeekNumbers = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Выделять дни с заметками")
      .setDesc("Жирным шрифтом, без точек-индикаторов")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.markExistingNotes).onChange(async (v) => {
          this.plugin.settings.markExistingNotes = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Открывать в новой вкладке")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.openInNewTab).onChange(async (v) => {
          this.plugin.settings.openInNewTab = v;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h2", { text: "Ежедневные заметки" });

    new Setting(containerEl)
      .setName("Автоматически раскладывать по папкам месяцев")
      .setDesc('Новая заметка сразу попадает в подпапку вида "September 2026"')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.autoOrganize).onChange(async (v) => {
          this.plugin.settings.autoOrganize = v;
          await this.plugin.saveSettings();
        })
      );

    const subExample = containerEl.createEl("div", { cls: "setting-item-description" });
    new Setting(containerEl)
      .setName("Формат подпапки месяца")
      .setDesc("Всегда на английском, независимо от языка интерфейса")
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

    containerEl.createEl("h2", { text: "Обслуживание" });
    new Setting(containerEl)
      .setName("Разложить ежедневные заметки по папкам")
      .setDesc("Однократно переносит все старые заметки в папки их месяцев")
      .addButton((b) =>
        b.setButtonText("Запустить").onClick(() => {
          this.plugin.runOrganizeCommand();
        })
      );
  }

  private updateExample(el: HTMLElement, format: string): void {
    el.empty();
    try {
      el.setText(`Пример: → ${formatName(moment(), format)}`);
    } catch {
      el.setText("Некорректный формат");
    }
  }

  private buildPeriodSection(containerEl: HTMLElement, g: (typeof GRANULARITIES)[number]): void {
    const cfg = this.plugin.settings.periods[g];
    containerEl.createEl("h3", { text: GRANULARITY_LABELS[g] });

    if (g !== "day") {
      new Setting(containerEl).setName("Включить").addToggle((t) =>
        t.setValue(cfg.enabled).onChange(async (v) => {
          cfg.enabled = v;
          await this.plugin.saveSettings();
          this.plugin.refreshCalendarView();
        })
      );
    }

    new Setting(containerEl).setName("Папка").addText((t) =>
      t.setValue(cfg.folder).onChange(async (v) => {
        cfg.folder = v || cfg.folder;
        await this.plugin.saveSettings();
      })
    );

    const example = containerEl.createEl("div", { cls: "setting-item-description smart-calendar-format-example" });
    new Setting(containerEl).setName("Формат имени файла").addText((t) => {
      t.setValue(cfg.format).onChange(async (v) => {
        cfg.format = v || cfg.format;
        await this.plugin.saveSettings();
        this.updateExample(example, cfg.format);
      });
    });
    this.updateExample(example, cfg.format);

    new Setting(containerEl)
      .setName("Файл шаблона")
      .setDesc("Путь к .md-файлу с шаблоном, пусто = без шаблона")
      .addText((t) => {
        t.setPlaceholder("Templates/Daily.md");
        t.setValue(cfg.template).onChange(async (v) => {
          cfg.template = v;
          await this.plugin.saveSettings();
        });
      });
  }
}
