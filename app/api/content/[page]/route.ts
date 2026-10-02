import { NextResponse } from "next/server";
import { isEditablePage, PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";
import { readPageContent } from "@/lib/content/server";

export const dynamic = "force-dynamic";
export async function GET(_req: Request, props: { params: Promise<{ page: string }> }) {
  const params = await props.params;
  if (!isEditablePage(params.page)) return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  try { return NextResponse.json({ content: await readPageContent(params.page) }); }
  catch { return NextResponse.json({ content: PAGE_CONTENT_DEFAULTS[params.page] }); }
}
