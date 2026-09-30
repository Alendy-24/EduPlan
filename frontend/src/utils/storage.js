export function readStorage(storage, key, fallback, validate = () => true) {
  try { const value = JSON.parse(storage.getItem(key)); return value !== null && validate(value) ? value : fallback; }
  catch { return fallback; }
}
export function writeStorage(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function browserStorage(kind = 'localStorage') {
  try { return window[kind]; } catch { return null; }
}
export function safeReturn(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/^\/(login|register)(?:[/?#]|$)/.test(value) ? value : '/dashboard';
}
