export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const MAX_STORED_LENGTH = 120000;
export function userInitial(name) { return name?.match(/[\p{L}\p{N}]/u)?.[0].toLocaleUpperCase('es') || 'E'; }
export function avatarKey(userId) { return Number.isInteger(userId) ? `eduplan-avatar-local-v1-user-${userId}` : null; }
export function readAvatar(storage, userId) {
  const key = avatarKey(userId);
  try { const value = key && storage?.getItem(key); return typeof value === 'string' && value.length <= MAX_STORED_LENGTH && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value) ? value : ''; } catch { return ''; }
}
export function persistAvatar(storage, userId, photo) {
  const key = avatarKey(userId);
  if (!key || !storage) throw new Error('No se puede guardar la foto en este dispositivo.');
  if (photo && (photo.length > MAX_STORED_LENGTH || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo))) throw new Error('La imagen procesada no es válida.');
  try { if (photo) storage.setItem(key, photo); else storage.removeItem(key); }
  catch { throw new Error('No se pudo guardar el cambio. Revisa el almacenamiento de este dispositivo.'); }
}
export async function compressAvatar(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Selecciona una imagen JPG, PNG o WebP válida.');
  if (!file.size || file.size > AVATAR_MAX_BYTES) throw new Error('La imagen debe pesar como máximo 5 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('No pudimos leer esta imagen. Prueba con otra foto.'); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) throw new Error('La imagen es demasiado grande. Usa una de hasta 20 megapíxeles.');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos procesar la foto en este navegador.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, 256, 256);
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
    const photo = canvas.toDataURL('image/jpeg', 0.82);
    if (photo.length > MAX_STORED_LENGTH) throw new Error('No pudimos reducir la foto lo suficiente. Prueba con otra.');
    return photo;
  } finally { bitmap.close(); }
}
