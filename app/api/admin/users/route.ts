import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInactiveAccount } from "@/lib/admin-account";
import { fetchAllRows } from "@/lib/pagination";

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const activity = searchParams.get("activity") || "";
  const role = searchParams.get("role")?.trim() ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (role && !["user", "admin"].includes(role)) ||
    !["", "inactive", "never", "unconfirmed"].includes(activity)
  ) {
    return NextResponse.json(
      { error: "Invalid pagination or role" },
      { status: 400 },
    );
  }
  const userId = searchParams.get("userId");
  const includeCards = searchParams.get("includeCards") === "true";
  const includeStats = searchParams.get("includeStats") === "true";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createAdminClient();

  if (includeCards && userId) {
    try {
      const cards = await fetchAllRows((from, to) =>
        supabase
          .from("cards")
          .select(
            "id, sport, player, year, brand, set_name, card_number, team, subset, parallel, serial_number, rookie, autograph, relic_patch, grading_company, grade, quantity, estimated_value_cad, notes",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      );
      return NextResponse.json({ cards });
    } catch {
      return NextResponse.json(
        { error: "Could not load cards" },
        { status: 500 },
      );
    }
  }

  function profileQuery() {
    let query = supabase
      .from("profiles")
      .select("id, username, email, role, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id");
    if (role) query = query.eq("role", role);
    if (search) {
      const pattern = `%${search}%`.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      query = query.or(`username.ilike."${pattern}",email.ilike."${pattern}"`);
    }
    return query;
  }
  let users: any[] = [],
    count = 0;
  try {
    if (activity) {
      const [profiles, authUsers] = await Promise.all([
        fetchAllRows((a, b) => profileQuery().range(a, b)),
        (async () => {
          const accounts = new Map();
          for (let p = 1; ; p++) {
            const { data, error } = await supabase.auth.admin.listUsers({
              page: p,
              perPage: 1000,
            });
            if (error) throw error;
            for (const user of data.users) accounts.set(user.id, user);
            if (data.users.length < 1000) return accounts;
          }
        })(),
      ]);
      const matches = profiles.filter((profile: any) => {
        const account = authUsers.get(profile.id);
        if (!account) return false;
        if (activity === "never") return !account.last_sign_in_at;
        if (activity === "unconfirmed") return !account.email_confirmed_at;
        return isInactiveAccount(account.last_sign_in_at, account.created_at);
      });
      count = matches.length;
      users = matches
        .slice(from, to + 1)
        .map((profile: any) => ({
          ...profile,
          last_sign_in_at: authUsers.get(profile.id)?.last_sign_in_at || null,
          email_confirmed_at:
            authUsers.get(profile.id)?.email_confirmed_at || null,
          banned_until: authUsers.get(profile.id)?.banned_until || null,
        }));
    } else {
      const result = await profileQuery().range(from, to);
      if (result.error) throw result.error;
      count = result.count || 0;
      users = await Promise.all(
        (result.data || []).map(async (profile: any) => {
          const { data, error } = await supabase.auth.admin.getUserById(
            profile.id,
          );
          if (error || !data.user)
            throw new Error("Could not load account status");
          return {
            ...profile,
            last_sign_in_at: data.user.last_sign_in_at || null,
            email_confirmed_at: data.user.email_confirmed_at || null,
            banned_until: data.user.banned_until || null,
          };
        }),
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not load account status. Please refresh." },
      { status: 500 },
    );
  }

  const userIds = (users ?? []).map((u: any) => u.id);
  let aggregatesByUser = new Map();
  if (userIds.length) {
    let cardsAgg: any[];
    try {
      cardsAgg = await fetchAllRows((from, to) =>
        supabase
          .from("cards")
          .select("user_id, quantity, estimated_value_cad")
          .in("user_id", userIds)
          .order("id")
          .range(from, to),
      );
    } catch {
      return NextResponse.json(
        { error: "Could not load collection totals" },
        { status: 500 },
      );
    }
    for (const row of cardsAgg ?? []) {
      const prev = aggregatesByUser.get(row.user_id) ?? {
        card_count: 0,
        total_estimated_value: 0,
      };
      prev.card_count += Number(row.quantity || 1);
      prev.total_estimated_value +=
        Number(row.estimated_value_cad || 0) * Number(row.quantity || 1);
      aggregatesByUser.set(row.user_id, prev);
    }
  }

  if (includeStats) {
    let totalUsers: number;
    let allCards: any[];
    try {
      const [userCount, cardRows] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        fetchAllRows((from, to) =>
          supabase
            .from("cards")
            .select("quantity, estimated_value_cad")
            .order("id")
            .range(from, to),
        ),
      ]);
      if (userCount.error) throw userCount.error;
      totalUsers = userCount.count || 0;
      allCards = cardRows;
    } catch {
      return NextResponse.json(
        { error: "Could not load portfolio totals" },
        { status: 500 },
      );
    }
    const totalCards = (allCards ?? []).reduce(
      (sum, row: any) => sum + Number(row.quantity || 1),
      0,
    );
    const totalValue = (allCards ?? []).reduce(
      (sum, row: any) =>
        sum + Number(row.estimated_value_cad || 0) * Number(row.quantity || 1),
      0,
    );
    return NextResponse.json({
      users: (users ?? []).map((u: any) => ({
        ...u,
        ...(aggregatesByUser.get(u.id) ?? {
          card_count: 0,
          total_estimated_value: 0,
        }),
      })),
      total: count ?? 0,
      page,
      pageSize,
      stats: { totalUsers: totalUsers ?? 0, totalCards, totalValue },
    });
  }

  return NextResponse.json({
    users: (users ?? []).map((u: any) => ({
      ...u,
      ...(aggregatesByUser.get(u.id) ?? {
        card_count: 0,
        total_estimated_value: 0,
      }),
    })),
    total: count ?? 0,
    page,
    pageSize,
  });
}
