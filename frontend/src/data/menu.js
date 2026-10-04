// MENU DATA - single source of truth for the website's menu.
// The frontend reads this file directly (no API call, no database), so the menu always displays.
// Dish photos live in frontend/public/ - `image` must match the file name exactly (spaces/case matter).
// A combo = a dish + an add-on for an extra price; `dishIds` lists the dishes it belongs to.
// `image: null` on a combo means "no photo yet" (a placeholder is shown).
//
// backend/data/menu.js is an identical copy used ONLY by the server to re-check prices when an order is placed
// (prices from the browser are never trusted). After editing this file run `npm run sync-menu` in the project
// root to refresh that copy; `npm test` in the backend fails if the two ever differ.

export const CATEGORIES = [
  { name: "Breakfast", blurb: "South and North Indian morning classics" },
  { name: "Starters", blurb: "Tandoor and chaat favourites to begin with" },
  { name: "Main Course", blurb: "Slow-cooked dals and fragrant biryani" },
  { name: "Desserts", blurb: "Traditional Indian sweets" },
];

export const DISHES = [
  { id: "1", title: "Masala Dosa", category: "Breakfast", price: 80, image: "Masala dosa.jpg" },
  { id: "2", title: "Chole Bhature", category: "Breakfast", price: 120, image: "chole bhature.jpg" },
  { id: "3", title: "Dahi Vada", category: "Starters", price: 90, image: "dahi vada.jpg" },
  { id: "4", title: "Paneer Tikka", category: "Starters", price: 180, image: "paneer tikka.jpg" },
  { id: "5", title: "Tandoori Chicken", category: "Starters", price: 220, image: "tandoori chicken.jpg" },
  { id: "6", title: "Dal Tadka", category: "Main Course", price: 140, image: "Dal_tadka.jpg" },
  { id: "7", title: "Hyderabadi Biryani", category: "Main Course", price: 220, image: "hyderabadi biryani.jpg" },
  { id: "8", title: "Barfi", category: "Desserts", price: 80, image: "barfi.jpg" },
  { id: "9", title: "Gajar Ka Halwa", category: "Desserts", price: 100, image: "gajar_ka_halwa.jpg" },
  { id: "10", title: "Kheer", category: "Desserts", price: 90, image: "kheer.jpg" },
  { id: "11", title: "Kulfi Falooda", category: "Desserts", price: 130, image: "kulfi falooda.jpg" },
  { id: "12", title: "Kulfi", category: "Desserts", price: 80, image: "kulfi.jpg" },
  { id: "13", title: "Phirni", category: "Desserts", price: 100, image: "phirni(desert).jpg" },
];

// A combo = a dish + an add-on for an extra price. `dishIds` says which dishes it belongs to.
// `image` is null for now - set a file name from frontend/public/ to show a combo photo.
export const COMBOS = [
  { comboId: "C1", comboName: "Masala Dosa + Filter Coffee", addOn: "Filter Coffee", extraPrice: 40, dishIds: ["1"], image: null },
  { comboId: "C2", comboName: "Chole Bhature + Lassi", addOn: "Lassi", extraPrice: 50, dishIds: ["2"], image: null },
  { comboId: "C3", comboName: "Paneer Tikka + Masala Chaas", addOn: "Masala Chaas", extraPrice: 60, dishIds: ["4"], image: null },
  { comboId: "C4", comboName: "Biryani + Raita", addOn: "Raita", extraPrice: 50, dishIds: ["7"], image: null },
  { comboId: "C5", comboName: "Tandoori Chicken + Mint Chutney", addOn: "Mint Chutney", extraPrice: 40, dishIds: ["5"], image: null },
];
