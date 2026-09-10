import { describe, expect, it } from "vitest";
import { moment } from "obsidian";
import { DEFAULT_SETTINGS } from "../src/settings";
import { findNote } from "../src/notes";
import { FakeApp } from "./mocks/fakeApp";

const settings = structuredClone(DEFAULT_SETTINGS);
const day = moment("2026-09-08", "YYYY-MM-DD", true);

describe("findNote для ежедневных заметок при смене dailySubfolderFormat", () => {
  it("находит заметку по текущему формату подпапки", () => {
    const app = new FakeApp();
    app.vault.addFile("Daily/September 2026/2026-09-08.md");

    const found = findNote(app as any, day, "day", settings);
    expect(found?.path).toBe("Daily/September 2026/2026-09-08.md");
  });

  it("находит заметку, созданную при старом формате подпапки, после смены настройки", () => {
    const app = new FakeApp();
    // Заметка лежит в папке по старому формату "MMMM YYYY".
    app.vault.addFile("Daily/September 2026/2026-09-08.md");

    // Пользователь сменил формат подпапки на "YYYY/MM".
    const changed = { ...settings, dailySubfolderFormat: "YYYY/MM" };

    const found = findNote(app as any, day, "day", changed);
    expect(found?.path).toBe("Daily/September 2026/2026-09-08.md");
  });

  it("не находит несуществующую заметку (не создаёт дубликат по ошибке)", () => {
    const app = new FakeApp();
    app.vault.addFile("Daily/September 2026/2026-09-07.md"); // другой день

    const found = findNote(app as any, day, "day", settings);
    expect(found).toBeNull();
  });

  it("находит заметку в корне папки Daily (нерасложенная)", () => {
    const app = new FakeApp();
    app.vault.addFile("Daily/2026-09-08.md");

    const found = findNote(app as any, day, "day", settings);
    expect(found?.path).toBe("Daily/2026-09-08.md");
  });
});
