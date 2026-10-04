import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CartContext, lineKeyOf } from "../contexts/CartContext";
import { useMenu } from "../contexts/MenuContext";
import { formatINR, imgSrc } from "../utils";
import { LAYOUT, buildPages, capacityFor, cardHeight, maxTurns } from "../menuPages";
import CartCheckout from "./CartCheckout";

const TURN_MS = 950;

const useMedia = (query) => {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
};

// Hides a page from keyboard/screen readers while it is not the visible one (works with any React version).
const Face = ({ visible, className, children }) => {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !visible);
    ref.current?.setAttribute("aria-hidden", String(!visible));
  }, [visible]);
  return <div ref={ref} className={className}>{children}</div>;
};

/* ---------- cards ---------- */
const DishCard = ({ dish, combos, selected, onSelect, rec }) => {
  const { cart, addToCart, updateQty } = useContext(CartContext);
  const combo = combos.find((c) => c.comboId === selected) || null;
  const unit = dish.price + (combo ? combo.extraPrice : 0);
  const line = cart.find((l) => l.lineKey === lineKeyOf(dish.id, combo?.comboId));
  const add = () => addToCart({ id: dish.id, title: dish.title, image: dish.image, basePrice: dish.price, comboId: combo?.comboId, comboName: combo?.comboName, comboExtra: combo?.extraPrice || 0 });
  const suggestions = (rec?.suggestions || []).slice(0, 2);

  return (
    <article className="dish">
      <img src={imgSrc(dish.image)} alt={dish.title} loading="lazy" decoding="async" draggable="false" />
      <div className="dish__body">
        <h3 className="dish__title">{dish.title}</h3>
        <div className="dish__row">
          <span className="dish__price">{formatINR(unit)}</span>
          {line ? (
            <div className="stepper" role="group" aria-label={`Quantity of ${dish.title}`}>
              <button type="button" onClick={() => updateQty(line.lineKey, line.qty - 1)} aria-label={`Decrease ${dish.title}`}>−</button>
              <span aria-live="polite">{line.qty}</span>
              <button type="button" onClick={() => updateQty(line.lineKey, line.qty + 1)} aria-label={`Increase ${dish.title}`}>+</button>
            </div>
          ) : (
            <button type="button" className="btn btn--primary btn--sm" onClick={add}>Add</button>
          )}
        </div>
        {combos.length > 0 && (
          <label className="dish__combo">
            <span className="sr-only">Combo for {dish.title}</span>
            <select value={selected || ""} onChange={(e) => onSelect(dish.id, e.target.value)}>
              <option value="">No combo</option>
              {combos.map((c) => (<option key={c.comboId} value={c.comboId}>{c.addOn} (+{formatINR(c.extraPrice)})</option>))}
            </select>
          </label>
        )}
        {suggestions.length > 0 && (
          <p className="dish__rec">
            {rec.source === "orders" ? "Frequently ordered with" : "Pairs well with"}{" "}
            {suggestions.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 && ", "}
                {s.type === "combo" ? (
                  <button type="button" className="chip" disabled={selected === s.id} onClick={() => onSelect(dish.id, s.id)} title={s.count ? `${s.count} orders` : "Suggested pairing"}>{s.name}</button>
                ) : (<strong>{s.name}</strong>)}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
    </article>
  );
};

const ComboCard = ({ combo, dish }) => {
  const { addToCart } = useContext(CartContext);
  if (!dish) return null;
  return (
    <article className="combo">
      {combo.image ? <img src={imgSrc(combo.image)} alt={combo.comboName} loading="lazy" decoding="async" draggable="false" /> : <div className="combo__emblem" aria-hidden="true">+</div>}
      <div className="dish__body">
        <h3 className="dish__title">{combo.comboName}</h3>
        <p className="muted combo__sum">{formatINR(dish.price)} + {formatINR(combo.extraPrice)}</p>
        <div className="dish__row">
          <span className="dish__price">{formatINR(dish.price + combo.extraPrice)}</span>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => addToCart({ id: dish.id, title: dish.title, image: dish.image, basePrice: dish.price, comboId: combo.comboId, comboName: combo.comboName, comboExtra: combo.extraPrice })}>Add combo</button>
        </div>
      </div>
    </article>
  );
};

/* ---------- pages ---------- */
const PageShell = ({ number, children, className = "" }) => (
  <div className={`sheet ${className}`}>
    <div className="sheet__content">{children}</div>
    {number && <span className="sheet__no">{number}</span>}
  </div>
);

const renderPage = (page, ctx) => {
  const { menu } = ctx;
  if (page.type === "cover") {
    return (
      <PageShell className="sheet--cover">
        <p className="cover__eyebrow">Our</p>
        <h2 className="cover__title">Indian Menu</h2>
        <div className="cover__rule" aria-hidden="true" />
        <p>{menu.dishes.length} dishes · {menu.categories.length} categories · {menu.combos.length} combos</p>
        <p className="cover__hint">Scroll, swipe or drag to turn the page</p>
      </PageShell>
    );
  }
  const isCombo = page.type === "combos";
  return (
    <PageShell number={page.number}>
      <header className="sheet__head">
        <h2>{isCombo ? "Combos & Recommendations" : page.cat.name}{page.parts > 1 && <small> {page.part}/{page.parts}</small>}</h2>
        <p className="muted">{isCombo ? "Popular pairings to add to your order" : page.cat.blurb}</p>
      </header>
      <div className="sheet__list" style={{ "--n": page.items.length, "--card-h": `${cardHeight(ctx.bookH, page.items.length)}px` }}>
        {isCombo
          ? page.items.map((c) => (<ComboCard key={c.comboId} combo={c} dish={menu.dishes.find((d) => d.id === c.dishIds[0])} />))
          : page.items.map((d) => (<DishCard key={d.id} dish={d} combos={menu.combos.filter((c) => c.dishIds.includes(d.id))} selected={ctx.sel[d.id]} onSelect={ctx.onSelect} rec={ctx.recs[d.id]} />))}
      </div>
    </PageShell>
  );
};

/* ---------- the book ---------- */
const isTypingTarget = (el) => el && (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable);

const Book = ({ pages, spread, bookH, ctx }) => {
  const maxT = maxTurns(pages.length, spread);
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const bookRef = useRef(null);
  const inView = useRef(false);
  const lockUntil = useRef(0);
  const acc = useRef({ v: 0, timer: null });
  const drag = useRef(null);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");

  const turn = useCallback((dir) => {
    const next = tRef.current + dir;
    if (next < 0 || next > maxT) return false;
    lockUntil.current = Date.now() + (reduced ? 150 : TURN_MS);
    tRef.current = next;
    setT(next);
    return true;
  }, [maxT, reduced]);

  useEffect(() => {
    const el = bookRef.current;
    const a = acc.current;
    const io = new IntersectionObserver(([e]) => { inView.current = e.intersectionRatio >= 0.6; }, { threshold: [0, 0.6, 1] });
    io.observe(el);

    // Mouse wheel / touchpad: vertical scroll or horizontal two-finger swipe. Only captured while the book is mostly
    // on screen, and released at the first/last page, so the website never gets stuck.
    const onWheel = (e) => {
      if (!inView.current || e.ctrlKey) return;
      if (Date.now() < lockUntil.current) { e.preventDefault(); return; } // absorb trackpad inertia during a turn
      const unit = e.deltaMode === 1 ? 16 : 1;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = (horizontal ? e.deltaX : e.deltaY) * unit;
      if (!delta) return;
      const dir = delta > 0 ? 1 : -1;
      const next = tRef.current + dir;
      if (next < 0 || next > maxT) return;
      e.preventDefault();
      a.v += delta;
      clearTimeout(a.timer); a.timer = setTimeout(() => { a.v = 0; }, 200);
      if (Math.abs(a.v) < 40) return;
      a.v = 0; turn(dir);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    // Left / right arrow keys anywhere on the page while the book is on screen.
    const onKey = (e) => {
      if (!inView.current || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); turn(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); }
    };
    window.addEventListener("keydown", onKey);

    // Drag with a mouse, or swipe with a finger, right-to-left (next) / left-to-right (back).
    const onUp = (e) => {
      const d = drag.current; drag.current = null;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
    };
    const onCancel = () => { drag.current = null; };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      io.disconnect(); clearTimeout(a.timer);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [maxT, turn]);

  const onPointerDown = (e) => { if (e.isPrimary && (e.pointerType !== "mouse" || e.button === 0)) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; };

  const leafCount = maxT + 1;
  const rightBlank = spread && !pages[2 * maxT];
  const shift = spread ? (t === 0 ? -25 : t === maxT && rightBlank ? 25 : 0) : 0;
  const label = spread
    ? t === 0 ? "Cover" : `Pages ${2 * t}${pages[2 * t] ? `–${2 * t + 1}` : ""} of ${pages.length}`
    : `Page ${t + 1} of ${pages.length}`;

  return (
    <>
      <div
        ref={bookRef}
        className={`book ${spread ? "book--spread" : "book--single"}`}
        style={{
          transform: `translateX(${shift}%)`,
          "--book-h": `${bookH}px`, "--pad-top": `${LAYOUT.padTop}px`, "--pad-bottom": `${LAYOUT.padBottom}px`,
          "--head-h": `${LAYOUT.headH}px`, "--head-gap": `${LAYOUT.headGap}px`, "--list-gap": `${LAYOUT.gap}px`, "--card-min": `${LAYOUT.cardMin}px`,
        }}
        role="region"
        aria-roledescription="menu book"
        aria-label="Menu book. Scroll, swipe, drag, or use the left and right arrow keys to turn pages."
        onPointerDown={onPointerDown}
      >
        {Array.from({ length: leafCount }, (_, j) => {
          const turned = j < t;
          const front = spread ? pages[2 * j] : pages[j];
          const back = spread ? pages[2 * j + 1] : null;
          return (
            <div key={j} className={`leaf ${turned ? "is-turned" : ""}`} style={{ zIndex: turned ? j + 1 : leafCount - j }}>
              {front && <Face className="face face--front" visible={j === t}>{renderPage(front, ctx)}</Face>}
              {back && <Face className="face face--back" visible={j === t - 1}>{renderPage(back, ctx)}</Face>}
            </div>
          );
        })}
        {spread && <div className="book__spine" aria-hidden="true" />}
      </div>
      <div className="book__nav">
        <p className="muted">{label}</p>
        <div className="book__dots" role="group" aria-label="Jump to a page">
          {Array.from({ length: leafCount }, (_, i) => (
            <button key={i} type="button" className={i === t ? "is-active" : ""} aria-label={`Go to view ${i + 1} of ${leafCount}`} aria-current={i === t} onClick={() => { tRef.current = i; setT(i); }} />
          ))}
        </div>
        <p className="muted book__tip">Scroll, swipe or drag the book, or use the ← → keys. Move your pointer off the book to scroll the site.</p>
      </div>
      <p className="sr-only" aria-live="polite">{label}</p>
    </>
  );
};

/* ---------- section ---------- */
const Menu = () => {
  const { menu, loading, error, reload, recs } = useMenu();
  const spread = useMedia("(min-width: 900px)");
  const tall = useMedia("(min-height: 820px)");
  const [sel, setSel] = useState({});
  const onSelect = useCallback((dishId, comboId) => setSel((s) => ({ ...s, [dishId]: comboId || null })), []);

  // Fixed page height per screen class -> the number of cards per page is computed so every page is full and never scrolls.
  const bookH = spread ? (tall ? 720 : 610) : (tall ? 720 : 600);
  const capacity = capacityFor(bookH);
  const pages = useMemo(() => (menu ? buildPages(menu, { capacity }) : []), [menu, capacity]);
  const ctx = useMemo(() => ({ menu, sel, onSelect, recs, bookH }), [menu, sel, onSelect, recs, bookH]);

  return (
    <section className="menu section" id="menu">
      <div className="container">
        <h1 className="heading">Our menu</h1>
        {loading && <p className="muted center" role="status">Loading the menu…</p>}
        {error && (
          <div className="notice notice--warn center" role="alert">
            <p>{error}</p>
            <button className="btn btn--outline btn--sm" onClick={reload}>Try again</button>
          </div>
        )}
        {menu && menu.dishes.length === 0 && <p className="muted center">The menu is being updated. Please check back soon.</p>}
        {menu && menu.dishes.length > 0 && (
          <div className="bookwrap">
            <Book key={`${spread}-${capacity}-${pages.length}`} pages={pages} spread={spread} bookH={bookH} ctx={ctx} />
          </div>
        )}
        <div className="menu__tray"><CartCheckout variant="tray" /></div>
      </div>
    </section>
  );
};

export default Menu;
