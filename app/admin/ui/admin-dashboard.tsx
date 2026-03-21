'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type UserRow = {
  id: string;
  username: string | null;
  email?: string | null;
  role: 'user' | 'admin';
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
  id: string;
  sport: string | null;
  player: string | null;
  year: string | null;
  brand: string | null;
  set_name: string | null;
  card_number: string | null;
  team: string | null;
  quantity: number | null;
  estimated_value_cad: number | null;
  notes: string | null;
};

type EditableCard = {
  id: string;
  player: string;
  year: string;
  brand: string;
  set_name: string;
  card_number: string;
  team: string;
  quantity: string;
  estimated_value_cad: string;
  notes: string;
};

const supabase = createBrowserSupabaseClient();

function toEditable(card: UserCard): EditableCard {
  return {
    id: card.id,
    player: card.player ?? '',
    year: card.year ?? '',
    brand: card.brand ?? '',
    set_name: card.set_name ?? '',
    card_number: card.card_number ?? '',
    team: card.team ?? '',
    quantity: card.quantity != null ? String(card.quantity) : '1',
    estimated_value_cad: card.estimated_value_cad != null ? String(card.estimated_value_cad) : '0',
    notes: card.notes ?? '',
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalCards: 0, totalValue: 0 });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserCards, setSelectedUserCards] = useState<UserCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<EditableCard | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  async function getAccessToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }

  async function verifyAdminAndPrepare() {
    const currentToken = await getAccessToken();
    if (!currentToken) {
      router.push('/');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.push('/');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/');
      return;
    }

    setToken(currentToken);
    setReady(true);
  }

  async function apiFetch(url: string, options: RequestInit = {}) {
    const currentToken = token ?? (await getAccessToken());
    if (!currentToken) throw new Error('Missing access token');
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${currentToken}`);
    return fetch(url, { ...options, headers });
  }

  async function loadStats() {
    const res = await apiFetch('/api/admin/users?page=1&pageSize=1&includeStats=true', { cache: 'no-store' });
    const json = await res.json();
    if (json.stats) setStats(json.stats);
  }

  async function loadUsers() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    const res = await apiFetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    setUsers(json.users ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }

  async function loadUserCards(userId: string) {
    setCardsLoading(true);
    setSelectedUserId(userId);
    const res = await apiFetch(`/api/admin/users?userId=${userId}&includeCards=true`, { cache: 'no-store' });
    const json = await res.json();
    setSelectedUserCards(json.cards ?? []);
    setCardsLoading(false);
  }

  useEffect(() => { verifyAdminAndPrepare(); }, []);
  useEffect(() => { if (ready) loadUsers(); }, [ready, page, role]);
  useEffect(() => { if (ready) loadStats(); }, [ready]);

  async function updateRole(id: string, newRole: 'user' | 'admin') {
    setMessage('');
    const res = await apiFetch(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      alert('Failed to update role');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    setMessage(`Updated role to ${newRole}.`);
  }

  async function deleteCard(id: string) {
    if (!window.confirm('Delete this card?')) return;
    const res = await apiFetch(`/api/admin/cards/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete card');
      return;
    }
    setSelectedUserCards((prev) => prev.filter((c) => c.id !== id));
    setMessage('Card deleted.');
    loadStats();
  }

  async function saveCard() {
    if (!editingCard) return;
    setSavingCard(true);
    setMessage('');
    const res = await apiFetch(`/api/admin/cards/${editingCard.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: editingCard.player,
        year: editingCard.year,
        brand: editingCard.brand,
        set_name: editingCard.set_name,
        card_number: editingCard.card_number,
        team: editingCard.team,
        quantity: editingCard.quantity ? Number(editingCard.quantity) : 1,
        estimated_value_cad: editingCard.estimated_value_cad ? Number(editingCard.estimated_value_cad) : 0,
        notes: editingCard.notes,
      }),
    });
    setSavingCard(false);
    if (!res.ok) {
      alert('Failed to save card');
      return;
    }
    const json = await res.json();
    const updated = json.card as UserCard;
    setSelectedUserCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    setEditingCard(null);
    setMessage('Card updated.');
    loadStats();
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 20)), [total]);
  if (!ready) return <div className="pageShell"><div className="container"><section className="panel">Checking admin access...</section></div></div>;

  return (
    <div className="pageShell"><div className="container" style={{display:'grid', gap:20}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Admin Dashboard</h1>
          <p style={{ opacity: 0.8 }}>Manage users, cards, account roles, and collection stats.</p>
        </div>
        <button className="btn ghost" onClick={() => { loadStats(); loadUsers(); if (selectedUserId) loadUserCards(selectedUserId); }}>Refresh</button>
      </div>

      {message ? <div className="panel">{message}</div> : null}

      <div className="heroGrid">
        <div className="kpiCard"><div className="kpiLabel">Total Users</div><div className="kpiValue">{stats.totalUsers}</div></div>
        <div className="kpiCard"><div className="kpiLabel">Total Cards</div><div className="kpiValue">{stats.totalCards}</div></div>
        <div className="kpiCard"><div className="kpiLabel">Total Estimated Value</div><div className="kpiValue">${Number(stats.totalValue || 0).toLocaleString()}</div></div>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search users by username or email" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadUsers(); } }} />
        <select className="input narrow" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
        <button className="btn ghost" onClick={() => { setPage(1); loadUsers(); }}>Search</button>
      </div>

      <section className="panel tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Cards</th><th>Total Value</th><th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7}>Loading users...</td></tr> : users.length === 0 ? <tr><td colSpan={7}>No users found.</td></tr> : users.map((user) => (
              <tr key={user.id}>
                <td>{user.username || 'Unnamed User'}</td>
                <td>{user.email || '-'}</td>
                <td style={{ textTransform: 'capitalize' }}>{user.role}</td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                <td>{user.card_count ?? 0}</td>
                <td>${Number(user.total_estimated_value ?? 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn ghost" onClick={() => loadUserCards(user.id)}>View Cards</button>
                    {user.role === 'admin' ? <button className="btn ghost" onClick={() => updateRole(user.id, 'user')}>Demote</button> : <button className="btn ghost" onClick={() => updateRole(user.id, 'admin')}>Promote</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>Page {page} of {totalPages}</div>
        <div className="buttonRow">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ opacity: page <= 1 ? 0.5 : 1 }}>Previous</button>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ opacity: page >= totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      </div>

      {selectedUserId ? (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>User Cards</h2>
            <button className="btn ghost" onClick={() => { setSelectedUserId(null); setSelectedUserCards([]); }}>Close</button>
          </div>
          {cardsLoading ? <p>Loading cards...</p> : selectedUserCards.length === 0 ? <p>No cards found for this user.</p> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {selectedUserCards.map((card) => (
                <div key={card.id} className="metaCard" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{[card.year, card.brand, card.player].filter(Boolean).join(' ')}</div>
                    <div className="helperText" style={{ marginTop: 4 }}>{card.sport || '-'} · {card.team || '-'} · Qty {Number(card.quantity || 1)} · ${Number(card.estimated_value_cad || 0).toLocaleString()}</div>
                    <div className="helperText" style={{ marginTop: 4 }}>{card.set_name || ''} {card.card_number ? `#${card.card_number}` : ''}</div>
                    {card.notes ? <div className="helperText" style={{ marginTop: 4 }}>{card.notes}</div> : null}
                  </div>
                  <div className="buttonRow">
                    <button className="btn ghost" onClick={() => setEditingCard(toEditable(card))}>Edit</button>
                    <button className="btn danger" onClick={() => deleteCard(card.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {editingCard ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: 760 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 22, fontWeight: 700 }}>Edit Card</h3>
              <button className="btn ghost" onClick={() => setEditingCard(null)}>Close</button>
            </div>
            <div className="formGrid">
              <input className="input" value={editingCard.player} onChange={(e) => setEditingCard({ ...editingCard, player: e.target.value })} placeholder="Player" />
              <input className="input" value={editingCard.year} onChange={(e) => setEditingCard({ ...editingCard, year: e.target.value })} placeholder="Year" />
              <input className="input" value={editingCard.brand} onChange={(e) => setEditingCard({ ...editingCard, brand: e.target.value })} placeholder="Brand" />
              <input className="input" value={editingCard.set_name} onChange={(e) => setEditingCard({ ...editingCard, set_name: e.target.value })} placeholder="Set" />
              <input className="input" value={editingCard.card_number} onChange={(e) => setEditingCard({ ...editingCard, card_number: e.target.value })} placeholder="Card #" />
              <input className="input" value={editingCard.team} onChange={(e) => setEditingCard({ ...editingCard, team: e.target.value })} placeholder="Team" />
              <input className="input" value={editingCard.quantity} onChange={(e) => setEditingCard({ ...editingCard, quantity: e.target.value })} placeholder="Quantity" />
              <input className="input" value={editingCard.estimated_value_cad} onChange={(e) => setEditingCard({ ...editingCard, estimated_value_cad: e.target.value })} placeholder="Estimated value CAD" />
            </div>
            <textarea className="textarea" value={editingCard.notes} onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })} placeholder="Notes" rows={4} style={{ marginTop: 12 }} />
            <div className="buttonRow" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn ghost" onClick={() => setEditingCard(null)}>Cancel</button>
              <button className="btn primary" onClick={saveCard} disabled={savingCard}>{savingCard ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div></div>
  );
}
