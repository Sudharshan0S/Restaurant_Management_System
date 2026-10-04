import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATEGORIES, DISHES, COMBOS } from "./menu.js";
import { imgSrc } from "../utils.js";
import { buildRecommendations } from "../menuRecommendations.js";

const publicDir = fileURLToPath(new URL("../../public/", import.meta.url));

describe("local menu data (frontend/src/data/menu.js)", () => {
  it("has the complete Indian menu", () => {
    expect(DISHES.map((d) => d.title)).toEqual([
      "Masala Dosa", "Chole Bhature", "Dahi Vada", "Paneer Tikka", "Tandoori Chicken", "Dal Tadka", "Hyderabadi Biryani",
      "Barfi", "Gajar Ka Halwa", "Kheer", "Kulfi Falooda", "Kulfi", "Phirni",
    ]);
    expect(DISHES.map((d) => d.id)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]);
    expect(CATEGORIES.map((c) => c.name)).toEqual(["Breakfast", "Starters", "Main Course", "Desserts"]);
    expect(COMBOS.map((c) => c.comboId)).toEqual(["C1", "C2", "C3", "C4", "C5"]);
    expect(DISHES.find((d) => d.title === "Hyderabadi Biryani").price).toBe(220);
  });
  it("every dish photo exists in public/ with the EXACT file name", () => {
    const files = new Set(readdirSync(publicDir));
    for (const d of DISHES) expect(files.has(d.image), `missing: ${d.image}`).toBe(true);
    for (const c of COMBOS.filter((x) => x.image)) expect(files.has(c.image), `missing: ${c.image}`).toBe(true);
  });
  it("image URLs are encoded for spaces, underscores and parentheses", () => {
    for (const d of DISHES) {
      const url = imgSrc(d.image);
      expect(existsSync(publicDir + decodeURI(url.slice(1)))).toBe(true);
      expect(url).not.toMatch(/\s/);
    }
  });
  it("is internally consistent", () => {
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
    expect(DISHES.every((d) => CATEGORIES.some((c) => c.name === d.category))).toBe(true);
    expect(COMBOS.every((c) => c.dishIds.every((id) => DISHES.some((d) => d.id === id)))).toBe(true);
    expect(DISHES.every((d) => d.price > 0)).toBe(true);
  });
});

describe("local recommendations", () => {
  const recs = buildRecommendations({ dishes: DISHES, combos: COMBOS });
  it("gives every dish an entry and never claims order history", () => {
    expect(Object.keys(recs)).toHaveLength(DISHES.length);
    for (const r of Object.values(recs)) { expect(r.source).toBe("predefined"); expect(r.basedOnOrders).toBe(0); }
  });
  it("suggests the combo add-on defined for that dish", () => {
    expect(recs["7"].suggestions.map((s) => s.name)).toEqual(["Raita"]);
    expect(recs["1"].suggestions[0]).toMatchObject({ type: "combo", id: "C1", name: "Filter Coffee", extraPrice: 40, count: null });
  });
  it("dishes without a combo simply have no suggestions (nothing breaks)", () => {
    expect(recs["8"].suggestions).toEqual([]);
  });
});
