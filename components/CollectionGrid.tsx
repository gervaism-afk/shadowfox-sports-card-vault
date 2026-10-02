import Link from "next/link";
import { CardRecord } from "@/lib/types";
import VaultIcon from "@/components/VaultIcon";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default function CollectionGrid({ cards }: { cards: CardRecord[] }) {
  return (
    <div className="vaultCardGrid">
      {cards.map((card) => {
        const image = card.frontImage || card.backImage;
        const estimate = Number(card.estimatedValueCad);
        const hasEstimate = Number.isFinite(estimate) && estimate > 0;
        const badges = [
          [card.gradingCompany, card.grade].filter(Boolean).join(" "),
          card.rookie ? "Rookie" : "", card.parallel,
          card.autograph ? "Autograph" : "", card.relicPatch ? "Relic / patch" : "",
        ].filter(Boolean);
        return (
          <Link key={card.id} href={`/card/${card.id}`} className="vaultCollectionCard" aria-label={`View ${card.player || "untitled card"}`}>
            <div className="vaultCardWell">
              {image ? <img src={image} alt={`${card.player || "Card"} ${card.frontImage ? "front" : "back"}`} loading="lazy" decoding="async" /> : <div className="vaultNoPhoto"><VaultIcon name="binder" size={32} /><span>No photo yet</span></div>}
            </div>
            <div className="vaultCardInfo">
              <div className="vaultCardTitleRow"><h3>{card.player || "Untitled card"}</h3><span className="vaultSportTag">{card.sport}</span></div>
              <p>{[card.year, card.brand].filter(Boolean).join(" ") || "Details to add"}</p>
              {card.set || card.cardNumber ? <p>{[card.set, card.cardNumber ? `#${card.cardNumber}` : ""].filter(Boolean).join(" · ")}</p> : null}
              {badges.length ? <div className="vaultCardBadges">{badges.map((badge, index) => <span className="vaultCardBadge" key={`${badge}-${index}`}>{badge}</span>)}</div> : null}
              <div className="vaultCardMeta"><span>Qty {card.quantity}</span><span className="vaultCardPrice">{hasEstimate ? `Est. ${cad.format(estimate)} CAD${card.quantity > 1 ? " each" : ""}` : "No estimate"}</span></div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
