import { NextResponse } from "next/server";
import {
  checklistUrl,
  getPublishedChecklist,
} from "@/lib/catalog/checklist-server";
export const maxDuration = 60;
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams,
    sport = p.get("sport"),
    url = p.get("url") || "";
  if (sport !== "Hockey" && sport !== "Baseball")
    return NextResponse.json(
      { error: "Choose Hockey or Baseball." },
      { status: 400 },
    );
  try {
    checklistUrl(url, sport);
  } catch {
    return NextResponse.json(
      { error: "Choose a supported published set." },
      { status: 400 },
    );
  }
  try {
    const data = await getPublishedChecklist(sport, url);
    const section = p.get("section");
    const chosen = section
      ? data.groups.find((g) => g.id === section) ||
        data.groups.find((g) => g.id === "base-complete") ||
        data.groups[0]
      : null;
    const result = chosen
      ? {
          ...data,
          groups: data.groups.map((g) => ({
            ...g,
            count: g.entries.length,
            entries: g.id === chosen.id ? g.entries : [],
          })),
        }
      : data;
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Could not load this published checklist." },
      { status: 502 },
    );
  }
}
