import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

const fallbackContent = {
  heroEyebrow: "ShadowFox Sports Cards",
  heroTitle: "Track Your Collection Like a Pro",
  heroSubtitle: "ShadowFox Sports Cards helps you scan, organize, and value your cards with a premium collector-first experience.",
  primaryLabel: "Start Scanning",
  primaryHref: "/scan",
  secondaryLabel: "View Collection",
  secondaryHref: "/collection",
  loginHeading: "Log in or create your ShadowFox vault",
  loginText: "Sign in to manage your collection, unlock analytics, and keep your card vault synced and protected.",
  feature1Icon: "📸",
  feature1Title: "Scan Cards",
  feature1Text: "Quickly capture card data and move cards into your vault faster.",
  feature2Icon: "📊",
  feature2Title: "Track Value",
  feature2Text: "Monitor collection totals, card counts, and portfolio insights.",
  feature3Icon: "🗂️",
  feature3Title: "Organize Easily",
  feature3Text: "Sort, filter, and manage your collection in one premium workspace.",
};

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "homepage")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content: { ...fallbackContent, ...(data?.value || {}) } });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const content = body?.content ?? {};
  const supabase = createAdminClient();

  const { error } = await supabase.from("site_content").upsert(
    {
      key: "homepage",
      value: content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
