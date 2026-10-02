import { jsPDF, AcroFormCheckBox } from "jspdf";
import type { CardRecord } from "./types";

export type CollectionPdfOptions = { paper: "letter" | "a4"; includeValues: boolean; scope: "All cards" | "Filtered cards"; generatedAt?: Date };
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const clean = (value: string) => value.replace(/[\x00-\x1f\x7f]/g, " ").trim();
export function collectionPdfGroups(cards: CardRecord[]) {
  const groups = new Map<string, { title: string; sport: string; cards: CardRecord[] }>();
  for (const card of cards) {
    const set = /^mvp hockey$/i.test(card.set.trim()) && card.sport === "Hockey" && /^upper deck$/i.test(card.brand.trim()) ? "MVP" : card.set.trim();
    const parts = [card.sport, card.year.trim(), card.brand.trim(), set, card.subset.trim()];
    const key = JSON.stringify(parts.map(value => value.toLowerCase()));
    const group = groups.get(key) || { title: [card.year || "Year unspecified", card.brand, set || "Set unspecified", card.subset].filter(Boolean).map(clean).join(" · "), sport: card.sport, cards: [] };
    group.cards.push(card); groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => collator.compare(a.sport, b.sport) || collator.compare(a.title, b.title)).map(group => ({ ...group, cards: [...group.cards].sort((a, b) => (a.cardNumber && b.cardNumber ? collator.compare(a.cardNumber, b.cardNumber) : a.cardNumber ? -1 : b.cardNumber ? 1 : 0) || collator.compare(a.player, b.player) || collator.compare(a.parallel, b.parallel)) }));
}

export function createCollectionPdf(cards: CardRecord[], options: CollectionPdfOptions, logo?: string) {
  if (!cards.length) throw new Error("There are no cards to include. Clear your filters or add a card first.");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: options.paper, compress: true });
  doc.setProperties({ title: "ShadowFox Cards — Collection Checklist", subject: options.scope, author: "ShadowFox Cards", creator: "ShadowFox Card Vault" });
  const width = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight();
  const margin = 30; const gap = 18; const colWidth = (width - margin * 2 - gap * 2) / 3;
  const date = (options.generatedAt || new Date()).toLocaleDateString("en-CA");
  let pages = 0; let field = 0;
  for (const group of collectionPdfGroups(cards)) {
    let index = 0; let sheet = 0;
    while (index < group.cards.length) {
      if (pages++) doc.addPage(); sheet++;
      doc.setFillColor(20, 20, 18); doc.rect(0, 0, width, 78, "F");
      if (logo) doc.addImage(logo, "JPEG", margin, 10, 56, 56);
      doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(244, 240, 230);
      doc.text("ShadowFox Cards", logo ? margin + 70 : margin, 33);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(212, 176, 119);
      doc.text("YOUR COLLECTION CHECKLIST", logo ? margin + 70 : margin, 52);
      doc.setTextColor(30, 30, 28); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(group.title, width - 2 * margin) as string[];
      doc.text(titleLines, margin, 102);
      let top = 104 + titleLines.length * 14;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 90, 85);
      doc.text(`${group.sport} · ${group.cards.length} entries · ${group.cards.reduce((sum, card) => sum + card.quantity, 0)} cards · Sheet ${sheet}`, margin, top);
      top += 16;
      doc.text("Check boxes as you review your inventory. This list includes saved cards only.", margin, top);
      top += 22;
      for (let col = 0; col < 3 && index < group.cards.length; col++) {
        const x = margin + col * (colWidth + gap); let y = top;
        while (index < group.cards.length) {
          const card = group.cards[index];
          doc.setFont("helvetica", "bold"); doc.setFontSize(9);
          const names = doc.splitTextToSize(clean(`${card.cardNumber ? `#${card.cardNumber}  ` : ""}${card.player || "Unnamed card"}`), colWidth - 19) as string[];
          const variants = [card.parallel, card.serialNumber, [card.gradingCompany, card.grade].filter(Boolean).join(" "), card.rookie ? "Rookie" : "", card.autograph ? "Auto" : "", card.relicPatch ? "Relic" : ""].filter(Boolean).map(clean);
          const details = [`Qty ${card.quantity}`, ...variants, ...(options.includeValues ? [card.estimatedValueCad > 0 ? `Est. CAD ${card.estimatedValueCad.toFixed(2)}` : "No estimate"] : [])].join(" · ");
          doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
          const detailLines = doc.splitTextToSize(details, colWidth - 19) as string[];
          const rowHeight = Math.max(29, names.length * 11 + detailLines.length * 9 + 8);
          if (y + rowHeight > height - 62 && y > top) break;
          if (y + rowHeight > height - 62) throw new Error("One card has too much text for the selected paper size. Shorten its name or variant details and try again.");
          doc.setDrawColor(130, 130, 122); doc.setLineWidth(0.5); doc.rect(x, y - 7, 9, 9);
          const checkbox = new AcroFormCheckBox(); checkbox.fieldName = `inventory_${++field}`;
          checkbox.x = x; checkbox.y = y - 7; checkbox.width = 9; checkbox.height = 9;
          checkbox.appearanceState = "Off"; checkbox.showWhenPrinted = true; doc.addField(checkbox);
          doc.setTextColor(28, 28, 26); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
          doc.text(names, x + 16, y);
          doc.setTextColor(93, 93, 85); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
          doc.text(detailLines, x + 16, y + names.length * 11);
          doc.setDrawColor(228, 228, 221); doc.line(x, y + rowHeight - 10, x + colWidth, y + rowHeight - 10);
          y += rowHeight; index++;
        }
      }
    }
  }
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor(212, 176, 119); doc.line(margin, height - 44, width - margin, height - 44);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 90, 85);
    doc.text(`${options.scope} · ${cards.length} entries · Generated ${date}`, margin, height - 29);
    doc.text(`Page ${page} of ${pages}`, width - margin, height - 29, { align: "right" });
    if (options.includeValues) { doc.setFontSize(7); doc.text("Values are your saved estimates, not confirmed sale prices.", margin, height - 16); }
  }
  return doc;
}
