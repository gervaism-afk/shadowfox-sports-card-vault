import { imageObjectPath, IMAGE_TYPES, MAX_IMAGE_BYTES } from './images';
import { collectionBackup, parseCollectionBackup, MAX_BACKUP_BYTES, MAX_BACKUP_CARDS } from './collection-backup';
import type { CardRecord } from './types';
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read the photo.'));reader.readAsDataURL(blob);});
}
export async function downloadCollectionBackup(cards: CardRecord[], ownerId: string, projectUrl: string, photos: boolean, signal: AbortSignal, progress: (completed:number,total:number)=>void) {
  if (cards.length > MAX_BACKUP_CARDS) throw new Error('This download supports up to 2,000 entries. Use the collection JSON export for a larger collection.');
  // Do not offer a download that our restore validator cannot read. Validate details before fetching photos.
  parseCollectionBackup(JSON.stringify(collectionBackup(cards.map(card=>({...card,frontImage:"",backImage:""})))));
  const prepared: CardRecord[]=[];let bytes=0;
  for(const card of cards) {
    signal.throwIfAborted();
    const next={...card,frontImage:'',backImage:''};
    if(photos) for(const side of ['frontImage','backImage'] as const) {
      const url=card[side];if(!url)continue;
      if(!imageObjectPath(url,ownerId,projectUrl)) throw new Error(`Could not include a photo for ${card.player}. Download without photos or replace the photo and retry.`);
      const response=await fetch(url,{signal,cache:'no-store'});if(!response.ok)throw new Error(`Could not download a photo for ${card.player}. Try again, or turn off photos.`);
      const blob=await response.blob();if(!IMAGE_TYPES.includes(blob.type)||blob.size>MAX_IMAGE_BYTES)throw new Error(`Unsupported photo for ${card.player}. Download without photos or replace it.`);
      next[side]=await dataUrl(blob);
    }
    bytes+=new TextEncoder().encode(JSON.stringify(next)).byteLength;
    if(bytes>MAX_BACKUP_BYTES-1024)throw new Error('Photos make this backup larger than 50 MB. Turn off photos and download the card details instead.');
    prepared.push(next);progress(prepared.length,cards.length);
  }
  signal.throwIfAborted();
  const blob=new Blob([JSON.stringify(collectionBackup(prepared))],{type:'application/json'});
  if(blob.size>MAX_BACKUP_BYTES)throw new Error('This backup exceeds the 50 MB file limit. Download without photos.');
  return blob;
}
