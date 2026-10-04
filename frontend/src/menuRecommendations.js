// Frontend-only "pairs well with" suggestions, built from the local menu data (no orders, no backend).
// These are the predefined pairings from the combo definitions - not customer purchase history,
// so they are always labelled source: "predefined".
export function buildRecommendations({ dishes, combos }) {
  const byDish = {};
  for (const d of dishes) {
    byDish[d.id] = {
      source: "predefined",
      basedOnOrders: 0,
      suggestions: combos
        .filter((c) => c.dishIds.includes(d.id))
        .map((c) => ({ type: "combo", id: c.comboId, name: c.addOn, comboName: c.comboName, extraPrice: c.extraPrice, count: null })),
    };
  }
  return byDish;
}
