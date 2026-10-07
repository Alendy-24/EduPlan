const requests = new Map();
export function fetchCareerPhoto(name) {
  const key = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!requests.has(key)) {
    const request = fetch(`/api/programs/photo?name=${encodeURIComponent(name)}`)
      .then(response => response.ok ? response.json() : { data: null })
      .then(body => body.data ?? null)
      .catch(() => null);
    requests.set(key, request);
    // Failures can be retried after a minute; successful selections stay stable.
    request.then(photo => { if (!photo) setTimeout(() => requests.delete(key), 60000); });
  }
  return requests.get(key);
}
