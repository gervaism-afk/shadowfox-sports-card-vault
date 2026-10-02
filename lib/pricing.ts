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
