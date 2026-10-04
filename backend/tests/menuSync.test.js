// The server keeps a copy of the menu ONLY to re-check order prices. It must never drift from the frontend's menu.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as server from "../data/menu.js";

const frontendFile = fileURLToPath(new URL("../../frontend/src/data/menu.js", import.meta.url));

test("backend price list matches the frontend menu exactly", { skip: !existsSync(frontendFile) && "frontend folder not present (backend deployed alone)" }, async () => {
  const frontend = await import(frontendFile);
  assert.deepEqual(server.CATEGORIES, frontend.CATEGORIES);
  assert.deepEqual(server.DISHES, frontend.DISHES);
  assert.deepEqual(server.COMBOS, frontend.COMBOS);
  assert.equal(readFileSync(frontendFile, "utf8"), readFileSync(fileURLToPath(new URL("../data/menu.js", import.meta.url)), "utf8"), "files differ - run `npm run sync-menu` in the project root");
});

test("menu data is internally consistent", () => {
  const ids = server.DISHES.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate dish ids");
  assert.ok(server.DISHES.every((d) => server.CATEGORIES.some((c) => c.name === d.category)), "dish with unknown category");
  assert.ok(server.COMBOS.every((c) => c.dishIds.every((id) => ids.includes(id))), "combo refers to a missing dish");
  assert.ok(server.DISHES.every((d) => Number.isFinite(d.price) && d.price > 0));
});
