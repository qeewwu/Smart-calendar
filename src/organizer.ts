import { normalizePath, TFile, TFolder, type App } from "obsidian";
import { formatName, monthFolderName, parseName } from "./periods";
import type { Settings } from "./settings";

export interface PlannedMove {
  file: TFile;
  from: string;
  to: string;
}

/**
 * Если файл — это ежедневная заметка (по формату имени), лежащая не в своей папке месяца,
 * возвращает целевой путь. Иначе null.
 */
export function targetPathForDaily(file: TFile, settings: Settings): string | null {
  const cfg = settings.periods.day;
  if (!file.path.startsWith(`${normalizePath(cfg.folder)}/`) && file.parent?.path !== cfg.folder) {
    // Не в папке Daily вовсе — не наша забота.
    return null;
  }

  const date = parseName(file.basename, cfg.format);
  if (!date) return null;

  const sub = monthFolderName(date, settings.dailySubfolderFormat);
  const targetFolder = normalizePath(`${cfg.folder}/${sub}`);
  const targetPath = normalizePath(`${targetFolder}/${formatName(date, cfg.format)}.md`);

  if (file.path === targetPath) return null;
  return targetPath;
}

/** Собирает список всех ежедневных заметок, лежащих не в своей папке месяца. */
export function planMigration(app: App, settings: Settings): PlannedMove[] {
  const cfg = settings.periods.day;
  const root = app.vault.getAbstractFileByPath(normalizePath(cfg.folder));
  if (!(root instanceof TFolder)) return [];

  const moves: PlannedMove[] = [];
  const visit = (folder: TFolder) => {
    for (const child of folder.children) {
      if (child instanceof TFolder) {
        visit(child);
      } else if (child instanceof TFile && child.extension === "md") {
        const target = targetPathForDaily(child, settings);
        if (target) moves.push({ file: child, from: child.path, to: target });
      }
    }
  };
  visit(root);
  return moves;
}

async function ensureFolderPath(app: App, path: string): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFolder) return;
  const parts = path.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const node = app.vault.getAbstractFileByPath(current);
    if (node instanceof TFolder) continue;
    try {
      await app.vault.createFolder(current);
    } catch {
      // возможна гонка — папка уже создана параллельно, продолжаем
    }
  }
}

/** Выполняет перенос одного файла с обновлением ссылок. Возвращает false, если путь занят другим файлом. */
export async function moveFile(app: App, file: TFile, to: string): Promise<boolean> {
  const conflict = app.vault.getAbstractFileByPath(to);
  if (conflict) return false;
  const folder = to.substring(0, to.lastIndexOf("/"));
  if (folder) await ensureFolderPath(app, folder);
  await app.fileManager.renameFile(file, to);
  return true;
}

export async function runMigration(app: App, moves: PlannedMove[]): Promise<{ moved: number; skipped: string[] }> {
  let moved = 0;
  const skipped: string[] = [];
  for (const m of moves) {
    const ok = await moveFile(app, m.file, m.to);
    if (ok) moved++;
    else skipped.push(m.from);
  }
  return { moved, skipped };
}

/**
 * Устанавливает слушатель события создания файла в vault и авто-переносит
 * свежесозданные ежедневные заметки в папку месяца.
 */
export function registerAutoOrganize(app: App, getSettings: () => Settings): (file: unknown) => void {
  const handler = (file: unknown) => {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    const settings = getSettings();
    if (!settings.autoOrganize) return;

    // Небольшая задержка: даём Daily Notes / другим плагинам дописать содержимое,
    // и не реагируем на собственный renameFile (у него другое событие — "rename").
    window.setTimeout(() => {
      const target = targetPathForDaily(file, settings);
      if (!target) return;
      const conflict = app.vault.getAbstractFileByPath(target);
      if (conflict) return;
      void moveFile(app, file, target);
    }, 300);
  };
  return handler;
}
