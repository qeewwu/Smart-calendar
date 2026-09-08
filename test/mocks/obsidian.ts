// Минимальный мок пакета "obsidian" для юнит-тестов чистых модулей.
import moment from "moment";

export { moment };

export function normalizePath(path: string): string {
  return path
    .split("/")
    .filter((p) => p.length > 0 && p !== ".")
    .join("/");
}

export class TAbstractFile {
  path = "";
  name = "";
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  basename = "";
  extension = "md";
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

export class App {
  vault: unknown;
}
