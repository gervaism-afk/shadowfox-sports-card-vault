"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import PageShell from "@/components/PageShell";
import CollectionPdfExport from "@/components/CollectionPdfExport";
import { useAuth } from "@/components/AuthProvider";
import { loadCards, saveCard } from "@/lib/storage";
import {
  loadChecklists,
  saveChecklist,
  deleteChecklist,
} from "@/lib/set-checklists";
import {
  completion,
  parseChecklist,
  productKey,
  matchingChecklistCards,
  type ChecklistEntry,
  type SetChecklist,
} from "@/lib/set-completion";
import { useCardCatalog } from "@/lib/catalog/client";
import { optionValues, normalizeOption } from "@/lib/catalog/types";
import type {
  PublishedChecklist,
  PublishedGroup,
} from "@/lib/catalog/checklist-parser";
import type { CatalogSet } from "@/lib/catalog/types";
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
  const [browseSport, setBrowseSport] = useState<Sport>("Hockey"),
    [browseYear, setBrowseYear] = useState(
      `${new Date().getUTCFullYear()}-${String(new Date().getUTCFullYear() + 1).slice(-2)}`,
    ),
    [browseBrand, setBrowseBrand] = useState("Upper Deck"),
    [browseSet, setBrowseSet] = useState(""),
    [published, setPublished] = useState<PublishedChecklist | null>(null),
    [publishedGroup, setPublishedGroup] = useState(""),
    [sourceLoading, setSourceLoading] = useState(false),
    [sourceError, setSourceError] = useState("");
  const { catalog, loading: catalogLoading } = useCardCatalog(
    browseSport,
    browseYear,
    "sets",
  );
  const importRun = useRef(0);
  useEffect(() => {
    importRun.current++;
    setPublished(null);
    setBrowseSet("");
    setSourceLoading(false);
    setSourceError("");
  }, [user?.id]);
  const availableSets = (catalog?.sets || []).filter(
    (p) =>
      normalizeOption(p.brand) === normalizeOption(browseBrand) &&
      normalizeOption(p.year) === normalizeOption(browseYear),
  );
  const browseYears = optionValues([
    browseYear,
    ...Array.from({ length: new Date().getUTCFullYear() - 1899 }, (_, i) =>
      browseSport === "Hockey"
        ? `${new Date().getUTCFullYear() - i}-${String(new Date().getUTCFullYear() - i + 1).slice(-2)}`
        : String(new Date().getUTCFullYear() - i),
    ),
    ...(catalog?.sets.map((p) => p.year) || []),
    ...cards.filter((c) => c.sport === browseSport).map((c) => c.year),
  ]).reverse();
  const browseBrands = optionValues([
    browseBrand,
    ...(catalog?.sets.map((p) => p.brand) || []),
    ...cards.filter((c) => c.sport === browseSport).map((c) => c.brand),
  ]);
  async function trackPublished(
    data: PublishedChecklist,
    group: PublishedGroup,
    run = importRun.current,
  ) {
    const uid = userRef.current;
    if (!uid || run !== importRun.current) return;
    setBusy(true);
    setStatus("");
    try {
      const title = [data.year, data.brand, data.set, group.label]
        .join(" · ")
        .slice(0, 150);
      const existing = lists.find(
        (l) => l.source_url === data.url && l.title === title,
      );
      const id = await saveChecklist(
        {
          title,
          sport: data.sport,
          year: data.year,
          brand: data.brand,
          set_name: data.set,
          subset: group.subset,
          parallel: group.parallel,
          entries: group.entries,
          source_url: data.url,
          source_name: data.source,
          source_checked_at: data.checkedAt,
        },
        existing?.id,
      );
      const next = [
        ...lists.filter((l) => l.id !== id),
        {
          id,
          title,
          sport: data.sport,
          year: data.year,
          brand: data.brand,
          set_name: data.set,
          subset: group.subset,
          parallel: group.parallel,
          entries: group.entries,
          source_url: data.url,
          source_name: data.source,
          source_checked_at: data.checkedAt,
        },
      ];
      if (uid !== userRef.current || run !== importRun.current) return;
      setLists(next);

      setSelected(id);
      setPublishedGroup(group.id);
      setEditing(false);
      setView("all");
      setSearch("");
      setStatus(
        "Published checklist loaded. Owned cards are matched across your entire collection.",
      );
    } catch (e: any) {
      if (uid === userRef.current && run === importRun.current)
        setSourceError(e.message || "Could not save this checklist.");
    } finally {
      if (uid === userRef.current) setBusy(false);
    }
  }
  async function loadPublished(product: CatalogSet, section = "base-complete") {
    if (busy || !userRef.current) return;
    const uid = userRef.current,
      run = ++importRun.current;
    setBrowseSet(product.url);
    setSourceLoading(true);
    setSourceError("");
    setPublished(null);
    try {
      const response = await fetch(
        `/api/catalog/checklist?sport=${browseSport}&url=${encodeURIComponent(product.url)}&section=${encodeURIComponent(section)}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Could not load the published checklist.",
        );
      if (uid !== userRef.current || run !== importRun.current) return;
      setPublished(data);
      const group =
        data.groups.find(
          (g: PublishedGroup) => g.id === section && g.entries.length,
        ) ||
        data.groups.find((g: PublishedGroup) => g.entries.length) ||
        data.groups[0];
      await trackPublished(data, group, run);
    } catch (e: any) {
      if (uid === userRef.current && run === importRun.current)
        setSourceError(e.message);
    } finally {
      if (uid === userRef.current && run === importRun.current)
        setSourceLoading(false);
    }
  }
  function changeBrowse(key: "sport" | "year" | "brand", value: string) {
    importRun.current++;
    setBrowseSet("");
    setPublished(null);
    setSourceLoading(false);
    setSourceError("");
    if (key === "sport") {
      setBrowseSport(value as Sport);
      setBrowseYear(
        value === "Hockey"
          ? `${new Date().getUTCFullYear()}-${String(new Date().getUTCFullYear() + 1).slice(-2)}`
          : String(new Date().getUTCFullYear()),
      );
      setBrowseBrand(value === "Hockey" ? "Upper Deck" : "Topps");
    } else if (key === "year") setBrowseYear(value);
    else setBrowseBrand(value);
  }
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
    document
      .querySelector<HTMLDetailsElement>("details.customChecklist")
      ?.setAttribute("open", "");
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
        source_url: null,
        source_name: null,
        source_checked_at: null,
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
            subset: e.subset ?? list.subset,
            parallel: e.parallel ?? list.parallel,
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
  async function markOwned(entry: ChecklistEntry) {
    if (busy || !list) return;
    const uid = userRef.current;
    setBusy(true);
    setStatus("");
    try {
      const latest = await loadCards();
      let next = latest;
      if (uid !== userRef.current) return;
      if (!matchingChecklistCards(latest, list, entry).length) {
        const card = {
          ...emptyCard(),
          sport: list.sport,
          year: list.year,
          brand: list.brand,
          set: list.set_name,
          subset: entry.subset ?? list.subset,
          parallel: entry.parallel ?? list.parallel,
          cardNumber: entry.number,
          player: entry.player || `Card #${entry.number}`,
          team: entry.team,
          rookie: entry.rookie ?? false,
          autograph: entry.autograph ?? false,
          relicPatch: entry.relicPatch ?? false,
          quantity: 1,
          notes: "Added from set checklist.",
        };
        const saved = await saveCard(card);
        next = [saved, ...latest];
      }
      if (uid !== userRef.current) return;
      setCards(next);
      setStatus(`Card #${entry.number} is owned in your collection.`);
    } catch (e: any) {
      if (uid === userRef.current)
        setStatus(e.message || "Could not add this card.");
    } finally {
      if (uid === userRef.current) setBusy(false);
    }
  }
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
        </div>
        <section className="panel">
          <h2>Choose your set</h2>
          <p className="helperText">
            Select a set to pull its published card checklist. Checkmarks
            reflect cards anywhere in your collection, including binders. Tick a
            missing card to add one copy to your collection.
          </p>
          <div className="formGrid">
            <label>
              Sport
              <select
                className="input"
                aria-label="Checklist sport"
                value={browseSport}
                disabled={busy || sourceLoading}
                onChange={(e) => changeBrowse("sport", e.target.value)}
              >
                <option>Hockey</option>
                <option>Baseball</option>
              </select>
            </label>
            <label>
              Year / season
              <select
                className="input"
                aria-label="Checklist year"
                value={browseYear}
                disabled={busy || sourceLoading}
                onChange={(e) => changeBrowse("year", e.target.value)}
              >
                {browseYears.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              Brand
              <select
                className="input"
                aria-label="Checklist brand"
                value={browseBrand}
                disabled={busy || sourceLoading}
                onChange={(e) => changeBrowse("brand", e.target.value)}
              >
                {browseBrands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <label>
              Set
              <select
                className="input"
                aria-label="Set to track"
                value={browseSet}
                disabled={loading || busy || sourceLoading || catalogLoading}
                onChange={(e) => {
                  const product = availableSets.find(
                    (p) => p.url === e.target.value,
                  );
                  if (product) void loadPublished(product);
                }}
              >
                <option value="">
                  {catalogLoading ? "Loading sets…" : "Select a published set"}
                </option>
                {availableSets.map((p) => (
                  <option value={p.url} key={p.url}>
                    {p.set}
                  </option>
                ))}
              </select>
            </label>
            {published ? (
              <label className="fieldBlockWide">
                Checklist section
                <select
                  className="input"
                  aria-label="Checklist section"
                  value={publishedGroup}
                  disabled={busy || sourceLoading}
                  onChange={(e) => {
                    const group = published.groups.find(
                      (g) => g.id === e.target.value,
                    );
                    if (group?.entries.length)
                      void trackPublished(published, group);
                    else if (group)
                      void loadPublished(
                        { url: published.url } as CatalogSet,
                        group.id,
                      );
                  }}
                >
                  {published.groups.map((g) => (
                    <option value={g.id} key={g.id}>
                      {g.label} ({g.count ?? g.entries.length} cards)
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          {sourceLoading ? (
            <p role="status">
              Pulling the published checklist and checking your entire
              collection…
            </p>
          ) : null}
          {sourceError ? (
            <p role="alert" className="workflowNotice">
              {sourceError}
            </p>
          ) : null}
          <p className="helperText">
            Source coverage varies by release. The app loads published card
            numbers and names; it does not invent missing checklists.
          </p>
        </section>
        {status ? (
          <p role="status" className="workflowNotice">
            {status}
          </p>
        ) : null}
        {loading ? <p role="status">Loading your sets…</p> : null}
        <details className="panel customChecklist">
          <summary>Advanced: custom checklist</summary>
          <p className="helperText">
            For a personal list or a release without a supported published
            checklist.
          </p>
          <button
            className="btn ghost"
            disabled={loading || busy}
            onClick={() => begin()}
          >
            Create checklist
          </button>
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
                      <option value="">
                        Choose a saved set or enter below
                      </option>
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
                    Blank subset and parallel match only cards whose
                    corresponding fields are blank. Enter the same values you
                    use on your saved cards. A season such as 2025–26 should
                    match your collection's year.
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
        </details>
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
                  ·{" "}
                  {list.source_url ? "Published checklist" : "Custom checklist"}
                </p>
                {list.source_url ? (
                  <p className="helperText">
                    <a
                      href={list.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {list.source_name || "Published checklist"}
                    </a>{" "}
                    · Checked{" "}
                    {list.source_checked_at
                      ? new Date(list.source_checked_at).toLocaleString()
                      : "previously"}{" "}
                    · Compared with your entire collection
                  </p>
                ) : null}
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
                    disabled={busy || editing || !missingCards.length}
                    kind="wanted"
                    title={`${list.title} · ${list.source_url ? "Published checklist" : "Custom checklist"}`}
                    filterDescription={list.title}
                  />
                </div>
                <p className="helperText">
                  Tick a missing card to add it to your collection. Owned cards
                  show a checkmark and quantity; open their collection entry to
                  change or remove them. Print / PDF generates only missing
                  cards. It does not add items to your saved Want list or
                  inventory.
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
                      <label className="setOwnership">
                        <input
                          type="checkbox"
                          aria-label={`${e.quantity ? "Owned" : "Mark owned"} card ${e.number}`}
                          checked={e.quantity > 0}
                          disabled={busy || editing || e.quantity > 0}
                          onChange={() => void markOwned(e)}
                        />
                        <span
                          className={e.quantity ? "setOwned" : "setMissing"}
                        >
                          {e.quantity ? "Owned" : "Missing"}
                        </span>
                      </label>
                      <div>
                        <strong>
                          #{e.number}
                          {e.player ? ` · ${e.player}` : ""}
                        </strong>
                        {e.team ? <small>{e.team}</small> : null}
                      </div>
                      <span>
                        {e.quantity ? `Qty ${e.quantity}` : "Need 1"}
                        {e.cardIds[0] ? (
                          <Link
                            className="setViewCard"
                            href={`/card/${e.cardIds[0]}`}
                          >
                            View card
                          </Link>
                        ) : null}
                      </span>
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
