export function websiteUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('@') || /\s/.test(value)) return null;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
