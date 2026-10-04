// Display configuration. Set VITE_RESTAURANT_NAME in frontend/.env to use your own name.
export const RESTAURANT = {
  name: import.meta.env.VITE_RESTAURANT_NAME || "Indian Restaurant",
  location: "India, Karnataka",
  hours: "9 AM – 9 PM",
};
