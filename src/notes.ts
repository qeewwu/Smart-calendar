import { normalizePath, TFile, TFolder, type App } from "obsidian";
import type { Moment } from "moment";
import { formatName, monthFolderName, startOf, type Granularity } from "./periods";
import { applyTemplate } from "./template";
import type { Settings } from "./settings";

/** Путь до папки, в которой должна лежать заметка данного periода (без имени файла). */
export function folderFor(date: Moment, g: Granularity, settings: Settings): string {
  const cfg = settings.periods[g];
  if (g === "day") {
    const sub = monthFolderName(date, settings.dailySubfolderFormat);
    return normalizePath(`${cfg.folder}/${sub}`);
  }
  return normalizePath(cfg.folder);
}

/** Полный путь к заметке (с расширением .md). */
export function pathFor(date: Moment, g: Granularity, settings: Settings): string {
  const name = formatName(date, settings.periods[g].format);
  return normalizePath(`${folderFor(date, g, settings)}/${name}.md`);
}

/**
 * Ищет существующий файл заметки. Для дня, если её нет по текущему пути (текущий формат
 * подпапки месяца), дополнительно ищет её по всей папке Daily рекурсивно — так заметки,
 * созданные при старом значении dailySubfolderFormat (или лежащие в корне Daily), всё равно
 * находятся, а не дублируются пустым файлом по новому пути.
 */
export function findNote(app: App, date: Moment, g: Granularity, settings: Settings): TFile | null {
  const primary = pathFor(date, g, settings);
  const byPrimary = app.vault.getAbstractFileByPath(primary);
  if (byPrimary instanceof TFile) return byPrimary;

  if (g === "day") {
    const cfg = settings.periods.day;
    const fileName = `${formatName(date, cfg.format)}.md`;
    const root = app.vault.getAbstractFileByPath(normalizePath(cfg.folder));
    if (root instanceof TFolder) return findFileByName(root, fileName);
  }
  return null;
}

function findFileByName(folder: TFolder, fileName: string): TFile | null {
  for (const child of folder.children) {
    if (child instanceof TFile && child.name === fileName) return child;
  }
  for (const child of folder.children) {
    if (child instanceof TFolder) {
      const found = findFileByName(child, fileName);
      if (found) return found;
    }
  }
  return null;
}

async function ensureFolder(app: App, path: string): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFolder) return;
  if (existing instanceof TFile) throw new Error(`Path "${path}" is occupied by a file`);

  const parts = path.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const node = app.vault.getAbstractFileByPath(current);
    if (node instanceof TFolder) continue;
    if (node instanceof TFile) throw new Error(`Path "${current}" is occupied by a file`);
    try {
      await app.vault.createFolder(current);
    } catch (e) {
      // Гонка: папку могла успеть создать параллельная операция — перепроверяем.
      const recheck = app.vault.getAbstractFileByPath(current);
      if (!(recheck instanceof TFolder)) throw e;
    }
  }
}

async function readTemplate(app: App, templatePath: string): Promise<string> {
  if (!templatePath) return "";
  const file = app.vault.getAbstractFileByPath(normalizePath(templatePath));
  if (!(file instanceof TFile)) return "";
  return app.vault.cachedRead(file);
}

/** Создаёт заметку для периода (с шаблоном, если он настроен) и возвращает файл. */
export async function createNote(app: App, date: Moment, g: Granularity, settings: Settings): Promise<TFile> {
  const cfg = settings.periods[g];
  const folder = folderFor(date, g, settings);
  await ensureFolder(app, folder);

  const path = pathFor(date, g, settings);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;

  const name = formatName(date, cfg.format);
  const templateText = await readTemplate(app, cfg.template);
  const content = templateText
    ? applyTemplate(templateText, {
        date,
        granularity: g,
        title: name,
        nameFormat: cfg.format,
        weekStart: settings.weekStart,
      })
    : "";

  return app.vault.create(path, content);
}

/** Возвращает существующую заметку или создаёт новую. */
export async function getOrCreateNote(app: App, date: Moment, g: Granularity, settings: Settings): Promise<TFile> {
  const existing = findNote(app, date, g, settings);
  if (existing) return existing;
  return createNote(app, date, g, settings);
}

export function normalizedStartOf(date: Moment, g: Granularity, settings: Settings): Moment {
  return startOf(date, g, settings.weekStart);
}
