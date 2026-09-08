import { describe, expect, it } from "vitest";
import { moment } from "obsidian";
import {
  applyOffset,
  endOf,
  formatName,
  monthFolderName,
  next,
  normalizeFormat,
  parseName,
  prev,
  startOf,
} from "../src/periods";

describe("normalizeFormat", () => {
  it("конвертирует date-fns-подобные токены в moment", () => {
    expect(normalizeFormat("yyyy-MM-dd")).toBe("YYYY-MM-DD");
    expect(normalizeFormat("dd.MM.yyyy")).toBe("DD.MM.YYYY");
  });

  it("не трогает уже валидные moment-форматы", () => {
    expect(normalizeFormat("YYYY-MM-DD")).toBe("YYYY-MM-DD");
    expect(normalizeFormat("GGGG-[W]WW")).toBe("GGGG-[W]WW");
  });
});

describe("formatName / parseName", () => {
  it("форматирует и парсит день", () => {
    const d = moment("2026-09-08", "YYYY-MM-DD");
    const name = formatName(d, "YYYY-MM-DD");
    expect(name).toBe("2026-09-08");
    const parsed = parseName(name, "YYYY-MM-DD");
    expect(parsed?.isValid()).toBe(true);
    expect(parsed?.format("YYYY-MM-DD")).toBe("2026-09-08");
  });

  it("возвращает null для несовпадающего формата", () => {
    expect(parseName("hello world", "YYYY-MM-DD")).toBeNull();
    expect(parseName("2026-13-40", "YYYY-MM-DD")).toBeNull();
  });

  it("форматирует имя недели по ISO", () => {
    const d = moment("2026-09-08", "YYYY-MM-DD");
    const name = formatName(d, "GGGG-[W]WW");
    expect(name).toBe("2026-W37");
  });

  it("форматирует квартал", () => {
    const d = moment("2026-11-15", "YYYY-MM-DD");
    expect(formatName(d, "YYYY-[Q]Q")).toBe("2026-Q4");
  });
});

describe("monthFolderName — всегда на английском", () => {
  it("не зависит от текущей локали moment", () => {
    moment.locale("ru");
    const d = moment("2026-09-08", "YYYY-MM-DD");
    expect(monthFolderName(d, "MMMM YYYY")).toBe("September 2026");
    moment.locale("en");
  });
});

describe("startOf / endOf — недели", () => {
  it("ISO-неделя (понедельник-воскресенье) для 2026-09-08 (вторник)", () => {
    const d = moment("2026-09-08", "YYYY-MM-DD");
    expect(startOf(d, "week", "monday").format("YYYY-MM-DD")).toBe("2026-09-07");
    expect(endOf(d, "week", "monday").format("YYYY-MM-DD")).toBe("2026-09-13");
  });

  it("неделя с началом в воскресенье", () => {
    const d = moment("2026-09-08", "YYYY-MM-DD");
    expect(startOf(d, "week", "sunday").format("YYYY-MM-DD")).toBe("2026-09-06");
    expect(endOf(d, "week", "sunday").format("YYYY-MM-DD")).toBe("2026-09-12");
  });

  it("31.12.2026 и 01.01.2027 попадают в одну и ту же ISO-неделю (2026-W53)", () => {
    expect(formatName(moment("2026-12-31", "YYYY-MM-DD"), "GGGG-[W]WW")).toBe("2026-W53");
    expect(formatName(moment("2027-01-01", "YYYY-MM-DD"), "GGGG-[W]WW")).toBe("2026-W53");
  });
});

describe("startOf / endOf — квартал и год", () => {
  it("Q4 2026", () => {
    const d = moment("2026-11-15", "YYYY-MM-DD");
    expect(startOf(d, "quarter").format("YYYY-MM-DD")).toBe("2026-10-01");
    expect(endOf(d, "quarter").format("YYYY-MM-DD")).toBe("2026-12-31");
  });

  it("год", () => {
    const d = moment("2026-06-01", "YYYY-MM-DD");
    expect(startOf(d, "year").format("YYYY-MM-DD")).toBe("2026-01-01");
    expect(endOf(d, "year").format("YYYY-MM-DD")).toBe("2026-12-31");
  });
});

describe("prev / next", () => {
  it("переход через границу месяца/года для дня", () => {
    const d = moment("2026-01-01", "YYYY-MM-DD");
    expect(prev(d, "day").format("YYYY-MM-DD")).toBe("2025-12-31");
    expect(next(d, "day").format("YYYY-MM-DD")).toBe("2026-01-02");
  });

  it("переход недели через границу года (ISO)", () => {
    const d = moment("2027-01-01", "YYYY-MM-DD"); // неделя 2026-W53
    expect(formatName(prev(d, "week"), "GGGG-[W]WW")).toBe("2026-W52");
    expect(formatName(next(d, "week"), "GGGG-[W]WW")).toBe("2027-W01");
  });

  it("переход квартала через границу года", () => {
    const d = moment("2026-01-15", "YYYY-MM-DD"); // Q1 2026
    expect(formatName(prev(d, "quarter"), "YYYY-[Q]Q")).toBe("2025-Q4");
  });
});

describe("applyOffset", () => {
  it("поддерживает дни/недели/месяцы/кварталы/годы, вперёд и назад", () => {
    const d = moment("2026-09-08", "YYYY-MM-DD");
    expect(applyOffset(d, "+3d").format("YYYY-MM-DD")).toBe("2026-09-11");
    expect(applyOffset(d, "-1w").format("YYYY-MM-DD")).toBe("2026-09-01");
    expect(applyOffset(d, "+2M").format("YYYY-MM-DD")).toBe("2026-11-08");
    expect(applyOffset(d, "+1Q").format("YYYY-MM-DD")).toBe("2026-12-08");
    expect(applyOffset(d, "-1y").format("YYYY-MM-DD")).toBe("2025-09-08");
  });

  it("возвращает копию исходной даты для нераспознанного смещения", () => {
    const d = moment("2026-09-08", "YYYY-MM-DD");
    expect(applyOffset(d, "bogus").format("YYYY-MM-DD")).toBe("2026-09-08");
  });
});
