"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type UserRow = {
  id: string;
  username: string | null;
  email?: string | null;
  role: "user" | "admin";
  created_at: string;
  card_count?: number;
  total_estimated_value?: number;
};

type Stats = {
  totalUsers: number;
  totalCards: number;
  totalValue: number;
};

type UserCard = {
  sport?: string;
  set_name?: string;
  subset?: string;
  parallel?: string;
  serial_number?: string;
  grading_company?: string;
  grade?: string;
  quantity?: number;
  rookie?: boolean;
  autograph?: boolean;
  relic_patch?: boolean;
  id: string;
  player: string | null;
  brand: string | null;
  year: string | null;
  card_number?: string | null;
  team: string | null;
  estimated_value_cad: number | null;
  notes: string | null;
};

type EditableCard = {
  sport: string;
  set_name: string;
  subset: string;
  parallel: string;
  serial_number: string;
  grading_company: string;
  grade: string;
  quantity: string;
  rookie: boolean;
  autograph: boolean;
  relic_patch: boolean;
  id: string;
  player: string;
  brand: string;
  year: string;
  card_number: string;
  team: string;
  estimated_value_cad: string;
  notes: string;
};

const supabase = createBrowserSupabaseClient();

function toEditable(card: UserCard): EditableCard {
  return {
    id: card.id,
    sport: card.sport || "Hockey",
    set_name: card.set_name || "",
    subset: card.subset || "",
    parallel: card.parallel || "",
    serial_number: card.serial_number || "",
    grading_company: card.grading_company || "",
    grade: card.grade || "",
    quantity: String(card.quantity || 1),
    rookie: card.rookie || false,
    autograph: card.autograph || false,
    relic_patch: card.relic_patch || false,
    player: card.player ?? "",
    brand: card.brand ?? "",
    year: card.year ? String(card.year) : "",
    card_number: card.card_number ?? "",
    team: card.team ?? "",
    estimated_value_cad:
      card.estimated_value_cad != null ? String(card.estimated_value_cad) : "",
    notes: card.notes ?? "",
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCards: 0,
    totalValue: 0,
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserCards, setSelectedUserCards] = useState<UserCard[]>([]);
  const collectionPanel = useRef<HTMLDivElement>(null);
  const collectionRequest = useRef(0);
  const [cardSearch, setCardSearch] = useState("");
  const [cardsLoading, setCardsLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<EditableCard | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function getAccessToken() {
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }

  async function verifyAdminAndPrepare() {
    const currentToken = await getAccessToken();
    if (!currentToken) {
      router.push("/");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.push("/");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      router.push("/");
      return;
    }
    setToken(currentToken);
    setReady(true);
  }

  async function apiFetch(url: string, options: RequestInit = {}) {
    const currentToken = await getAccessToken();
    if (!currentToken) throw new Error("Missing access token");
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${currentToken}`);
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || "The admin request failed.");
    }
    return response;
  }

  async function loadStats() {
    try {
      const res = await apiFetch(
        "/api/admin/users?page=1&pageSize=1&includeStats=true",
        { cache: "no-store" },
      );
      const json = await res.json();
      if (json.stats) setStats(json.stats);
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "The admin request failed.",
      });
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      const res = await apiFetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setUsers(json.users ?? []);
      setTotal(json.total ?? 0);
      setLoading(false);
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "The admin request failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadUserCards(userId: string) {
    const request = ++collectionRequest.current;
    setSelectedUserCards([]);
    setEditingCard(null);
    setCardSearch("");
    try {
      setCardsLoading(true);
      setSelectedUserId(userId);
      const res = await apiFetch(
        `/api/admin/users?userId=${userId}&includeCards=true`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (request !== collectionRequest.current) return;
      setSelectedUserCards(json.cards ?? []);
      setCardsLoading(false);
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "The admin request failed.",
      });
    } finally {
      if (request === collectionRequest.current) setCardsLoading(false);
    }
  }

  useEffect(() => {
    verifyAdminAndPrepare();
  }, []);
  useEffect(() => {
    if (ready) loadUsers();
  }, [ready, page, role]);
  useEffect(() => {
    if (ready) loadStats();
  }, [ready]);

  async function updateRole(id: string, newRole: "user" | "admin") {
    try {
      if (!window.confirm(`Change this account to ${newRole}?`)) return;
      setMessage(null);
      const res = await apiFetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to update role." });
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)),
      );
      setMessage({ type: "success", text: `Updated role to ${newRole}.` });
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "The admin request failed.",
      });
    }
  }

  async function deleteCard(id: string) {
    try {
      if (!window.confirm("Delete this card?")) return;
      const res = await apiFetch(`/api/admin/cards/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to delete card." });
        return;
      }
      setSelectedUserCards((prev) => prev.filter((c) => c.id !== id));
      setMessage({ type: "success", text: "Card deleted." });
      loadStats();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "The admin request failed.",
      });
    }
  }

  async function saveCard() {
    try {
      if (!editingCard) return;
      setSavingCard(true);
      setMessage(null);
      const res = await apiFetch(`/api/admin/cards/${editingCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: editingCard.sport,
          set_name: editingCard.set_name,
          subset: editingCard.subset,
          parallel: editingCard.parallel,
          serial_number: editingCard.serial_number,
          grading_company: editingCard.grading_company,
          grade: editingCard.grade,
          quantity: Number(editingCard.quantity),
          rookie: editingCard.rookie,
          autograph: editingCard.autograph,
          relic_patch: editingCard.relic_patch,
          player: editingCard.player,
          brand: editingCard.brand,
          year: editingCard.year,
          card_number: editingCard.card_number,
          team: editingCard.team,
          estimated_value_cad: editingCard.estimated_value_cad
            ? Number(editingCard.estimated_value_cad)
            : null,
          notes: editingCard.notes,
        }),
      });
      setSavingCard(false);
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to save card." });
        return;
      }
      const json = await res.json();
      const updated = json.card as UserCard;
      setSelectedUserCards((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      );
      setEditingCard(null);
      setMessage({ type: "success", text: "Card updated." });
      loadStats();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "The admin request failed.",
      });
    } finally {
      setSavingCard(false);
    }
  }

  useEffect(() => {
    if (selectedUserId)
      collectionPanel.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [selectedUserId]);
  const selectedUser = users.find((u) => u.id === selectedUserId);
  const visibleCards = selectedUserCards.filter((card) =>
    [
      card.player,
      card.year,
      card.brand,
      card.set_name,
      card.card_number,
      card.team,
      card.parallel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(cardSearch.trim().toLowerCase()),
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 20)), [total]);

  if (!ready)
    return (
      <div className="sfAdminShell">
        <div className="sfAdminBanner">Checking admin access...</div>
      </div>
    );

  return (
    <div className="sfAdminShell">
      <div className="sfAdminTop">
        <div>
          <h1 className="sfPageTitle">Admin Dashboard</h1>
          <p className="sfMuted">
            Manage users, cards, roles, and collection stats.
          </p>
        </div>
        <button
          className="sfGhostBtn"
          onClick={() => {
            loadStats();
            loadUsers();
            if (selectedUserId) loadUserCards(selectedUserId);
          }}
        >
          Refresh
        </button>
      </div>

      {message ? (
        <div
          className={
            message.type === "success"
              ? "sfBanner sfBannerSuccess"
              : "sfBanner sfBannerError"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="sfStatGrid">
        <div className="sfStatBox">
          <div className="sfStatLabel">Total Users</div>
          <div className="sfStatNumber">{stats.totalUsers}</div>
        </div>
        <div className="sfStatBox">
          <div className="sfStatLabel">Total Cards</div>
          <div className="sfStatNumber">{stats.totalCards}</div>
        </div>
        <div className="sfStatBox">
          <div className="sfStatLabel">Total Estimated Value</div>
          <div className="sfStatNumber">
            ${Number(stats.totalValue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="sfPanel">
        <div className="sfToolbar">
          <input
            className="sfInput"
            placeholder="Search users by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                loadUsers();
              }
            }}
          />
          <select
            className="sfInput"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <button
            className="sfGhostBtn"
            onClick={() => {
              setPage(1);
              loadUsers();
            }}
          >
            Search
          </button>
        </div>
      </div>

      <section className="sfPanel" aria-label="User accounts">
        <h2 className="sfSectionTitle">Users & collections</h2>
        <p className="helperText">
          Choose View Cards to open a collection and edit or delete its entries.
        </p>
        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="adminUserList">
            {users.map((user) => (
              <article
                className="adminUserRow"
                key={user.id}
                data-selected={selectedUserId === user.id}
              >
                <div className="adminUserIdentity">
                  <strong>{user.username || "Unnamed User"}</strong>
                  <div>{user.email || "No email"}</div>
                  <p className="helperText">
                    {user.role} · {user.card_count ?? 0} cards · Joined{" "}
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div className="sfInlineActions">
                  <button
                    className="sfPrimaryBtn"
                    onClick={() => loadUserCards(user.id)}
                  >
                    View Cards
                  </button>
                  <button
                    className="sfGhostBtn small"
                    disabled={
                      user.id === currentUser?.id && user.role === "admin"
                    }
                    title={
                      user.id === currentUser?.id
                        ? "Your own admin access is protected"
                        : undefined
                    }
                    onClick={() =>
                      updateRole(
                        user.id,
                        user.role === "admin" ? "user" : "admin",
                      )
                    }
                  >
                    {user.role === "admin" ? "Demote" : "Promote"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="sfPager">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="sfInlineActions">
          <button
            className="sfGhostBtn small"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            className="sfGhostBtn small"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {selectedUserId ? (
        <div className="sfPanel adminCollectionPanel" ref={collectionPanel}>
          <div className="sfAdminTop">
            <div>
              <h2 className="sfSectionTitle">User Cards</h2>
              <p>
                {selectedUser?.username ||
                  selectedUser?.email ||
                  "Selected user"}{" "}
                · {selectedUserCards.length} entries
              </p>
            </div>
            <button
              className="sfGhostBtn"
              onClick={() => {
                collectionRequest.current++;
                setEditingCard(null);
                setSelectedUserId(null);
                setSelectedUserCards([]);
              }}
            >
              Close
            </button>
          </div>
          <label className="field">
            Search this collection
            <input
              className="sfInput"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder="Player, team, set or card number"
            />
          </label>
          {cardsLoading ? (
            <p>Loading cards...</p>
          ) : selectedUserCards.length === 0 ? (
            <p>No cards found for this user.</p>
          ) : (
            <div className="sfCardList">
              {visibleCards.length === 0 ? (
                <p>No cards match your search.</p>
              ) : null}
              {visibleCards.map((card) => (
                <div key={card.id} className="sfListCard">
                  <div>
                    <div className="sfListTitle">
                      {[card.year, card.brand, card.player]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                    <div className="sfMuted">
                      {[
                        card.set_name,
                        card.card_number ? `#${card.card_number}` : "",
                        card.parallel,
                        `Qty ${card.quantity || 1}`,
                        card.team,
                      ]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      · $
                      {Number(card.estimated_value_cad || 0).toLocaleString()}
                    </div>
                    {card.notes ? (
                      <div className="sfSubtle">{card.notes}</div>
                    ) : null}
                  </div>
                  <div className="sfInlineActions">
                    <button
                      className="sfGhostBtn small"
                      onClick={() => setEditingCard(toEditable(card))}
                    >
                      Edit
                    </button>
                    <button
                      className="sfDangerBtn small"
                      onClick={() => deleteCard(card.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {editingCard ? (
        <div className="sfModalOverlay">
          <div className="sfModalCard">
            <div className="sfAdminTop">
              <h3 className="sfSectionTitle">Edit Card</h3>
              <button
                className="sfGhostBtn"
                onClick={() => setEditingCard(null)}
              >
                Close
              </button>
            </div>
            <div className="sfFormGrid">
              <label>
                Sport
                <select
                  className="sfInput"
                  value={editingCard.sport}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, sport: e.target.value })
                  }
                >
                  <option>Hockey</option>
                  <option>Baseball</option>
                </select>
              </label>
              {(
                [
                  ["set_name", "Set"],
                  ["subset", "Subset"],
                  ["parallel", "Parallel"],
                  ["quantity", "Quantity"],
                  ["serial_number", "Serial number"],
                  ["grading_company", "Grading company"],
                  ["grade", "Grade"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    className="sfInput"
                    value={editingCard[key]}
                    type={key === "quantity" ? "number" : "text"}
                    min={key === "quantity" ? 1 : undefined}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              {(
                [
                  ["rookie", "Rookie"],
                  ["autograph", "Autograph"],
                  ["relic_patch", "Relic / patch"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={editingCard[key]}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        [key]: e.target.checked,
                      })
                    }
                  />{" "}
                  {label}
                </label>
              ))}
              <input
                className="sfInput"
                value={editingCard.player}
                onChange={(e) =>
                  setEditingCard({ ...editingCard, player: e.target.value })
                }
                placeholder="Player"
              />
              <input
                className="sfInput"
                value={editingCard.brand}
                onChange={(e) =>
                  setEditingCard({ ...editingCard, brand: e.target.value })
                }
                placeholder="Brand"
              />
              <input
                className="sfInput"
                value={editingCard.year}
                onChange={(e) =>
                  setEditingCard({ ...editingCard, year: e.target.value })
                }
                placeholder="Year"
              />
              <input
                className="sfInput"
                value={editingCard.card_number}
                onChange={(e) =>
                  setEditingCard({
                    ...editingCard,
                    card_number: e.target.value,
                  })
                }
                placeholder="Card #"
              />
              <input
                className="sfInput"
                value={editingCard.team}
                onChange={(e) =>
                  setEditingCard({ ...editingCard, team: e.target.value })
                }
                placeholder="Team"
              />
              <input
                className="sfInput"
                value={editingCard.estimated_value_cad}
                onChange={(e) =>
                  setEditingCard({
                    ...editingCard,
                    estimated_value_cad: e.target.value,
                  })
                }
                placeholder="Estimated value"
              />
            </div>
            <textarea
              className="sfTextarea"
              value={editingCard.notes}
              onChange={(e) =>
                setEditingCard({ ...editingCard, notes: e.target.value })
              }
              placeholder="Notes"
              rows={4}
            />
            <div className="sfInlineActions right">
              <button
                className="sfGhostBtn"
                onClick={() => setEditingCard(null)}
              >
                Cancel
              </button>
              <button
                className="sfPrimaryBtn"
                onClick={saveCard}
                disabled={savingCard}
              >
                {savingCard ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
