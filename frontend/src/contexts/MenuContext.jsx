import React, { createContext, useCallback, useContext, useMemo } from "react";
import { CATEGORIES, DISHES, COMBOS } from "../data/menu";
import { buildRecommendations } from "../menuRecommendations";

// The menu comes straight from src/data/menu.js - no API request, so it works with the backend switched off.
// Same shape the components already use: { menu: { categories, dishes, combos }, loading, error, reload, recs }.
const MenuContext = createContext(null);
export const useMenu = () => useContext(MenuContext);

const buildMenu = () => {
  const names = [...new Set([...CATEGORIES.map((c) => c.name), ...DISHES.map((d) => d.category)])];
  return {
    categories: names.map((n) => CATEGORIES.find((c) => c.name === n) || { name: n, blurb: "" }).filter((c) => DISHES.some((d) => d.category === c.name)),
    dishes: DISHES,
    combos: COMBOS,
  };
};
const MENU = buildMenu();

export const MenuProvider = ({ children }) => {
  const recs = useMemo(() => buildRecommendations(MENU), []);
  const reload = useCallback(() => {}, []); // nothing to fetch; kept so existing callers still work
  const value = useMemo(() => ({ menu: MENU, loading: false, error: "", reload, recs }), [reload, recs]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};
