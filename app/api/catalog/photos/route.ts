import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { parseCommonsPhotos } from "@/lib/reference-photos";
export const maxDuration = 30;
const search = unstable_cache(async (year: string, brand: string, set: string) => {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: `${year} "${brand}" "${set}" card`, gsrnamespace: "6", gsrlimit: "50", prop: "imageinfo", iiprop: "url|mime|extmetadata", format: "json" });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "ShadowFoxCards/1.0 (open-license card reference images)" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Reference image source is temporarily unavailable.");
  const data = await response.json();
  if (data.error) throw new Error("Reference image search is temporarily unavailable.");
  return { photos: parseCommonsPhotos(data), source: "Wikimedia Commons", checkedAt: new Date().toISOString(), limited: Boolean(data.continue) };
}, ["open-reference-photos-v1"], { revalidate: 86400 });
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const values = ["year", "brand", "set"].map(key => (p.get(key) || "").trim());
  if (values.some(v => !v || v.length > 100 || /["<>\r\n]/.test(v))) return NextResponse.json({ error: "Choose year, brand and set first." }, { status: 400 });
  try { return NextResponse.json(await search(values[0], values[1], values[2])); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not find reference images." }, { status: 502 }); }
}
