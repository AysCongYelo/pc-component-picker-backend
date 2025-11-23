// scripts/utils/sanitize.js

/**
 * 💰 Safely cleans and formats price + stock inputs for database inserts or updates.
 * Handles ₱, $, commas, spaces, empty strings, arrays, and invalid inputs gracefully.
 *
 * @param {string|number|null} price - User input or raw value
 * @param {string|number|null} stock - Stock quantity input
 * @param {object} [options]
 * @param {boolean} [options.asString=false] - Return values as formatted strings (for display)
 * @returns {{ cleanPrice: number|string, cleanStock: number|string }}
 */
export function sanitizeInputs(price, stock, { asString = false } = {}) {
  let cleanPrice = 0;
  let cleanStock = 0;

  // 🧱 Defensive guards
  if (typeof price === "object" || Array.isArray(price)) price = "";
  if (typeof stock === "object" || Array.isArray(stock)) stock = "";

  // 💰 Price cleanup — handles ₱, $, commas, spaces, etc.
  if (price !== undefined && price !== null && price !== "") {
    const parsed = parseFloat(
      String(price)
        .trim()
        .replace(/[₱$,€,\s]/g, "")
    );
    cleanPrice = isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  }

  // 📦 Stock cleanup — integer only
  if (stock !== undefined && stock !== null && stock !== "") {
    const parsed = parseInt(String(stock).replace(/[^0-9-]/g, ""), 10);
    cleanStock = isNaN(parsed) ? 0 : parsed;
  }

  // 🧩 Optional formatted output for CLI display
  if (asString) {
    cleanPrice = isNaN(cleanPrice) ? 0 : cleanPrice;
    return {
      cleanPrice: `₱${cleanPrice.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
      })}`,
      cleanStock: cleanStock.toString(),
    };
  }

  return { cleanPrice, cleanStock };
}
