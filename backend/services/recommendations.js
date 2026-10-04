// Frequency-based combo recommendations.
//
// For every order we build a set of "tokens": one per dish (d:<id>) and one per
// combo selected (c:<id>). Co-occurrence(A, B) = number of orders containing both A and B.
// For dish A we recommend the tokens B with the highest co-occurrence(A, B).
//
// Real data is used only when there is enough of it (MIN_DISH_ORDERS orders containing
// the dish and MIN_PAIR_COUNT orders containing the pair). Otherwise we fall back to the
// predefined combos for that dish and label the result source: "predefined".

export const MIN_DISH_ORDERS = 3;
export const MIN_PAIR_COUNT = 2;

export const tokensForOrder = (order) => {
  const set = new Set();
  for (const i of order.items || []) {
    set.add(`d:${i.menuId}`);
    if (i.comboId) set.add(`c:${i.comboId}`);
  }
  return [...set];
};

export function buildStats(orders) {
  const single = new Map(); // token -> orders containing it
  const pairs = new Map(); // token -> Map(otherToken -> orders containing both)
  for (const o of orders) {
    const tokens = tokensForOrder(o);
    for (const a of tokens) {
      single.set(a, (single.get(a) || 0) + 1);
      if (!pairs.has(a)) pairs.set(a, new Map());
      const row = pairs.get(a);
      for (const b of tokens) if (a !== b) row.set(b, (row.get(b) || 0) + 1);
    }
  }
  return { single, pairs };
}

const resolveToken = (token, dishId, { dishes, combos }) => {
  const [kind, id] = [token.slice(0, 1), token.slice(2)];
  if (kind === "c") {
    const c = combos.find((x) => x.comboId === id);
    if (!c || !c.dishIds.includes(String(dishId))) return null; // only combos that apply to this dish
    return { type: "combo", id: c.comboId, name: c.addOn, comboName: c.comboName, extraPrice: c.extraPrice };
  }
  const d = dishes.find((x) => x.id === id);
  return d ? { type: "dish", id: d.id, name: d.title, price: d.price } : null;
};

// `dishes` = [{id,title,price}], `combos` = [{comboId,comboName,addOn,extraPrice,dishIds}]
export function recommendFor(dishId, stats, { dishes, combos, limit = 3 }) {
  const key = `d:${dishId}`;
  const basedOnOrders = stats.single.get(key) || 0;

  if (basedOnOrders >= MIN_DISH_ORDERS) {
    const row = [...(stats.pairs.get(key) || new Map())].sort((a, b) => b[1] - a[1]);
    const suggestions = [];
    for (const [token, count] of row) {
      if (count < MIN_PAIR_COUNT) break;
      const s = resolveToken(token, dishId, { dishes, combos });
      if (s) suggestions.push({ ...s, count, support: Number((count / basedOnOrders).toFixed(2)) });
      if (suggestions.length >= limit) break;
    }
    if (suggestions.length) return { source: "orders", basedOnOrders, suggestions };
  }

  const suggestions = combos.filter((c) => c.dishIds.includes(String(dishId))).map((c) => ({
    type: "combo", id: c.comboId, name: c.addOn, comboName: c.comboName, extraPrice: c.extraPrice, count: null,
  }));
  return { source: "predefined", basedOnOrders, suggestions: suggestions.slice(0, limit) };
}
