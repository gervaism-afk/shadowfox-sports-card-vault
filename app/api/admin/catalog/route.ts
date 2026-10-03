import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { getCardCatalog } from "@/lib/catalog/server";
export const maxDuration = 30;
async function handle(request: Request, refresh: boolean) {
  const auth = await requireAdminApi(request);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  const p = new URL(request.url).searchParams;
  const sport = p.get("sport"),
    year = p.get("year") || String(new Date().getUTCFullYear());
  if (
    (sport !== "Hockey" && sport !== "Baseball") ||
    !/^(18|19|20)\d{2}(?:-\d{2})?$/.test(year) ||
    Number(year.slice(0, 4)) > new Date().getUTCFullYear() + 1
  )
    return NextResponse.json(
      { error: "Choose Hockey or Baseball and a valid year." },
      { status: 400 },
    );
  try {
    if (refresh) revalidateTag("card-catalog");
    const data = await getCardCatalog(sport, year);
    return NextResponse.json(
      {
        sport,
        year,
        refreshed: refresh,
        checkedAt: new Date().toISOString(),
        players: data.players.length,
        teams: data.teams.length,
        sets: data.sets,
        sources: data.sources,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not refresh reference data. Try again shortly." },
      { status: 502 },
    );
  }
}
export const GET = (r: Request) => handle(r, false);
export const POST = (r: Request) => handle(r, true);
