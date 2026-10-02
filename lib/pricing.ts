export function estimateSoldPrices(input: string) {
  const lines = input.trim().split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("Enter at least one sold price in CAD.");
  if (lines.length > 100) throw new Error("Enter up to 100 sold prices.");
  const prices = lines.map((line, index) => {
    const text = line.trim().replace(/^(?:CAD\s*|C\$\s*|\$\s*)/i, "").replace(/\s*CAD$/i, "");
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) throw new Error(`Check the price on line ${index + 1}. Use one CAD price per line.`);
    const value = Number(text.replaceAll(",", ""));
    if (value <= 0 || value > 1_000_000_000) throw new Error(`Enter a positive price on line ${index + 1}.`);
    return value;
  }).sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return { estimateCad: Math.round((median + Number.EPSILON) * 100) / 100, sampleCount: prices.length, low: prices[0], high: prices.at(-1)! };
}

export type SaleCurrency = 'CAD' | 'USD';
export type PastedSaleAmount = { id: string; amount: number; currency: SaleCurrency; context: string };

// Extract amounts for human review. A currency amount alone is not evidence of a sale.
export function parsePastedSaleAmounts(input: string, defaultCurrency: SaleCurrency) {
  if (input.length > 30000) throw new Error('Paste up to 30,000 characters at a time.');
  if (!input.trim()) throw new Error('Paste sold results first.');
  const amounts: PastedSaleAmount[] = [];
  let skipped = 0;
  const lines = input.replace(/\u00a0/g, ' ').split(/\r?\n/);
  const money = /(?:CAD\s*\$?|USD\s*\$?|US\s*\$|CA\s*\$|C\s*\$|AUD\s*\$?|A\s*\$|NZD\s*\$?|HKD\s*\$?|SGD\s*\$?|EUR\s*€?|GBP\s*£?|€|£|\$)\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?![\d.,])/gi;
  lines.forEach((line, lineIndex) => {
    if (/^\s*\d+(?:\.\d{1,2})?\s*$/.test(line)) {
      const amount = Number(line.trim());
      if (amount > 0 && amount <= 1_000_000_000) amounts.push({ id: `${lineIndex}-0`, amount, currency: defaultCurrency, context: line.trim() });
      return;
    }
    for (const match of line.matchAll(money)) {
      const prefix = match[0].slice(0, match[0].indexOf(match[1])).trim();
      const before = line.slice(0, match.index);
      const after = line.slice(match.index! + match[0].length);
      if (/(?:shipping|postage|tax|fees?|buyer.?s? premium)\s*[:=+]?\s*$/i.test(before) || /^\s*(?:(?:CAD|USD)\s*)?(?:shipping|postage|tax|fees?)\b/i.test(after)) { skipped++; continue; }
      if (/AUD|^A\s*\$|NZD|HKD|SGD|EUR|GBP|€|£/i.test(prefix) || /(?:HK|NZ|SG|AU|NT)\s*$/i.test(before)) { skipped++; continue; }
      const suffixCurrency = line.slice(match.index! + match[0].length).match(/^\s*(CAD|USD)\b/i)?.[1]?.toUpperCase();
      const explicitCurrency = /^(?:CAD|CA\s*\$|C\s*\$)/i.test(prefix) ? 'CAD' : /^(?:USD|US\s*\$)/i.test(prefix) ? 'USD' : undefined;
      if (explicitCurrency && suffixCurrency && explicitCurrency !== suffixCurrency) { skipped++; continue; }
      const amount = Number(match[1].replaceAll(',', ''));
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) { skipped++; continue; }
      amounts.push({ id: `${lineIndex}-${match.index}`, amount, currency: (explicitCurrency || suffixCurrency || defaultCurrency) as SaleCurrency, context: [lines[lineIndex - 1], line].filter(Boolean).join(' — ').slice(0, 350) });
    }
  });
  if (amounts.length > 100) throw new Error('Review up to 100 amounts at a time. Paste fewer results.');
  if (!amounts.length) throw new Error('No supported prices found. Paste CAD or USD amounts, such as US $25.00.');
  return { amounts, skipped };
}

export function parseUsdCadRate(value: unknown, now = new Date()) {
  const observations = (value as any)?.observations;
  const last = Array.isArray(observations) ? observations.at(-1) : null;
  const date = last?.d;
  const rate = Number(last?.FXUSDCAD?.v);
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(rate) || rate <= 0 || rate > 10) throw new Error('Exchange rate is unavailable.');
  const age = now.getTime() - new Date(`${date}T00:00:00Z`).getTime();
  if (!Number.isFinite(age) || age < -86400000 || age > 10 * 86400000) throw new Error('A recent exchange rate is unavailable.');
  return { rate, date };
}

export function estimateConfirmedSales(sales: PastedSaleAmount[], usdCadRate?: number) {
  if (!sales.length) throw new Error('Select the actual sold prices you want to include.');
  if (sales.some(sale => sale.currency === 'USD') && (!usdCadRate || !Number.isFinite(usdCadRate) || usdCadRate <= 0)) throw new Error('A USD to CAD exchange rate is required.');
  return estimateSoldPrices(sales.map(sale => (sale.amount * (sale.currency === 'USD' ? usdCadRate! : 1)).toFixed(2)).join('\n'));
}
