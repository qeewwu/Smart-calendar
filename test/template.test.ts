import { describe, expect, it } from "vitest";
import { moment } from "obsidian";
import { applyTemplate } from "../src/template";

const baseCtx = (overrides: Partial<Parameters<typeof applyTemplate>[1]> = {}) => ({
  date: moment("2026-09-08", "YYYY-MM-DD"),
  granularity: "day" as const,
  title: "2026-09-08",
  nameFormat: "YYYY-MM-DD",
  weekStart: "monday" as const,
  ...overrides,
});

describe("applyTemplate", () => {
  it("подставляет {{date}} и {{date:FORMAT}}", () => {
    const out = applyTemplate("# {{date}}\nдень недели: {{date:dddd}}", baseCtx());
    expect(out).toBe("# 2026-09-08\nдень недели: Tuesday");
  });

  it("подставляет {{title}}", () => {
    expect(applyTemplate("Заметка: {{title}}", baseCtx({ title: "Моя заметка" }))).toBe(
      "Заметка: Моя заметка"
    );
  });

  it("подставляет {{prev}} / {{next}} для дня", () => {
    const out = applyTemplate("[[{{prev}}]] | [[{{next}}]]", baseCtx());
    expect(out).toBe("[[2026-09-07]] | [[2026-09-09]]");
  });

  it("подставляет {{prev}} / {{next}} для недели", () => {
    const ctx = baseCtx({
      date: moment("2026-09-08", "YYYY-MM-DD"),
      granularity: "week",
      nameFormat: "GGGG-[W]WW",
    });
    expect(applyTemplate("{{prev}} {{next}}", ctx)).toBe("2026-W36 2026-W38");
  });

  it("подставляет {{yesterday}} / {{tomorrow}}", () => {
    expect(applyTemplate("{{yesterday}} {{tomorrow}}", baseCtx())).toBe("2026-09-07 2026-09-09");
  });

  it("подставляет {{start}} / {{end}} для месяца", () => {
    const ctx = baseCtx({ granularity: "month" });
    expect(applyTemplate("{{start}} — {{end}}", ctx)).toBe("2026-09-01 — 2026-09-30");
  });

  it("подставляет {{week}}, {{month}}, {{quarter}}, {{year}}", () => {
    const out = applyTemplate("{{week}} / {{month}} / {{quarter}} / {{year}}", baseCtx());
    expect(out).toBe("37 / September / 3 / 2026");
  });

  it("подставляет сдвиг {{date+3d}} и {{date-1w}}", () => {
    const out = applyTemplate("{{date+3d}} {{date-1w:YYYY-MM-DD}}", baseCtx());
    expect(out).toBe("2026-09-11 2026-09-01");
  });

  it("оставляет неизвестные переменные как есть", () => {
    const out = applyTemplate("{{unknown}} {{title}}", baseCtx());
    expect(out).toBe("{{unknown}} 2026-09-08");
  });

  it("подставляет {{time}}", () => {
    const d = moment("2026-09-08T14:30:00", "YYYY-MM-DDTHH:mm:ss");
    const out = applyTemplate("{{time}}", baseCtx({ date: d }));
    expect(out).toBe("14:30");
  });
});
