"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loadCards } from "@/lib/storage";
import type { CardRecord, Sport } from "../types";
import { normalizeCardYear, type CardCatalog } from "./types";
const requests = new Map<
  string,
  { at: number; promise: Promise<CardCatalog> }
>();
function requestCatalog(sport: Sport, year: string, scope: string) {
  const key = sport + "|" + year + "|" + scope;
  const cached = requests.get(key);
  if (cached && Date.now() - cached.at < 15 * 60 * 1000) return cached.promise;
  const promise = fetch(
    `/api/catalog?sport=${sport}&year=${encodeURIComponent(year)}&scope=${scope}`,
  )
    .then(async (response) => {
      if (!response.ok)
        throw new Error(
          "Reference suggestions are temporarily unavailable. You can still type every field.",
        );
      return response.json() as Promise<CardCatalog>;
    })
    .catch((error) => {
      requests.delete(key);
      throw error;
    });
  requests.set(key, { at: Date.now(), promise });
  return promise;
}
export function useCardCatalog(sport: Sport, year: string, scope = "all") {
  const [catalog, setCatalog] = useState<CardCatalog | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const canonicalYear = normalizeCardYear(year);
  const selected = /^(18|19|20)\d{2}(?:-\d{2})?$/.test(canonicalYear)
    ? canonicalYear
    : "";
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () => {
        requestCatalog(sport, selected, scope)
          .then((data) => {
            if (active) setCatalog(data);
          })
          .catch((e) => {
            if (active) setError(e.message);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      scope === "sets" ? 0 : 150,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sport, selected, scope]);
  return { catalog: catalog?.sport === sport ? catalog : null, loading, error };
}
export function useOwnedCardSuggestions() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardRecord[]>([]);
  useEffect(() => {
    let active = true;
    setCards([]);
    if (user)
      loadCards()
        .then((next) => {
          if (active) setCards(next);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);
  return cards;
}
