"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import PageShell from "@/components/PageShell";
import CollectionPdfExport from "@/components/CollectionPdfExport";
import { useAuth } from "@/components/AuthProvider";
import { loadCards } from "@/lib/storage";
import {
  loadChecklists,
  saveChecklist,
  deleteChecklist,
} from "@/lib/set-checklists";
import {
  completion,
  parseChecklist,
  productKey,
  type SetChecklist,
} from "@/lib/set-completion";
import { emptyCard } from "@/lib/defaults";
import type { CardRecord, Sport } from "@/lib/types";
const blank = {
  title: "",
  sport: "Hockey" as Sport,
  year: "",
  brand: "",
  set_name: "",
  subset: "",
  parallel: "",
};
export default function SetsPage() {
  const { user } = useAuth();
  const userRef = useRef(user?.id);
  userRef.current = user?.id;
  const [cards, setCards] = useState<CardRecord[]>([]),
    [lists, setLists] = useState<SetChecklist[]>([]),
    [selected, setSelected] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const [editing, setEditing] = useState(false),
    [editId, setEditId] = useState(""),
    [draft, setDraft] = useState(blank),
    [text, setText] = useState(""),
    [start, setStart] = useState("1"),
    [end, setEnd] = useState(""),
    [view, setView] = useState<"all" | "missing" | "duplicates">("all"),
    [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    setCards([]);
    setLists([]);
    setSelected("");
    setEditing(false);
    setStatus("");
    setBusy(false);
    setLoading(true);
    if (user)
      Promise.all([loadCards(), loadChecklists()])
        .then(([c, l]) => {
          if (active) {
            setCards(c);
            setLists(l);
            setSelected(l[0]?.id || "");
          }
        })
        .catch((e) => {
          if (active) setStatus(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  const products = useMemo(
    () => [
      ...new Map(
        cards
          .filter((c) => c.brand && c.year && c.set)
          .map((c) => [productKey(c), c]),
      ).entries(),
    ],
    [cards],
  );
  const list = lists.find((l) => l.id === selected);
  const result = useMemo(
    () => (list ? completion(cards, list) : null),
    [cards, list],
  );
  function begin(existing?: SetChecklist) {
    setStatus("");
    setEditId(existing?.id || "");
    setDraft(
      existing
        ? {
            title: existing.title,
            sport: existing.sport,
            year: existing.year,
            brand: existing.brand,
            set_name: existing.set_name,
            subset: existing.subset,
            parallel: existing.parallel,
          }
        : { ...blank },
    );
    setText(
      existing?.entries
        .map((e) => [e.number, e.player, e.team].join(" | "))
        .join("\n") || "",
    );
    setStart("1");
    setEnd("");
    setEditing(true);
  }
  async function save() {
    if (busy) return;
    const uid = userRef.current;
    setBusy(true);
    setStatus("");
    try {
      const entries = parseChecklist(text, Number(start), Number(end));
      const value = {
        ...draft,
        ...Object.fromEntries(
          Object.entries(draft).map(([k, v]) => [k, v.trim()]),
        ),
        entries,
      };
      const id = await saveChecklist(value, editId || undefined);
      const next = await loadChecklists();
      if (uid !== userRef.current) return;
      setLists(next);
      setSelected(id);
      setEditing(false);
      setStatus(
        "Checklist saved. Progress is calculated from your collection.",
      );
    } catch (e: any) {
      if (uid === userRef.current)
        setStatus(e.message || "Could not save checklist.");
    } finally {
      if (uid === userRef.current) setBusy(false);
    }
  }
  async function remove() {
    if (
      !list ||
      busy ||
      !window.confirm(
        "Delete this checklist? Your cards will stay in your collection.",
      )
    )
      return;
    const uid = userRef.current;
    setBusy(true);
    try {
      await deleteChecklist(list.id);
      if (uid !== userRef.current) return;
      const remaining = lists.filter((l) => l.id !== list.id);
      setLists(remaining);
      setSelected(remaining[0]?.id || "");
      setStatus("Checklist deleted.");
    } catch (e: any) {
      if (uid === userRef.current) setStatus(e.message);
    } finally {
      if (uid === userRef.current) setBusy(false);
    }
  }
  const missingCards = useMemo(
    () =>
      list && result
        ? result.missing.map((e) => ({
            ...emptyCard(),
            sport: list.sport,
            year: list.year,
            brand: list.brand,
            set: list.set_name,
            subset: list.subset,
            parallel: list.parallel,
            cardNumber: e.number,
            player: e.player || "Card needed",
            team: e.team,
          }))
        : [],
    [list, result],
  );
  const rows =
    (view === "missing"
      ? result?.missing
      : view === "duplicates"
        ? result?.duplicates
        : result?.rows
    )?.filter((e) =>
      [e.number, e.player, e.team]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  return (
    <AuthGate>
      <PageShell title="Set completion">
        <p className="vaultWelcomeCopy">
          See what you own, what is missing, and which cards you have more than
          once.
        </p>
        <div className="buttonRow organizeNav">
          <Link className="btn ghost" href="/collection">
            All cards
          </Link>
          <Link className="btn ghost" href="/want-list">
            Want list
          </Link>
          <button
            className="btn primary"
            disabled={loading || busy}
            onClick={() => begin()}
          >
            Create checklist
          </button>
        </div>
        <p className="helperText">
          Progress uses a checklist you define, not an assumed full release. Use
          a confirmed number range or paste an official checklist's numbers.
          Track each subset or parallel separately. New saved cards update
          progress automatically when you open this page.
        </p>
        {status ? (
          <p role="status" className="workflowNotice">
            {status}
          </p>
        ) : null}
        {loading ? <p role="status">Loading your sets…</p> : null}
        {editing ? (
          <section className="panel">
            <h2>{editId ? "Edit checklist" : "Define your checklist"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <fieldset
                className="formGrid"
                disabled={busy}
                style={{ border: 0, padding: 0, margin: 0 }}
              >
                <label className="fieldBlockWide">
                  Use a set from your collection
                  <select
                    className="input"
                    aria-label="Use a set from your collection"
                    defaultValue=""
                    onChange={(e) => {
                      const card = products.find(
                        ([key]) => key === e.target.value,
                      )?.[1];
                      if (card)
                        setDraft({
                          ...draft,
                          sport: card.sport,
                          year: card.year,
                          brand: card.brand,
                          set_name: card.set,
                          title:
                            draft.title ||
                            [card.year, card.brand, card.set].join(" "),
                        });
                    }}
                  >
                    <option value="">Choose a saved set or enter below</option>
                    {products.map(([key, c]) => (
                      <option key={key} value={key}>
                        {[c.sport, c.year, c.brand, c.set].join(" · ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Checklist name
                  <input
                    className="input"
                    required
                    maxLength={150}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Sport
                  <select
                    className="input"
                    aria-label="Sport"
                    value={draft.sport}
                    onChange={(e) =>
                      setDraft({ ...draft, sport: e.target.value as Sport })
                    }
                  >
                    <option>Hockey</option>
                    <option>Baseball</option>
                  </select>
                </label>
                {(
                  [
                    ["year", "Year / season"],
                    ["brand", "Brand"],
                    ["set_name", "Set"],
                    ["subset", "Exact subset (optional)"],
                    ["parallel", "Exact parallel (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      className="input"
                      maxLength={150}
                      required={key !== "subset" && key !== "parallel"}
                      value={draft[key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <p className="helperText fieldBlockWide">
                  Blank subset and parallel match only cards whose corresponding
                  fields are blank. Enter the same values you use on your saved
                  cards. A season such as 2025–26 should match your collection's
                  year.
                </p>
                <label>
                  First card number
                  <input
                    className="input"
                    type="number"
                    min={1}
                    disabled={!!text.trim()}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  Last card number
                  <input
                    className="input"
                    type="number"
                    min={1}
                    disabled={!!text.trim()}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <label className="fieldBlockWide">
                  Or paste specific card numbers
                  <textarea
                    className="input textarea"
                    aria-label="Or paste specific card numbers"
                    rows={7}
                    maxLength={700000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      "1 | Player name | Team\n2 | Player name | Team\nYG-1 | Player name | Team"
                    }
                  />
                </label>
                <p className="helperText fieldBlockWide">
                  One entry per line: number | player | team. Names and teams
                  are optional. Pasted entries replace the range. Up to 2,000
                  unique card numbers; gaps and letter prefixes are supported.
                  Verify the range against the real checklist before saving.
                </p>
                <div className="buttonRow fieldBlockWide">
                  <button className="btn primary" type="submit">
                    Save checklist
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          </section>
        ) : null}
        {!loading && lists.length ? (
          <section className="panel">
            <label className="label" htmlFor="tracked-set">
              Tracked checklist
            </label>
            <select
              id="tracked-set"
              className="input"
              value={selected}
              disabled={busy}
              onChange={(e) => {
                setSelected(e.target.value);
                setView("all");
                setSearch("");
              }}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            {list && result ? (
              <>
                <p className="helperText">
                  {[
                    list.sport,
                    list.year,
                    list.brand,
                    list.set_name,
                    list.subset || "Blank subset",
                    list.parallel || "Blank parallel",
                  ].join(" · ")}{" "}
                  · User-defined checklist
                </p>
                <div className="setProgress">
                  <div>
                    <strong>{result.percent}% complete</strong>
                    <span>
                      {result.owned.length} of {result.total} card numbers owned
                    </span>
                  </div>
                  <progress
                    max={result.total}
                    value={result.owned.length}
                    aria-label="Set completion progress"
                  />
                </div>
                <div className="setStats">
                  <div>
                    <strong>{result.missing.length}</strong>
                    <span>Missing numbers</span>
                  </div>
                  <div>
                    <strong>{result.duplicates.length}</strong>
                    <span>Numbers with duplicates</span>
                  </div>
                  <div>
                    <strong>{result.extraCopies}</strong>
                    <span>Extra copies</span>
                  </div>
                </div>
                <div className="buttonRow">
                  <button
                    className="btn ghost"
                    disabled={busy}
                    onClick={() => begin(list)}
                  >
                    Edit checklist
                  </button>
                  <button
                    className="btn ghost"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    Delete checklist
                  </button>
                  <CollectionPdfExport
                    cards={missingCards}
                    filtered={missingCards}
                    disabled={!missingCards.length}
                    kind="wanted"
                    title={`${list.title} · User-defined checklist`}
                    filterDescription={list.title}
                  />
                </div>
                <p className="helperText">
                  Print / PDF generates the missing-card want list only. It does
                  not add items to your saved Want list or inventory.
                </p>
                {result.outside.length ? (
                  <p className="workflowNotice">
                    {result.outside.length} matching collection entries have a
                    blank or unlisted card number and are excluded from
                    progress.
                  </p>
                ) : null}
                <div className="setResultControls">
                  <label>
                    Show
                    <select
                      className="input"
                      aria-label="Show"
                      value={view}
                      onChange={(e) => setView(e.target.value as typeof view)}
                    >
                      <option value="all">All checklist entries</option>
                      <option value="missing">Missing only</option>
                      <option value="duplicates">Duplicates only</option>
                    </select>
                  </label>
                  <label>
                    Search checklist
                    <input
                      className="input"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                <ul className="setChecklistRows">
                  {rows.map((e) => (
                    <li key={e.number}>
                      <span className={e.quantity ? "setOwned" : "setMissing"}>
                        {e.quantity ? "Owned" : "Missing"}
                      </span>
                      <div>
                        <strong>
                          #{e.number}
                          {e.player ? ` · ${e.player}` : ""}
                        </strong>
                        {e.team ? <small>{e.team}</small> : null}
                      </div>
                      <span>{e.quantity ? `Qty ${e.quantity}` : "Need 1"}</span>
                    </li>
                  ))}
                </ul>
                {!rows.length ? (
                  <p className="helperText">No entries match this view.</p>
                ) : null}
              </>
            ) : null}
          </section>
        ) : !loading && !editing ? (
          <section className="panel">
            <h2>Start tracking a set.</h2>
            <p>
              Define the expected card numbers, and your saved cards will show
              how close you are to finishing.
            </p>
          </section>
        ) : null}
      </PageShell>
    </AuthGate>
  );
}
