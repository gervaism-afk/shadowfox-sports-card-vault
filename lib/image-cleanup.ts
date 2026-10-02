import type { SupabaseClient } from "@supabase/supabase-js";
import { imageObjectPath } from "./images";

export async function removeUnreferencedCardImage(client: SupabaseClient, userId: string, imageUrl: string, projectUrl: string) {
  const path = imageObjectPath(imageUrl, userId, projectUrl);
  if (!path) return true;
  const references = await Promise.all([
    client.from("cards").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("front_image_url", imageUrl),
    client.from("cards").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("back_image_url", imageUrl),
  ]);
  if (references.some((result) => result.error || result.count === null || result.count > 0)) return false;
  const { error } = await client.storage.from("card-images").remove([path]);
  return !error;
}

export async function cleanupCardImages(client: SupabaseClient, userId: string, projectUrl: string) {
  const { data: queue, error } = await client.from("card_image_cleanup").select("id,image_url")
    .eq("user_id", userId).order("created_at").order("id").limit(100);
  if (error) return; // Missing migration or failed network: keep the saved card intact.
  for (const job of queue || []) {
    if (!await removeUnreferencedCardImage(client, userId, job.image_url, projectUrl)) continue;
    await client.from("card_image_cleanup").delete().eq("id", job.id).eq("user_id", userId);
  }
}
