import { test, expect, type Page } from "@playwright/test";
import { PAGE_CONTENT_DEFAULTS } from "../../lib/content/defaults";
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
};
const token = [
  Buffer.from('{"alg":"HS256"}').toString("base64url"),
  Buffer.from(
    JSON.stringify({
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: "authenticated",
    }),
  ).toString("base64url"),
  "fixture",
].join(".");
const session = {
  access_token: token,
  refresh_token: "fixture-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: "bearer",
  user,
};
async function fixture(page: Page, role = "admin") {
  await page.addInitScript(
    (s) => localStorage.setItem("sb-127-auth-token", JSON.stringify(s)),
    session,
  );
  await page.route("http://127.0.0.1:54321/**", (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
      };
    if (req.method() === "OPTIONS") return route.fulfill({ headers, body: "" });
    if (path === "/auth/v1/user") return route.fulfill({ headers, json: user });
    if (path === "/rest/v1/profiles")
      return route.fulfill({
        headers,
        json: { id: user.id, role, username: "Admin" },
      });
    return route.fulfill({ headers, json: [] });
  });
}
test("admin tools navigation exposes content, catalogue and service status on phones", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/admin/users?**", (route) =>
    route.fulfill({
      json: {
        users: [
          {
            ...user,
            role: "admin",
            username: "Admin",
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
        stats: { totalUsers: 1, totalCards: 9, totalValue: 75 },
      },
    }),
  );
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin tools" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Site content", exact: true }),
  ).toBeVisible();
  await page.route("**/api/admin/system", (route) =>
    route.fulfill({
      json: {
        checkedAt: new Date().toISOString(),
        counts: [{ label: "Card entries", count: 9, ok: true }],
        storage: { ok: true, public: true },
        services: [
          {
            name: "AI card identification",
            configured: true,
            detail: "OpenRouter",
          },
          {
            name: "eBay API credentials",
            configured: false,
            detail: "Credential configuration only",
          },
        ],
      },
    }),
  );
  await page.getByRole("link", { name: "System status", exact: true }).click();
  await expect(
    page.getByText("Card image bucket available", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Missing configuration", { exact: true }),
  ).toBeVisible();
  let refreshes = 0;
  await page.route("**/api/admin/catalog?**", (route) => {
    if (route.request().method() === "POST") refreshes++;
    return route.fulfill({
      json: {
        players: 500,
        teams: 32,
        sets: [
          {
            sport: "Hockey",
            year: "2025-26",
            brand: "Upper Deck",
            set: "Series 1",
            url: "https://upperdeck.com/checklist/2025-26-ud-series-1-checklist/",
          },
        ],
        sources: [
          {
            name: "Upper Deck NHL checklists",
            url: "https://upperdeck.com/checklists/",
            checkedAt: new Date().toISOString(),
            status: "live",
          },
        ],
      },
    });
  });
  await page
    .getByRole("link", { name: "Catalogue tools", exact: true })
    .click();
  await page.getByLabel("Year or season").fill("2025-26");
  await page
    .getByRole("button", { name: "Refresh reference data", exact: true })
    .click();
  await expect(
    page.getByText("2025-26 · Upper Deck · Series 1", { exact: true }),
  ).toBeVisible();
  expect(refreshes).toBe(1);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("public landing page fields save through the protected content editor", async ({
  page,
}) => {
  await fixture(page);
  let saved: any = null;
  await page.route("**/api/admin/content/*", (route) => {
    const key = new URL(route.request().url()).pathname
      .split("/")
      .at(-1) as keyof typeof PAGE_CONTENT_DEFAULTS;
    if (route.request().method() === "PATCH") {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({ json: { content: PAGE_CONTENT_DEFAULTS[key] } });
  });
  await page.goto("/admin/content");
  await page
    .getByRole("button", { name: "Public landing page", exact: true })
    .click();
  await expect(page.getByLabel("hero Title", { exact: true })).toHaveValue(
    "Find your next favorite card.",
  );
  await page
    .getByLabel("hero Title", { exact: true })
    .fill("A new card for your collection");
  await page.getByRole("button", { name: "Save Content", exact: true }).click();
  await expect
    .poll(() => saved?.content.heroTitle)
    .toBe("A new card for your collection");
  expect(saved.content.ebayUrl).toBe(
    "https://www.ebay.ca/usr/shadowfoxsportscards",
  );
});
test("regular users cannot render admin tools and unsigned admin APIs reject requests", async ({
  page,
  request,
}) => {
  await fixture(page, "user");
  await page.goto("/admin/tools");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Catalogue tools", exact: true }),
  ).toHaveCount(0);
  for (const path of [
    "/api/admin/system",
    "/api/admin/catalog?sport=Hockey&year=2026",
  ])
    expect((await request.get(path)).status()).toBe(401);
  expect(
    (await request.post("/api/admin/catalog?sport=Hockey&year=2026")).status(),
  ).toBe(401);
});
test("admin card editor saves set, variant and quantity, and displays request failures", async ({
  page,
}) => {
  await fixture(page);
  const card = {
    id: "22222222-2222-4222-8222-222222222222",
    sport: "Hockey",
    player: "Nick Suzuki",
    year: "2021-22",
    brand: "Upper Deck",
    set_name: "MVP",
    subset: "",
    parallel: "",
    serial_number: "",
    grading_company: "",
    grade: "",
    quantity: 1,
    rookie: false,
    autograph: false,
    relic_patch: false,
    card_number: "87",
    team: "Montreal Canadiens",
    estimated_value_cad: 0,
    notes: "",
  };
  let saved: any = null;
  await page.route("**/api/admin/users?**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has("includeCards")
        ? { cards: [card] }
        : {
            users: [
              {
                ...user,
                role: "admin",
                username: "Admin",
                created_at: new Date().toISOString(),
              },
            ],
            total: 1,
            stats: { totalUsers: 1, totalCards: 1, totalValue: 0 },
          },
    }),
  );
  await page.route("**/api/admin/cards/*", (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { card: { ...card, ...saved } } });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "Demote", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  const view = page.getByRole("button", { name: "View Cards", exact: true });
  await expect(view).toBeVisible();
  const bounds = await view.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await view.click();
  await page.getByLabel("Search this collection").fill("unknown player");
  await expect(page.getByText("No cards match your search.")).toBeVisible();
  await page.getByLabel("Search this collection").fill("87");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Set", { exact: true }).fill("MVP Hockey");
  await page.getByLabel("Parallel", { exact: true }).fill("Silver");
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByText("Card updated.", { exact: true })).toBeVisible();
  expect(saved).toMatchObject({
    set_name: "MVP Hockey",
    parallel: "Silver",
    quantity: 2,
  });
  expect(saved.user_id).toBeUndefined();
  let deleted = false;
  await page.route("**/api/admin/cards/*", (route) => {
    deleted = route.request().method() === "DELETE";
    return route.fulfill({ json: { success: true } });
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Card deleted.", { exact: true })).toBeVisible();
  expect(deleted).toBe(true);
  await expect(page.getByText("No cards found for this user.")).toBeVisible();
  await page.route("**/api/admin/users?**", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "Could not load users right now." },
    }),
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("Could not load users right now.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading users...", { exact: true })).toHaveCount(
    0,
  );
});
test("admin history filters, paginates and exports only the displayed page", async ({
  page,
  request,
}) => {
  await fixture(page);
  const events = Array.from({ length: 26 }, (_, i) => ({
    id: String(i),
    created_at: "2026-10-03T01:00:00Z",
    actor_id: user.id,
    actor_label: "Admin",
    action: "card.updated",
    subject_type: "card",
    subject_id: "card-" + i,
    summary: i === 0 ? '=HYPERLINK("unsafe")' : "Card " + i,
    details: { fields: ["quantity", "parallel"] },
  }));
  await page.route("**/api/admin/activity?**", (route) => {
    const p = new URL(route.request().url()).searchParams,
      kind = p.get("kind"),
      n = Number(p.get("page"));
    return route.fulfill({
      json:
        kind === "user"
          ? {
              events: [
                {
                  ...events[0],
                  action: "user.role_changed",
                  summary: "Collector",
                  details: { from: "user", to: "admin" },
                },
              ],
              total: 1,
              page: 1,
              pageSize: 25,
            }
          : kind === "page"
            ? { events: [], total: 0, page: 1, pageSize: 25 }
            : {
                events: events.slice((n - 1) * 25, n * 25),
                total: 26,
                page: n,
                pageSize: 25,
              },
    });
  });
  await page.goto("/admin/activity");
  await expect(page.locator(".adminActivityList li")).toHaveCount(25);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export this page", exact: true })
    .click();
  const file = await pending;
  const fs = await import("node:fs/promises");
  const csv = await fs.readFile((await file.path())!, "utf8");
  expect(csv.split("\r\n")).toHaveLength(26);
  expect(csv).toContain('"\'=HYPERLINK(""unsafe"")"');
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".adminActivityList li")).toHaveCount(1);
  await expect(page.getByText("Card 25", { exact: true })).toBeVisible();
  await page.getByLabel("Activity type").selectOption("user");
  await expect(page.getByText("user → admin", { exact: true })).toBeVisible();
  await page.getByLabel("Activity type").selectOption("page");
  await expect(
    page.getByRole("heading", { name: "No activity yet", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export this page", exact: true }),
  ).toBeDisabled();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect((await request.get("/api/admin/activity")).status()).toBe(401);
});
