// Copies the frontend menu (the single source of truth) to the backend's price list.
// Run from the project root after editing frontend/src/data/menu.js:   npm run sync-menu
import { copyFileSync } from "node:fs";
copyFileSync("frontend/src/data/menu.js", "backend/data/menu.js");
console.log("backend/data/menu.js now matches frontend/src/data/menu.js");
