import ErrorHandler from "../middlewares/error.js";

export const MAX_QTY = 20;
export const MAX_LINES = 20;

// Turns the client's cart ([{menuId, qty, comboId}]) into priced order lines.
// Prices come ONLY from `dishes` / `combos` (the server-side copy of data/menu.js) - never from the browser.
export function priceOrder(rawItems, dishes, combos) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new ErrorHandler("Your cart is empty.", 400);
  const dishMap = new Map(dishes.map((d) => [String(d.id), d]));
  const merged = new Map();
  for (const raw of rawItems) {
    const dish = dishMap.get(String(raw?.menuId));
    if (!dish) throw new ErrorHandler("One or more items are not on the menu.", 400);
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ErrorHandler(`Quantity must be between 1 and ${MAX_QTY}.`, 400);
    let combo = null;
    if (raw.comboId) {
      combo = combos.find((c) => c.comboId === String(raw.comboId));
      if (!combo || !combo.dishIds.includes(dish.id)) throw new ErrorHandler(`The selected combo is not available for ${dish.title}.`, 400);
    }
    const key = `${dish.id}|${combo ? combo.comboId : "_"}`;
    const nextQty = (merged.get(key)?.qty || 0) + qty;
    if (nextQty > MAX_QTY) throw new ErrorHandler(`Quantity must be between 1 and ${MAX_QTY}.`, 400);
    const comboExtra = combo ? combo.extraPrice : 0;
    const price = dish.price + comboExtra;
    merged.set(key, {
      menuId: dish.id, name: dish.title, qty: nextQty, price,
      comboId: combo ? combo.comboId : null, comboName: combo ? combo.comboName : null,
      comboExtra, lineTotal: price * nextQty,
    });
  }
  const items = [...merged.values()];
  if (items.length > MAX_LINES) throw new ErrorHandler("Too many different items in one order.", 400);
  return { items, total: items.reduce((s, i) => s + i.lineTotal, 0) };
}
