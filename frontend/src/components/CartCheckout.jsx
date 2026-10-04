import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useMenu } from "../contexts/MenuContext";
import api, { errorMessage } from "../api";
import { formatINR, imgSrc, notificationNotices } from "../utils";
import SuccessModal from "./SuccessModal";

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Cart + "place order". Used under the menu book (variant "tray") and on the /order page (variant "page").
const CartCheckout = ({ variant = "page" }) => {
  const { cart, updateQty, removeFromCart, changeCombo, addToCart, clearCart, total, count } = useContext(CartContext);
  const { user, isAdmin } = useAuth();
  const { menu, recs } = useMenu();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const lock = useRef(false);
  const requestId = useRef(newId());
  useEffect(() => { requestId.current = newId(); }, [cart]); // a changed cart is a new order attempt

  const suggestions = useMemo(() => {
    const out = [];
    const seen = new Set();
    cart.forEach((line) => {
      const r = recs[line.id];
      (r?.suggestions || []).forEach((s) => {
        const key = s.type === "dish" ? `d${s.id}` : `c${line.lineKey}${s.id}`;
        if (seen.has(key)) return;
        if (s.type === "combo" && line.comboId) return;
        if (s.type === "dish" && cart.some((l) => l.id === s.id)) return;
        seen.add(key);
        out.push({ line, s, source: r.source });
      });
    });
    return out.slice(0, 2);
  }, [cart, recs]);

  const place = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const { data } = await api.post("/api/orders", {
        items: cart.map((l) => ({ menuId: l.id, qty: l.qty, comboId: l.comboId })),
        notes, requestId: requestId.current,
      });
      setDone(data); clearCart(); setNotes("");
    } catch (e) {
      setError(errorMessage(e));
      if (e?.response?.status === 401) navigate("/login", { state: { from: variant === "tray" ? "/menu" : "/order" } });
    } finally { lock.current = false; setBusy(false); }
  };

  const from = variant === "tray" ? "/menu" : "/order";
  const modal = done && (
    <SuccessModal
      title="Order placed!"
      message={done.duplicate ? "This order had already been placed." : "Your order has been successfully placed."}
      details={[
        { label: "Order ID", value: `#${done.order.orderId}` },
        { label: "Items", value: done.order.items.map((i) => `${i.name} ×${i.qty}`).join(", ") },
        { label: "Total", value: formatINR(done.order.total) },
        { label: "Status", value: done.order.status },
      ]}
      notices={notificationNotices(done.notifications, user?.email)}
      onClose={() => setDone(null)}
    />
  );

  if (cart.length === 0) {
    return (
      <div className={`checkout checkout--${variant} checkout--empty`}>
        <p className="center muted">Your cart is empty. Add dishes from the menu{variant === "page" ? "." : " above and order right here."}</p>
        {variant === "page" && <p className="center"><Link to="/menu" className="btn btn--primary">Browse the menu</Link></p>}
        {modal}
      </div>
    );
  }

  return (
    <div className={`checkout checkout--${variant}`}>
      <div className="checkout__head">
        <h2>Your order</h2>
        <span className="muted">{count} item{count > 1 ? "s" : ""}</span>
      </div>
      <div className="cart__layout">
        <ul className="cart__lines">
          {cart.map((l) => {
            const options = (menu?.combos || []).filter((c) => c.dishIds.includes(l.id));
            return (
              <li key={l.lineKey} className="cartline">
                <img src={imgSrc(l.image)} alt={l.title} loading="lazy" decoding="async" />
                <div className="cartline__info">
                  <h3>{l.title}</h3>
                  {options.length > 0 && (
                    <label className="dish__combo">
                      <span className="sr-only">Combo for {l.title}</span>
                      <select value={l.comboId || ""} onChange={(e) => changeCombo(l.lineKey, options.find((c) => c.comboId === e.target.value) || null)}>
                        <option value="">No combo</option>
                        {options.map((c) => (<option key={c.comboId} value={c.comboId}>{c.addOn} (+{formatINR(c.extraPrice)})</option>))}
                      </select>
                    </label>
                  )}
                  <p className="muted">{formatINR(l.price)} each</p>
                </div>
                <div className="cartline__side">
                  <div className="stepper" role="group" aria-label={`Quantity of ${l.title}`}>
                    <button type="button" onClick={() => updateQty(l.lineKey, l.qty - 1)} aria-label={`Decrease ${l.title}`}>−</button>
                    <span aria-live="polite">{l.qty}</span>
                    <button type="button" onClick={() => updateQty(l.lineKey, l.qty + 1)} aria-label={`Increase ${l.title}`}>+</button>
                  </div>
                  <strong>{formatINR(l.price * l.qty)}</strong>
                  <button type="button" className="linkbtn" onClick={() => removeFromCart(l.lineKey)}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="cart__summary">
          {suggestions.length > 0 && (
            <div className="cart__recs">
              <h3>You might also like</h3>
              {suggestions.map(({ line, s, source }) => (
                <p key={`${line.lineKey}${s.id}`}>
                  {source === "orders" ? "Frequently ordered with" : "Pairs well with"} {line.title}: <strong>{s.name}</strong>{s.count ? <span className="muted"> ({s.count} orders)</span> : null}{" "}
                  <button type="button" className="chip" onClick={() => {
                    if (s.type === "combo") changeCombo(line.lineKey, menu.combos.find((c) => c.comboId === s.id));
                    else { const d = menu.dishes.find((x) => x.id === s.id); if (d) addToCart({ id: d.id, title: d.title, image: d.image, basePrice: d.price }); }
                  }}>{s.type === "combo" ? `Add (+${formatINR(s.extraPrice)})` : "Add"}</button>
                </p>
              ))}
            </div>
          )}
          <div className="field">
            <label htmlFor={`notes-${variant}`}>Notes for the kitchen (optional)</label>
            <textarea id={`notes-${variant}`} rows="2" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="cart__total"><span>Total</span><strong>{formatINR(total)}</strong></p>
          {error && <p className="notice notice--warn" role="alert">{error}</p>}
          {isAdmin ? (
            <p className="notice notice--info">You are logged in as admin. Customers place orders from their own accounts.</p>
          ) : user ? (
            <>
              <p className="muted">Ordering as {user.name} · {user.phone}</p>
              <button className="btn btn--primary btn--block" onClick={place} disabled={busy}>{busy ? "Placing order…" : "Confirm order"}</button>
            </>
          ) : (
            <>
              <p className="notice notice--info">Please log in or register to place your order. Your cart is saved.</p>
              <Link to="/login" state={{ from }} className="btn btn--primary btn--block">Log in to order</Link>
              <Link to="/register" state={{ from }} className="btn btn--outline btn--block">Create an account</Link>
            </>
          )}
        </aside>
      </div>
      {modal}
    </div>
  );
};

export default CartCheckout;
