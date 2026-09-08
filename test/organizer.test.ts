import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { DEFAULT_SETTINGS } from "../src/settings";
import { moveFile, planMigration, runMigration, targetPathForDaily } from "../src/organizer";
import { FakeApp } from "./mocks/fakeApp";

const settings = structuredClone(DEFAULT_SETTINGS);

function mkFile(path: string): TFile {
  const f = new TFile();
  f.path = path;
  const parts = path.split("/");
  f.name = parts[parts.length - 1];
  f.basename = f.name.replace(/\.md$/, "");
  return f;
}

describe("targetPathForDaily", () => {
  it("возвращает целевой путь для заметки, лежащей прямо в Daily/", () => {
    const file = mkFile("Daily/2026-09-08.md");
    file.parent = { path: "Daily" } as any;
    const target = targetPathForDaily(file, settings);
    expect(target).toBe("Daily/September 2026/2026-09-08.md");
  });

  it("возвращает null, если заметка уже в своей папке месяца", () => {
    const file = mkFile("Daily/September 2026/2026-09-08.md");
    file.parent = { path: "Daily/September 2026" } as any;
    expect(targetPathForDaily(file, settings)).toBeNull();
  });

  it("возвращает null для файла с именем не по формату дня", () => {
    const file = mkFile("Daily/notes.md");
    file.parent = { path: "Daily" } as any;
    expect(targetPathForDaily(file, settings)).toBeNull();
  });

  it("возвращает null для файла вне папки Daily", () => {
    const file = mkFile("Inbox/2026-09-08.md");
    file.parent = { path: "Inbox" } as any;
    expect(targetPathForDaily(file, settings)).toBeNull();
  });
});

describe("planMigration / runMigration с in-memory vault", () => {
  it("находит расфасованные заметки и переносит их", async () => {
    const app = new FakeApp();
    app.vault.addFile("Daily/2026-03-01.md");
    app.vault.addFile("Daily/2026-03-15.md");
    app.vault.addFile("Daily/September 2026/2026-09-08.md"); // уже на месте
    app.vault.addFile("Daily/not-a-date.md"); // игнорируется

    const moves = planMigration(app as any, settings);
    expect(moves.map((m) => m.to).sort()).toEqual([
      "Daily/March 2026/2026-03-01.md",
      "Daily/March 2026/2026-03-15.md",
    ]);

    const result = await runMigration(app as any, moves);
    expect(result.moved).toBe(2);
    expect(result.skipped).toEqual([]);

    expect(app.vault.getAbstractFileByPath("Daily/March 2026/2026-03-01.md")).toBeTruthy();
    expect(app.vault.getAbstractFileByPath("Daily/2026-03-01.md")).toBeNull();
  });

  it("пропускает перенос при конфликте путей", async () => {
    const app = new FakeApp();
    const src = app.vault.addFile("Daily/2026-03-01.md");
    app.vault.addFile("Daily/March 2026/2026-03-01.md"); // уже занято

    const ok = await moveFile(app as any, src, "Daily/March 2026/2026-03-01.md");
    expect(ok).toBe(false);
  });
});
