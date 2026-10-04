import { describe, it, expect } from "vitest";
import { balancedChunks, buildPages, capacityFor, cardHeight, maxTurns, LAYOUT } from "./menuPages.js";

const dish = (id, category) => ({ id: String(id), title: `Dish ${id}`, category, price: 100 });
const menu = {
  categories: [{ name: "Breakfast" }, { name: "Desserts" }],
  dishes: [dish(1, "Breakfast"), dish(2, "Breakfast"), ...[3, 4, 5, 6, 7, 8].map((i) => dish(i, "Desserts"))],
  combos: [{ comboId: "C1" }, { comboId: "C2" }, { comboId: "C3" }],
};

describe("menu book pagination", () => {
  it("balances pages instead of leaving a nearly empty last page", () => {
    expect(balancedChunks([1, 2, 3, 4, 5, 6], 4).map((c) => c.length)).toEqual([3, 3]);
    expect(balancedChunks([1, 2, 3, 4, 5], 4).map((c) => c.length)).toEqual([3, 2]);
    expect(balancedChunks([], 4)).toEqual([]);
  });
  it("starts with a cover, then categories, then combos, with page numbers", () => {
    const pages = buildPages(menu, { capacity: 4, comboCapacity: 4 });
    expect(pages.map((p) => p.type)).toEqual(["cover", "category", "category", "category", "combos"]);
    expect(pages[0].number).toBeNull();
    expect(pages.at(-1).number).toBe(5);
  });
  it("overflowing categories continue on a new page that repeats the category title", () => {
    const pages = buildPages(menu, { capacity: 4 }).filter((p) => p.type === "category" && p.cat.name === "Desserts");
    expect(pages).toHaveLength(2);
    expect(pages.every((p) => p.cat.name === "Desserts")).toBe(true);
    expect(pages.map((p) => `${p.part}/${p.parts}`)).toEqual(["1/2", "2/2"]);
  });
  it("never puts more items on a page than the capacity", () => {
    for (const capacity of [1, 2, 3, 4, 5]) {
      const pages = buildPages(menu, { capacity });
      expect(pages.filter((p) => p.type === "category").every((p) => p.items.length <= capacity)).toBe(true);
    }
  });
  it("uses every dish exactly once", () => {
    const ids = buildPages(menu, { capacity: 3 }).filter((p) => p.type === "category").flatMap((p) => p.items.map((d) => d.id));
    expect(ids.sort()).toEqual(menu.dishes.map((d) => d.id).sort());
  });
  it("adapts automatically when dishes are added", () => {
    const bigger = { ...menu, dishes: [...menu.dishes, dish(9, "Desserts"), dish(10, "Desserts")] };
    const count = (m) => buildPages(m, { capacity: 4 }).filter((p) => p.cat?.name === "Desserts").length;
    expect(count(menu)).toBe(2);
    expect(count({ ...bigger, dishes: [...bigger.dishes, ...[11, 12, 13].map((i) => dish(i, "Desserts"))] })).toBe(3);
  });
  it("capacity grows with page height but is never below 1", () => {
    expect(capacityFor(720)).toBe(4);
    expect(capacityFor(610)).toBe(3);
    expect(capacityFor(100)).toBe(1);
    expect(capacityFor(720)).toBeGreaterThanOrEqual(capacityFor(610));
  });
  it("cards at full capacity are never shorter than the minimum card height", () => {
    for (const h of [560, 600, 610, 720, 760, 900]) {
      const cap = capacityFor(h);
      const list = h - LAYOUT.padTop - LAYOUT.padBottom - LAYOUT.headH - LAYOUT.headGap;
      expect((list - (cap - 1) * LAYOUT.gap) / cap).toBeGreaterThanOrEqual(LAYOUT.cardMin - 0.01);
    }
  });
  it("number of turns for spread and single page modes", () => {
    expect(maxTurns(8, true)).toBe(4);
    expect(maxTurns(9, true)).toBe(4);
    expect(maxTurns(8, false)).toBe(7);
  });
  it("card height fills the page for a full page and is capped on sparse pages", () => {
    expect(cardHeight(720, 4)).toBeGreaterThanOrEqual(LAYOUT.cardMin);
    expect(cardHeight(720, 3)).toBeLessThan(230);
    expect(cardHeight(720, 1)).toBe(230);
    expect(cardHeight(720, 2)).toBe(230);
    for (const n of [1, 2, 3, 4]) {
      const list = 720 - LAYOUT.padTop - LAYOUT.padBottom - LAYOUT.headH - LAYOUT.headGap;
      expect(cardHeight(720, n) * n + (n - 1) * LAYOUT.gap).toBeLessThanOrEqual(list);
    }
  });
});
