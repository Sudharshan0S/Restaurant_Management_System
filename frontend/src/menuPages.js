// Pure pagination logic for the menu book (unit-tested). Everything is derived from the menu data and the
// page size, so adding dishes or changing the screen height re-flows the book automatically.

// These numbers must match the CSS (--sheet-pad-top, --sheet-pad-bottom, --head-h, --list-gap, --card-min).
export const LAYOUT = { padTop: 22, padBottom: 34, headH: 72, headGap: 14, gap: 14, cardMin: 132 };

// How many cards fit on a page of the given height without any scrolling.
export const capacityFor = (bookHeight, { padTop, padBottom, headH, headGap, gap, cardMin } = LAYOUT) => {
  const listHeight = bookHeight - padTop - padBottom - headH - headGap;
  return Math.max(1, Math.floor((listHeight + gap) / (cardMin + gap)));
};

// Height of one card when `count` cards share a page (matches the CSS grid: rows are at most `maxCard` tall).
export const cardHeight = (bookHeight, count, maxCard = 230, { padTop, padBottom, headH, headGap, gap } = LAYOUT) => {
  const listHeight = bookHeight - padTop - padBottom - headH - headGap;
  return Math.max(0, Math.min(maxCard, Math.floor((listHeight - (count - 1) * gap) / Math.max(1, count))));
};

// Fewest pages of at most `size` items, evenly filled (6 items, size 4 -> 3 + 3).
export const balancedChunks = (items, size) => {
  if (!items.length) return [];
  const pages = Math.ceil(items.length / size);
  const per = Math.ceil(items.length / pages);
  return Array.from({ length: pages }, (_, i) => items.slice(i * per, i * per + per));
};

// cover -> one or more pages per category (category title repeated on every page) -> combos pages.
export function buildPages(menu, { capacity, comboCapacity = capacity }) {
  const pages = [{ type: "cover" }];
  menu.categories.forEach((cat) => {
    const chunks = balancedChunks(menu.dishes.filter((d) => d.category === cat.name), capacity);
    chunks.forEach((items, i) => pages.push({ type: "category", cat, items, part: i + 1, parts: chunks.length }));
  });
  const combos = balancedChunks(menu.combos || [], comboCapacity);
  combos.forEach((items, i) => pages.push({ type: "combos", items, part: i + 1, parts: combos.length }));
  return pages.map((p, i) => ({ ...p, number: i === 0 ? null : i + 1 }));
}

// Spread (two pages visible) uses floor(n/2) turns, single page uses n-1 turns.
export const maxTurns = (pageCount, spread) => (spread ? Math.floor(pageCount / 2) : pageCount - 1);
