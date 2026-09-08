import { App, Modal, Setting } from "obsidian";
import type { PlannedMove } from "../organizer";

export class ConfirmMigrationModal extends Modal {
  constructor(
    app: App,
    private moves: PlannedMove[],
    private onConfirm: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Разложить ежедневные заметки по папкам" });

    if (this.moves.length === 0) {
      contentEl.createEl("p", { text: "Все ежедневные заметки уже лежат в своих папках месяцев." });
      new Setting(contentEl).addButton((b) =>
        b.setButtonText("Закрыть").onClick(() => this.close())
      );
      return;
    }

    contentEl.createEl("p", {
      text: `Будет перенесено заметок: ${this.moves.length}. Ссылки на них будут обновлены автоматически.`,
    });

    const list = contentEl.createEl("div", { cls: "smart-calendar-migration-list" });
    for (const move of this.moves) {
      const row = list.createEl("div", { cls: "smart-calendar-migration-row" });
      row.createSpan({ text: move.from, cls: "smart-calendar-migration-from" });
      row.createSpan({ text: " → ", cls: "smart-calendar-migration-arrow" });
      row.createSpan({ text: move.to, cls: "smart-calendar-migration-to" });
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Отмена").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(`Перенести (${this.moves.length})`)
          .setCta()
          .onClick(() => {
            this.close();
            this.onConfirm();
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
