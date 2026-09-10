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
    contentEl.createEl("h2", { text: "Organize daily notes into folders" });

    if (this.moves.length === 0) {
      contentEl.createEl("p", { text: "All daily notes are already in their month folders." });
      new Setting(contentEl).addButton((b) =>
        b.setButtonText("Close").onClick(() => this.close())
      );
      return;
    }

    contentEl.createEl("p", {
      text: `Notes to move: ${this.moves.length}. Links to them will be updated automatically.`,
    });

    const list = contentEl.createEl("div", { cls: "smart-calendar-migration-list" });
    for (const move of this.moves) {
      const row = list.createEl("div", { cls: "smart-calendar-migration-row" });
      row.createSpan({ text: move.from, cls: "smart-calendar-migration-from" });
      row.createSpan({ text: " → ", cls: "smart-calendar-migration-arrow" });
      row.createSpan({ text: move.to, cls: "smart-calendar-migration-to" });
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(`Move (${this.moves.length})`)
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
