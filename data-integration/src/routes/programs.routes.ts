import { Router } from "express";
import { getProgramSearchPage, getProgramsByCode, getProgramFilterOptions } from "../services/programs.service.js";
import { suggestProgramNames } from '../services/snies-names.js';
import { parsePagination } from "../utils/http.js";

export const programsRouter = Router();

programsRouter.get("/", async (request, response) => {
  let pagination: { page: number; limit: number };
  try {
    pagination = parsePagination(request.query.page, request.query.limit);
  } catch (error) {
    return response.status(400).json({ error: true, message: (error as Error).message });
  }

  const institutionCode =
    typeof request.query.institutionCode === "string" ? request.query.institutionCode : undefined;
  if (institutionCode && !/^\d+$/.test(institutionCode)) {
    return response.status(400).json({ error: true, message: "institutionCode no es válido" });
  }
  const order = typeof request.query.order === "string" ? request.query.order : undefined;
  if (order && !["source", "asc", "desc", "institution-asc"].includes(order)) {
    return response.status(400).json({ error: true, message: "order no es válido" });
  }

  try {
    const result = await getProgramSearchPage({
      name: typeof request.query.name === "string" ? request.query.name : undefined,
      municipality:
        typeof request.query.municipality === "string" ? request.query.municipality : undefined,
      department: typeof request.query.department === "string" ? request.query.department : undefined,
      modality: typeof request.query.modality === "string" ? request.query.modality : undefined,
      institutionCode,
      academicLevel: typeof request.query.academicLevel === "string" ? request.query.academicLevel : undefined,
      knowledgeArea: typeof request.query.knowledgeArea === "string" ? request.query.knowledgeArea : undefined,
      order: order as "source" | "asc" | "desc" | "institution-asc" | undefined,
      ...pagination,
    });

    return response.json({ ...result, ...pagination, returned: result.data.length });
  } catch {
    return response.status(502).json({
      error: true,
      message: "No fue posible consultar los datos educativos",
    });
  }
});

programsRouter.get("/filters", async (_request, response) => {
  try { return response.json({ data: await getProgramFilterOptions() }); }
  catch { return response.status(502).json({ error: true, message: "No fue posible consultar los filtros del catálogo" }); }
});

programsRouter.get('/suggestions', (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  if (query.length > 200) return response.status(400).json({ error: true, message: 'La búsqueda es demasiado larga' });
  const academicLevel = typeof request.query.academicLevel === 'string' ? request.query.academicLevel : undefined;
  const institutionCode = typeof request.query.institutionCode === 'string' ? request.query.institutionCode : undefined;
  return response.json({ data: suggestProgramNames(query, { academicLevel, institutionCode }) });
});

programsRouter.get("/:code", async (request, response) => {
  if (!request.params.code.trim() || request.params.code.length > 512) {
    return response.status(400).json({ error: true, message: "El código de programa no es válido" });
  }

  try {
    const data = await getProgramsByCode(request.params.code);
    if (data.length === 0) {
      return response.status(404).json({ error: true, message: "Programa no encontrado" });
    }
    return response.json({ data, returned: data.length });
  } catch {
    return response.status(502).json({
      error: true,
      message: "No fue posible consultar los datos educativos",
    });
  }
});
