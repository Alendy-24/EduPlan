import { Router } from "express";
import { getInstitutionByCode, getInstitutions } from "../services/institutions.service.js";
import { parsePagination } from "../utils/http.js";

export const institutionsRouter = Router();

institutionsRouter.get("/", async (request, response) => {
  let pagination: { page: number; limit: number };
  try {
    pagination = parsePagination(request.query.page, request.query.limit);
  } catch (error) {
    return response.status(400).json({ error: true, message: (error as Error).message });
  }

  try {
    const rows = await getInstitutions({
      name: typeof request.query.name === "string" ? request.query.name : undefined,
      municipality:
        typeof request.query.municipality === "string" ? request.query.municipality : undefined,
      modality: typeof request.query.modality === "string" ? request.query.modality : undefined,
      program: typeof request.query.program === "string" ? request.query.program : undefined,
      sector: typeof request.query.sector === "string" ? request.query.sector : undefined,
      academicCharacter:
        typeof request.query.academicCharacter === "string"
          ? request.query.academicCharacter : undefined,
      includeModalities: request.query.includeModalities === "true",
      ...pagination,
    }, true);
    const hasMore = rows.length > pagination.limit;
    const data = rows.slice(0, pagination.limit);

    return response.json({ data, ...pagination, returned: data.length, hasMore });
  } catch {
    return response.status(502).json({
      error: true,
      message: "No fue posible consultar los datos educativos",
    });
  }
});

institutionsRouter.get("/:code", async (request, response) => {
  if (!/^\d+$/.test(request.params.code)) {
    return response.status(400).json({ error: true, message: "El código de institución no es válido" });
  }

  try {
    const institution = await getInstitutionByCode(request.params.code);
    if (!institution) {
      return response.status(404).json({ error: true, message: "Institución no encontrada" });
    }
    return response.json(institution);
  } catch {
    return response.status(502).json({
      error: true,
      message: "No fue posible consultar los datos educativos",
    });
  }
});
