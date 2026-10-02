import { emptyCard } from './defaults';
import { identityFields, parseIdentification } from './ai-identification';
import { duplicateKey } from './matching';
import { MAX_IMAGE_BYTES } from './images';
import type { CardRecord } from './types';
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export const MAX_BACKUP_CARDS = 2000;
export type BackupEntry = { card: CardRecord; sourceKey: string; omittedPhotos: number };
export type BackupReview = { entries: BackupEntry[]; exportedAt: string | null; legacy: boolean };
export type RestoreEntry = BackupEntry & { restoreId: string; skip: boolean };
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function photo(value: unknown) {
  if (value === undefined || value === null || value === '') return { data: '', omitted: 0 };
  if (typeof value !== 'string') throw new Error('Invalid photo.');
  // Older exports contain links. Do not retain a link to another account's storage.
  if (/^https?:\/\//i.test(value)) return { data: '', omitted: 1 };
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[1].length % 4 !== 0) throw new Error('Use embedded JPEG, PNG or WebP photos.');
  const bytes = match[1].length / 4 * 3 - (match[1].endsWith('==') ? 2 : match[1].endsWith('=') ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) throw new Error('Each photo must be smaller than 12 MB.');
  return { data: value, omitted: 0 };
}
function timestamp(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fallback;
}
export function parseCollectionBackup(text: string): BackupReview {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('Choose a JSON backup smaller than 50 MB.');
  let input: unknown;
  try { input = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose a ShadowFox collection backup or JSON export.'); }
  const legacy = Array.isArray(input);
  if (!legacy && (!object(input) || input.format !== 'shadowfox-collection-backup' || input.version !== 1)) throw new Error('This is not a supported ShadowFox collection backup.');
  const rows = legacy ? input as unknown[] : (input as Record<string,unknown>).cards;
  if (!Array.isArray(rows) || rows.length > MAX_BACKUP_CARDS) throw new Error('A backup can contain up to 2,000 card entries.');
  const sourceIds = new Set<string>();
  const entries = rows.map((row, index): BackupEntry => {
    try {
      if (!object(row)) throw new Error('Invalid card record.');
      if (typeof row.player !== 'string') throw new Error("The player's name must be text.");
      if (row.sport !== 'Hockey' && row.sport !== 'Baseball') throw new Error('Choose Hockey or Baseball.');
      if (typeof row.quantity !== 'number' || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 100000) throw new Error('Quantity must be a whole number between 1 and 100,000.');
      const value = row.estimatedValueCad ?? 0;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000) throw new Error('Invalid CAD estimate.');
      const notes = row.notes ?? '';
      if (typeof notes !== 'string' || notes.length > 4000) throw new Error('Notes must be text of up to 4,000 characters.');
      const base = emptyCard();
      const fields = parseIdentification({ fields: Object.fromEntries(identityFields.filter(key => row[key] !== undefined).map(key => [key,row[key]])) }).fields;
      const front = photo(row.frontImage), back = photo(row.backImage);
      const sourceId = typeof row.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id) ? row.id.toLowerCase() : null;
      if (sourceId && sourceIds.has(sourceId)) throw new Error('This card ID appears more than once.');
      if (sourceId) sourceIds.add(sourceId);
      const card = { ...base, ...fields, player: row.player.trim(), quantity: row.quantity, estimatedValueCad: value, notes, frontImage: front.data, backImage: back.data, createdAt: timestamp(row.createdAt,base.createdAt) };
      // Source IDs are used only for repeat-safe restore; imported ownership/IDs are never written.
      const sourceKey = sourceId || `entry:${index}:${JSON.stringify([fields,row.quantity,value,notes,row.createdAt ?? ''])}`;
      return { card,sourceKey,omittedPhotos: front.omitted + back.omitted };
    } catch (error) { throw new Error(`Card ${index + 1}: ${error instanceof Error ? error.message : 'Invalid record.'}`); }
  });
  const exportedAt = !legacy && object(input) && typeof input.exportedAt === 'string' && Number.isFinite(Date.parse(input.exportedAt)) ? new Date(input.exportedAt).toISOString() : null;
  return { entries,exportedAt,legacy };
}
export async function restoreId(userId: string, sourceKey: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`shadowfox-restore-v1:${userId}:${sourceKey}`))).slice(0,16);
  bytes[6] = (bytes[6] & 15) | 128; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes,b => b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export async function reviewRestore(entries: BackupEntry[], existing: CardRecord[], userId: string): Promise<RestoreEntry[]> {
  const ids = new Set(existing.map(card=>card.id));
  const identities = new Set(existing.map(duplicateKey));
  return Promise.all(entries.map(async entry => { const id = await restoreId(userId,entry.sourceKey); return { ...entry,restoreId:id,skip:ids.has(id)||identities.has(duplicateKey(entry.card)) }; }));
}
export function collectionBackup(cards: CardRecord[]) {
  return { format:'shadowfox-collection-backup',version:1,exportedAt:new Date().toISOString(),cards:cards.map(card=>Object.fromEntries(['id',...identityFields,'quantity','estimatedValueCad','notes','frontImage','backImage','createdAt','updatedAt'].map(key=>[key,card[key as keyof CardRecord]]))) };
}
