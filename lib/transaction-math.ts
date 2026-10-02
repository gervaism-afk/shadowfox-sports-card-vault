export type Transaction = {
  id: string; card_id: string | null; card_label: string; kind: "purchase" | "sale";
  occurred_on: string; quantity: number; amount_cents: number; fees_cents: number;
  cost_cents: number | null; notes: string;
};
/** Parse decimal currency without floating-point multiplication or rounding hidden digits. */
export function cadCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error("Use a CAD amount with no more than two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 100000000) throw new Error("Amounts must be between $0 and $1,000,000 CAD.");
  return cents;
}
export function transactionNet(row: Transaction) {
  return row.kind === "purchase" ? row.amount_cents + row.fees_cents : row.amount_cents - row.fees_cents;
}
export function transactionProfit(row: Transaction): number | null {
  return row.kind === "sale" && row.cost_cents !== null ? transactionNet(row) - row.cost_cents : null;
}
export function transactionTotals(rows: Transaction[]) {
  return rows.reduce((totals, row) => {
    if (row.kind === "purchase") totals.spent += transactionNet(row);
    else { totals.proceeds += transactionNet(row); const profit = transactionProfit(row); if (profit === null) totals.unknownCosts++; else { totals.profit += profit; totals.knownSales++; } }
    return totals;
  }, { spent: 0, proceeds: 0, profit: 0, unknownCosts: 0, knownSales: 0 });
}
export function money(cents: number) { return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100); }
export function transactionCsv(rows: Transaction[]) {
  const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[\s]*[=+\-@]/.test(text) && !/^-\d+(\.\d+)?$/.test(text)) text = "'" + text; return `"${text.replace(/"/g, '""')}"`; };
  return [["Date", "Type", "Card", "Quantity", "Amount CAD", "Fees CAD", "Cost of sold cards CAD", "Net CAD", "Profit CAD", "Notes"], ...rows.map(row => [row.occurred_on, row.kind, row.card_label, row.quantity, (row.amount_cents / 100).toFixed(2), (row.fees_cents / 100).toFixed(2), row.cost_cents === null ? "" : (row.cost_cents / 100).toFixed(2), (transactionNet(row) / 100).toFixed(2), transactionProfit(row) === null ? "" : (transactionProfit(row)! / 100).toFixed(2), row.notes])].map(row => row.map(cell).join(",")).join("\r\n");
}
