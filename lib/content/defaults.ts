export const PAGE_CONTENT_DEFAULTS = {
  homepage: {
    heroEyebrow: "ShadowFox Sports Cards", heroTitle: "Track Your Collection Like a Pro",
    heroSubtitle: "Scan, organize, and value your Hockey and Baseball cards in your personal vault.",
    primaryLabel: "Start Scanning", primaryHref: "/scan", secondaryLabel: "View Collection", secondaryHref: "/collection",
    loginHeading: "Log in or create your ShadowFox vault", loginText: "Sign in to manage your collection and view your portfolio analytics.",
    feature1Icon: "📸", feature1Title: "Scan Cards", feature1Text: "Upload card images and review the details before saving.",
    feature2Icon: "📊", feature2Title: "Track Value", feature2Text: "Track card counts and estimated collection value.",
    feature3Icon: "🗂️", feature3Title: "Organize Easily", feature3Text: "Sort, filter, and manage your collection.",
  },
  scan: { title: "Scan Cards", subtitle: "Upload a card image and review its details before saving." },
  manual: { title: "Add a Card", subtitle: "Enter your card details and images, then save them to your vault.", saveLabel: "Save Card" },
  collection: {
    title: "Your Collection", subtitle: "Browse, filter, and export the cards in your vault.",
    exportJsonLabel: "Export JSON", exportCsvLabel: "Export CSV", emptyTitle: "No cards to show",
    emptyText: "Add a card or adjust your filters to see your collection.",
  },
  analytics: {
    title: "Portfolio Analytics", subtitle: "Explore your collection's estimated value and card breakdowns.",
    emptyTitle: "Your portfolio starts here", emptyText: "Add cards to your collection to see your analytics.",
    sectionSport: "Cards by Sport", sectionPlayers: "Top Players", sectionBrand: "Value by Brand",
    sectionTeam: "Value by Team", sectionYear: "Cards by Year", sectionTopCards: "Top Cards by Value",
  },
};

export type EditablePageKey = keyof typeof PAGE_CONTENT_DEFAULTS;
export function isEditablePage(page: string): page is EditablePageKey {
  return Object.prototype.hasOwnProperty.call(PAGE_CONTENT_DEFAULTS, page);
}
export function validateContent(page: EditablePageKey, value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const defaults = PAGE_CONTENT_DEFAULTS[page];
  const result: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    if (!Object.prototype.hasOwnProperty.call(defaults, key) || typeof text !== "string" || text.length > 5000) return null;
    if (key.endsWith("Href") && (!text.startsWith("/") || text.startsWith("//") || /[\\\s]/.test(text))) return null;
    result[key] = text;
  }
  return result;
}
