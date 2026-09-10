import { AbstractInputSuggest, TFile, TFolder, type App } from "obsidian";

/**
 * Автодополнение пути к папке в текстовом поле — тот же UX, что у "New file location"
 * в стандартном плагине Daily Notes.
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    private onPick: (folder: TFolder) => void
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): TFolder[] {
    const lower = query.toLowerCase();
    const folders: TFolder[] = [];
    const collect = (folder: TFolder): void => {
      folders.push(folder);
      for (const child of folder.children) {
        if (child instanceof TFolder) collect(child);
      }
    };
    collect(this.app.vault.getRoot());

    return folders
      .filter((f) => f.path.toLowerCase().includes(lower))
      .sort((a, b) => a.path.length - b.path.length)
      .slice(0, 200);
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path === "" ? "/" : folder.path);
  }

  selectSuggestion(folder: TFolder): void {
    this.setValue(folder.path);
    this.inputEl.trigger("input");
    this.onPick(folder);
    this.close();
  }
}

/**
 * Автодополнение пути к .md-файлу — тот же UX, что у "Template file location"
 * в стандартном плагине Daily Notes.
 */
export class TemplateFileSuggest extends AbstractInputSuggest<TFile> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    private onPick: (file: TFile) => void
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): TFile[] {
    const lower = query.toLowerCase();
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => f.path.toLowerCase().includes(lower))
      .sort((a, b) => a.path.length - b.path.length)
      .slice(0, 200);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile): void {
    this.setValue(file.path);
    this.inputEl.trigger("input");
    this.onPick(file);
    this.close();
  }
}
