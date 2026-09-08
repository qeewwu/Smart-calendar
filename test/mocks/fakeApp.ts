import { TFile, TFolder, normalizePath } from "obsidian";

/** Простейший in-memory vault для тестов organizer.ts (без реального Obsidian). */
export class FakeVault {
  private files = new Map<string, TFile>();
  private folders = new Map<string, TFolder>();

  constructor() {
    const root = new TFolder();
    root.path = "";
    root.name = "";
    this.folders.set("", root);
  }

  private folderOf(path: string): TFolder | undefined {
    const idx = path.lastIndexOf("/");
    const parentPath = idx === -1 ? "" : path.slice(0, idx);
    return this.folders.get(parentPath);
  }

  addFolder(path: string): TFolder {
    path = normalizePath(path);
    const existing = this.folders.get(path);
    if (existing) return existing;
    const folder = new TFolder();
    folder.path = path;
    folder.name = path.split("/").pop() ?? path;
    this.folders.set(path, folder);
    const parent = this.folderOf(path);
    if (parent) {
      folder.parent = parent;
      parent.children.push(folder);
    }
    return folder;
  }

  addFile(path: string): TFile {
    path = normalizePath(path);
    const file = new TFile();
    file.path = path;
    const parts = path.split("/");
    file.name = parts[parts.length - 1];
    file.basename = file.name.replace(/\.md$/, "");
    file.extension = "md";
    this.files.set(path, file);
    const idx = path.lastIndexOf("/");
    const parentPath = idx === -1 ? "" : path.slice(0, idx);
    const parent = this.folders.get(parentPath) ?? this.addFolder(parentPath);
    file.parent = parent;
    parent.children.push(file);
    return file;
  }

  getAbstractFileByPath(path: string) {
    path = normalizePath(path);
    return this.files.get(path) ?? this.folders.get(path) ?? null;
  }

  async createFolder(path: string) {
    this.addFolder(path);
  }

  async cachedRead(file: TFile): Promise<string> {
    return "";
  }

  async create(path: string, content: string): Promise<TFile> {
    const file = this.addFile(path);
    return file;
  }
}

export class FakeFileManager {
  constructor(private vault: FakeVault) {}

  async renameFile(file: TFile, newPath: string) {
    newPath = normalizePath(newPath);
    // убрать из старой родительской папки
    if (file.parent) {
      file.parent.children = file.parent.children.filter((c) => c !== file);
    }
    (this.vault as any).files.delete(file.path);
    file.path = newPath;
    const parts = newPath.split("/");
    file.name = parts[parts.length - 1];
    file.basename = file.name.replace(/\.md$/, "");
    const idx = newPath.lastIndexOf("/");
    const parentPath = idx === -1 ? "" : newPath.slice(0, idx);
    let parent = this.vault.getAbstractFileByPath(parentPath) as TFolder | null;
    if (!parent) {
      parent = this.vault.addFolder(parentPath);
    }
    file.parent = parent;
    parent.children.push(file);
    (this.vault as any).files.set(newPath, file);
  }
}

export class FakeApp {
  vault: FakeVault;
  fileManager: FakeFileManager;

  constructor() {
    this.vault = new FakeVault();
    this.fileManager = new FakeFileManager(this.vault);
  }
}
