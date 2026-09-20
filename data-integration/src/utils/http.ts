const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: "application/json" };

  if (process.env.SOCRATA_APP_TOKEN) {
    headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  }

  try {
    const response = await fetch(url, { headers, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`La fuente externa respondió con estado ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function parsePagination(
  pageValue: unknown,
  limitValue: unknown,
): { page: number; limit: number } {
  const page = Number(pageValue ?? 1);
  const limit = Number(limitValue ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("page debe ser un número entero mayor o igual a 1");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit debe ser un número entero entre 1 y 100");
  }

  return { page, limit };
}
