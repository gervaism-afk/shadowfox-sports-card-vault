import Link from "next/link";
import { CardRecord } from "@/lib/types";
import { recordTotal } from "@/lib/utils";

export default function CollectionGrid({ cards }: { cards: CardRecord[] }) {
  return (
    <div className="gridCards">
      {cards.map((card) => (
        <Link key={card.id} href={`/card/${card.id}`} className="gridCard hoverLift fadeInUp">
          <div className="gridCardImage cardFrame">
            {card.frontImage ? <img src={card.frontImage} alt={card.player} /> : <span>No image</span>}
          </div>
          <div className="gridCardBody">
            <strong>{card.player || "Untitled Card"}</strong>
            <span>{card.year} {card.brand}</span>
            {card.team ? <span className="teamBadge"><span className="teamDot"></span>{card.team}</span> : null}
            <span>{card.set} #{card.cardNumber}</span>
            <span>Qty: {card.quantity}</span>
            <span>Each: ${Number(card.estimatedValueCad || 0).toFixed(2)}</span>
            <span>Total: ${recordTotal(card).toFixed(2)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
