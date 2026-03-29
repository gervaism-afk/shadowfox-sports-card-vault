
export const PAGE_CONTENT_DEFAULTS = {
  homepage: {
    heroEyebrow: "ShadowFox Sports Cards",
    heroTitle: "Track Your Collection Like a Pro",
    heroSubtitle:
      "ShadowFox Sports Cards helps you scan, organize, and value your cards with a premium collector-first experience.",
    primaryLabel: "Start Scanning",
    primaryHref: "/scan",
    secondaryLabel: "View Collection",
    secondaryHref: "/collection",
    loginHeading: "Log in or create your ShadowFox vault",
    loginText:
      "Sign in to manage your collection, unlock analytics, and keep your card vault synced and protected.",
    feature1Icon: "📸",
    feature1Title: "Scan Cards",
    feature1Text: "Quickly capture card data and move cards into your vault faster.",
    feature2Icon: "📊",
    feature2Title: "Track Value",
    feature2Text: "Monitor collection totals, card counts, and portfolio insights.",
    feature3Icon: "🗂️",
    feature3Title: "Organize Easily",
    feature3Text: "Sort, filter, and manage your collection in one premium workspace.",
  },
  manual: {
    title: "Add Manually",
    subtitle: "Create cards with full details, images, quantity, and value — with complete control.",
    helper:
      "Manual adds allow front image, back image, or no image at all.",
    saveNewLabel: "Save as New Card",
    duplicateLabel: "Check Duplicate",
    addExistingLabel: "Add to Existing Quantity",
  },
  collection: {
    title: "Collection",
    subtitle: "Search, filter, sort, export, and review your full ShadowFox vault.",
    emptyTitle: "Your filtered view is empty",
    emptyText: "Try changing your search, filters, or add a new card to start building your ShadowFox vault.",
    exportJsonLabel: "Export JSON",
    exportCsvLabel: "Export CSV",
  },
  analytics: {
    title: "Portfolio Dashboard",
    subtitle: "Track value, card totals, player breakdowns, and premium collection insights.",
    emptyTitle: "Analytics will appear after you add cards",
    emptyText:
      "Once your vault has cards, you’ll see portfolio value, player breakdowns, brand value, team value, and top-card insights here.",
    sectionSport: "Cards by Sport",
    sectionPlayers: "Most Owned Players",
    sectionBrand: "Value by Brand",
    sectionTeam: "Value by Team",
    sectionYear: "Cards by Year",
    sectionTopCards: "Top Value Cards",
  },
  scan: {
    title: "Scan Cards",
    subtitle: "Capture card details fast, then review before saving.",
    helper: "Use your device camera or upload images to start scanning cards.",
  },
} as const;

export type EditablePageKey = keyof typeof PAGE_CONTENT_DEFAULTS;
