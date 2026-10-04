import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

export const CartContext = createContext(null);
export const lineKeyOf = (dishId, comboId) => `${dishId}|${comboId || "_"}`;
const KEY = "cart_v2";

const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };

// Cart lines hold display data only. The server recomputes prices when the order is placed.
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ } }, [cart]);

  const addToCart = useCallback((item) => {
    const lineKey = lineKeyOf(item.id, item.comboId);
    const unit = item.basePrice + (item.comboExtra || 0);
    setCart((prev) => {
      const ex = prev.find((l) => l.lineKey === lineKey);
      if (ex) return prev.map((l) => (l.lineKey === lineKey ? { ...l, qty: Math.min(20, l.qty + (item.qty || 1)) } : l));
      return [...prev, { ...item, comboId: item.comboId || null, comboName: item.comboName || null, comboExtra: item.comboExtra || 0, price: unit, qty: item.qty || 1, lineKey }];
    });
  }, []);

  const updateQty = useCallback((lineKey, qty) => {
    setCart((prev) => prev.flatMap((l) => (l.lineKey !== lineKey ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(20, qty) }])));
  }, []);

  const removeFromCart = useCallback((lineKey) => setCart((p) => p.filter((l) => l.lineKey !== lineKey)), []);

  // change a line's combo (merging with an existing line if needed)
  const changeCombo = useCallback((lineKey, combo) => {
    setCart((prev) => {
      const line = prev.find((l) => l.lineKey === lineKey);
      if (!line) return prev;
      const next = { ...line, comboId: combo?.comboId || null, comboName: combo?.comboName || null, comboExtra: combo?.extraPrice || 0 };
      next.price = next.basePrice + next.comboExtra;
      next.lineKey = lineKeyOf(next.id, next.comboId);
      const rest = prev.filter((l) => l.lineKey !== lineKey);
      const dup = rest.find((l) => l.lineKey === next.lineKey);
      if (dup) return rest.map((l) => (l === dup ? { ...l, qty: Math.min(20, l.qty + next.qty) } : l));
      return prev.map((l) => (l.lineKey === lineKey ? next : l));
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);
  const count = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);
  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);

  const value = useMemo(() => ({ cart, addToCart, updateQty, removeFromCart, changeCombo, clearCart, count, total }), [cart, addToCart, updateQty, removeFromCart, changeCombo, clearCart, count, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
