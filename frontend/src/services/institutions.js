const PAGE_SIZE = 12;
const baseUrl = (import.meta.env.VITE_DATA_INTEGRATION_URL ?? "").trim().replace(/\/+$/, "");

export async function getInstitutions(filters, page, signal) {
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), includeModalities: "true" });
    for (const [key, value] of Object.entries(filters)) {
        if (value?.trim()) query.set(key, value.trim());
    }

    // El endpoint existente de data-integration consulta los catálogos públicos del MEN.
    const response = await fetch(`${baseUrl}/api/institutions?${query}`, { signal });
    if (!response.ok) throw new Error("No fue posible consultar las instituciones");

    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error("Respuesta de instituciones no válida");

    if (typeof payload.hasMore !== "boolean") throw new Error("Respuesta de paginación no válida");

    return { institutions: payload.data, hasMore: payload.hasMore };
}

export async function getInstitutionByCode(code, signal) {
    if (!/^\d+$/.test(String(code))) throw new Error('Código de institución inválido');
    const response = await fetch(`${baseUrl}/api/institutions/${encodeURIComponent(code)}`, { signal });
    if (!response.ok) throw new Error('No fue posible consultar el detalle de la institución');
    const institution = await response.json();
    if (!institution || typeof institution.name !== 'string') throw new Error('Detalle de institución no válido');
    return institution;
}
