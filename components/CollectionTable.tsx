import Link from "next/link";
import { CardRecord } from "@/lib/types";
import { recordTotal } from "@/lib/utils";

export default function CollectionTable({ cards }: { cards: CardRecord[] }) {
  if (!cards.length) {
    return (
      <div className="softPanel emptyState fadeInUp">
        <div className="emptyStateIcon softPulse">🗂️</div>
        <div className="emptyStateTitle">No cards in your collection yet</div>
        <div className="emptyStateText">Start by scanning a card or adding one manually. Your vault totals, values, and analytics will appear here automatically.</div>
      </div>
    );
  }

  return (
    <div className="panel tableWrap fadeInUp">
      <div className="brandStripe"></div>
      <table className="table">
        <thead>
          <tr>
            <th>Player</th><th>Year</th><th>Brand</th><th>Set</th><th>#</th><th>Qty</th><th>Grade</th><th>Value</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td><Link href={`/card/${card.id}`}>{card.player || "Untitled Card"}</Link></td>
              <td>{card.year}</td><td>{card.brand}</td><td>{card.set}</td><td>{card.cardNumber}</td><td>{card.quantity}</td>
              <td>{card.gradingCompany ? `${card.gradingCompany} ${card.grade}` : "—"}</td>
              <td>${Number(card.estimatedValueCad || 0).toFixed(2)}</td>
              <td>${recordTotal(card).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
