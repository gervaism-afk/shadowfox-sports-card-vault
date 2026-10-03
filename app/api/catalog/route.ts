import { NextResponse } from "next/server";
import { getCardCatalog } from "@/lib/catalog/server";
export const maxDuration = 30;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sport = params.get("sport"),
    year = params.get("year") || "";
  if (sport !== "Hockey" && sport !== "Baseball")
    return NextResponse.json(
      { error: "Choose Hockey or Baseball." },
      { status: 400 },
    );
  if (year && !/^(18|19|20)\d{2}(?:-\d{2})?$/.test(year))
    return NextResponse.json(
      { error: "Use a year such as 2026 or 2026-27." },
      { status: 400 },
    );
  const number = Number(year.slice(0, 4));
  if (year && (number < 1850 || number > new Date().getUTCFullYear() + 1))
    return NextResponse.json(
      { error: "Year is outside the reference range." },
      { status: 400 },
    );
  const catalog = await getCardCatalog(
    sport,
    year,
    params.get("scope") === "sets",
  );
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=21600",
    },
  });
}
