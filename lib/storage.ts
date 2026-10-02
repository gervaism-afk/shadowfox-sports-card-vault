import { CardRecord } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { duplicateKey } from "@/lib/matching";
import { fetchAllRows } from "@/lib/pagination";
import { cleanupCardImages, removeUnreferencedCardImage } from "@/lib/image-cleanup";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";

const BUCKET = "card-images";

type CardRow = {
  id: string;
  user_id: string;
  sport: string;
  player: string;
  year: string;
  brand: string;
  set_name: string;
  subset: string;
  card_number: string;
  team: string;
  rookie: boolean;
  autograph: boolean;
  relic_patch: boolean;
  serial_number: string;
  parallel: string;
  grading_company: string;
  grade: string;
  quantity: number;
  estimated_value_cad: number;
  notes: string;
  front_image_url: string;
  back_image_url: string;
  created_at: string;
  updated_at: string;
};

async function requireUser() {
  if (!isSupabaseConfigured() || !supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please log in");
  return data.user;
}

function rowToCard(row: CardRow): CardRecord {
  return {
    id: row.id,
    sport: (row.sport as any) || "Hockey",
    player: row.player || "",
    year: row.year || "",
    brand: row.brand || "",
    set: row.set_name || "",
    subset: row.subset || "",
    cardNumber: row.card_number || "",
    team: row.team || "",
    rookie: !!row.rookie,
    autograph: !!row.autograph,
    relicPatch: !!row.relic_patch,
    serialNumber: row.serial_number || "",
    parallel: row.parallel || "",
    gradingCompany: (row.grading_company as any) || "",
    grade: row.grade || "",
    quantity: Number(row.quantity || 1),
    estimatedValueCad: Number(row.estimated_value_cad || 0),
    notes: row.notes || "",
    frontImage: row.front_image_url || "",
    backImage: row.back_image_url || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cardToRow(card: CardRecord, userId: string) {
  return {
    id: card.id,
    user_id: userId,
    sport: card.sport,
    player: card.player,
    year: card.year,
    brand: card.brand,
    set_name: card.set,
    subset: card.subset,
    card_number: card.cardNumber,
    team: card.team,
    rookie: card.rookie,
    autograph: card.autograph,
    relic_patch: card.relicPatch,
    serial_number: card.serialNumber,
    parallel: card.parallel,
    grading_company: card.gradingCompany,
    grade: card.grade,
    quantity: card.quantity,
    estimated_value_cad: card.estimatedValueCad,
    notes: card.notes,
    front_image_url: card.frontImage,
    back_image_url: card.backImage,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  };
}

async function uploadDataUrl(dataUrl: string, folder: "front" | "back", userId: string, id: string, uploadedPaths: string[]) {
  if (!dataUrl || !supabase) return "";
  if (!dataUrl.startsWith("data:")) return dataUrl;

  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  if (!IMAGE_TYPES.includes(blob.type) || blob.size > MAX_IMAGE_BYTES) throw new Error("Use a JPEG, PNG, or WebP image smaller than 12 MB.");
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${folder}/${id}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;
  uploadedPaths.push(path);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function loadCards(): Promise<CardRecord[]> {
  const user = await requireUser();
  const data = await fetchAllRows<CardRow>((from, to) => supabase!.from("cards").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).order("id").range(from, to));
  void cleanupCardImages(supabase!, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL!).catch(() => {});
  return data.map(rowToCard);
}

export async function saveCard(card: CardRecord): Promise<CardRecord> {
  if (!Number.isInteger(card.quantity) || card.quantity < 1) throw new Error("Quantity must be a whole number of at least 1");
  if (!Number.isFinite(card.estimatedValueCad) || card.estimatedValueCad < 0) throw new Error("Estimated value must be zero or more");
  const user = await requireUser();
  const uploadedPaths: string[] = [];
  let saved: CardRecord;
  try {
    const front = await uploadDataUrl(card.frontImage, "front", user.id, card.id, uploadedPaths);
    const back = await uploadDataUrl(card.backImage, "back", user.id, card.id, uploadedPaths);

    const next: CardRecord = {
    ...card,
    frontImage: front || card.frontImage,
    backImage: back || card.backImage,
    updatedAt: new Date().toISOString(),
  };

    const { data, error } = await supabase!.from("cards").upsert(cardToRow(next, user.id)).select("*").single();
    if (error) throw error;
    saved = rowToCard(data as any);
  } catch (error) {
    // Compensate for partial uploads when an image or the card row fails to save.
    for (const path of uploadedPaths) {
      const imageUrl = supabase!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      // A lost response can conceal a committed save. Check references before cleanup.
      await removeUnreferencedCardImage(supabase!, user.id, imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL!).catch(() => {});
    }
    throw error;
  }
  void cleanupCardImages(supabase!, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL!).catch(() => {});
  return saved;
}

export async function findDuplicate(card: CardRecord): Promise<CardRecord | null> {
  const data = await loadCards();
  const existing = data.find((x) => duplicateKey(x) === duplicateKey(card) && x.id !== card.id);
  return existing || null;
}

export async function increaseQuantity(id: string, addQty: number) {
  await requireUser();
  if (!Number.isInteger(addQty) || addQty < 1) throw new Error("Quantity must be a positive whole number");
  const { data, error } = await supabase!.rpc("increment_card_quantity", { card_id: id, amount: addQty });
  if (error) throw error;
  return rowToCard(data as CardRow);
}

export async function deleteCard(id: string) {
  const user = await requireUser();
  const { error } = await supabase!.from("cards").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  await cleanupCardImages(supabase!, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL!).catch(() => {});
}

export async function getCard(id: string): Promise<CardRecord | null> {
  const user = await requireUser();
  const { data, error } = await supabase!.from("cards").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data ? rowToCard(data as any) : null;
}
