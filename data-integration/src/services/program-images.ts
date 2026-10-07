import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

export const imageCareerKey = (name: string) => name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
interface Photo { id: number | string; src: string; alt: string; author: string; sourceName: string; sourceUrl: string; downloadUrl?: string }
const names: { records: string[][] } = JSON.parse(readFileSync(new URL('../../data/snies-program-names.json', import.meta.url), 'utf8'));
const officialNames = new Map(names.records.map(row => [imageCareerKey(row[2]), row[2]]));

// Serialize selections so concurrent careers cannot reserve the same photograph.
export function createCareerPhotoStore(file: string, search: (name: string) => Promise<Photo[]>, selected: (photo: Photo) => Promise<void> = async () => {}) {
  let saved: Record<string, Photo> = {};
  try { saved = JSON.parse(readFileSync(file, 'utf8')); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const misses = new Map<string, number>();
  let queue = Promise.resolve();
  return async (name: string): Promise<Photo | null> => {
    const key = imageCareerKey(name);
    let result: Photo | null = null;
    const operation = queue.then(async () => {
      if (saved[key]) { result = saved[key]; return; }
      if ((misses.get(key) ?? 0) > Date.now()) return;
      const used = new Set(Object.values(saved).map(photo => photo.id));
      const photo = (await search(name)).find(photo => !used.has(photo.id));
      if (!photo) { misses.set(key, Date.now() + 3600000); return; }
      await selected(photo);
      const next = { ...saved, [key]: photo };
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.tmp`, JSON.stringify(next));
      renameSync(`${file}.tmp`, file);
      saved = next;
      result = photo;
    });
    queue = operation.catch(() => {});
    await operation;
    return result;
  };
}

let store: ReturnType<typeof createCareerPhotoStore> | undefined;
let providerRetryAt = 0;
export async function getCareerPhoto(name: string) {
  const published = officialNames.get(imageCareerKey(name));
  if (!published || !(process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.PEXELS_API_KEY?.trim())) return null;
  store ??= createCareerPhotoStore(new URL('../../.cache/career-photos.json', import.meta.url).pathname, async career => {
    if (Date.now() < providerRetryAt) throw new Error('Photo provider cooling down');
    if (process.env.UNSPLASH_ACCESS_KEY?.trim()) return searchUnsplash(career, process.env.UNSPLASH_ACCESS_KEY.trim());
    const url = new URL('https://api.pexels.com/v1/search');
    url.search = new URLSearchParams({ query: career, locale: 'es-ES', orientation: 'landscape', per_page: '80' }).toString();
    const response = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY!.trim() }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      providerRetryAt = Date.now() + (response.status === 429 ? 3600000 : 60000);
      throw new Error('Photo provider unavailable');
    }
    const body = await response.json() as { photos: { id: number; src: { landscape: string }; alt: string; photographer: string; url: string }[] };
    // IDs of reviewed local photographs are reserved as well.
    const reserved = new Set([5474282,6753427,4033019,1061779,7433859,6683485,5212703,12152936,7777676,4843915,2833686,1448561,5953729,3735709]);
    return body.photos.filter(photo => !reserved.has(photo.id) && photo.src.landscape.startsWith('https://images.pexels.com/') && photo.url.startsWith('https://www.pexels.com/')).map(photo => ({ id: photo.id, src: photo.src.landscape, alt: photo.alt || `Fotografía de referencia: ${career}`, author: photo.photographer, sourceName: 'Pexels', sourceUrl: photo.url }));
  }, async photo => {
    if (!photo.downloadUrl) return;
    const response = await fetch(photo.downloadUrl, { headers: unsplashHeaders(process.env.UNSPLASH_ACCESS_KEY!.trim()), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Could not register photograph selection');
  });
  return store(published);
}

const unsplashHeaders = (key: string) => ({ Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' });
export async function searchUnsplash(career: string, key: string): Promise<Photo[]> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.search = new URLSearchParams({ query: career, orientation: 'landscape', per_page: '30', content_filter: 'high' }).toString();
  const response = await fetch(url, { headers: unsplashHeaders(key), signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    providerRetryAt = Date.now() + ([403,429].includes(response.status) ? 3600000 : 60000);
    throw new Error('Photo provider unavailable');
  }
  const body = await response.json() as { results: { id: string; urls: { regular: string }; alt_description: string | null; user: { name: string }; links: { html: string; download_location: string } }[] };
  return body.results.filter(photo => photo.urls.regular.startsWith('https://images.unsplash.com/') && photo.links.html.startsWith('https://unsplash.com/') && photo.links.download_location.startsWith('https://api.unsplash.com/photos/')).map(photo => {
    const attribution = new URL(photo.links.html);
    attribution.searchParams.set('utm_source', 'eduplan');
    attribution.searchParams.set('utm_medium', 'referral');
    // Preserve the provider URL, including ixid, for view tracking.
    return { id: `unsplash:${photo.id}`, src: photo.urls.regular, alt: photo.alt_description || `Fotografía de referencia: ${career}`, author: photo.user.name, sourceName: 'Unsplash', sourceUrl: attribution.toString(), downloadUrl: photo.links.download_location };
  });
}
