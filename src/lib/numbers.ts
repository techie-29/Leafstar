/* Indian number format everywhere (AGENTS.md §3): 1,00,000 and ₹. */
const grouped = new Intl.NumberFormat("en-IN");
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatNumber = (n: number): string => grouped.format(n);
export const formatRupees = (n: number): string => rupees.format(n);
