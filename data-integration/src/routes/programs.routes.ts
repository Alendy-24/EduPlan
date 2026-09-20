import { Router } from "express";
import { getPrograms, getProgramsByCode } from "../services/programs.service.js";
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

  try {
    const data = await getPrograms({
      name: typeof request.query.name === "string" ? request.query.name : undefined,
      municipality:
        typeof request.query.municipality === "string" ? request.query.municipality : undefined,
      modality: typeof request.query.modality === "string" ? request.query.modality : undefined,
      institutionCode,
      ...pagination,
    });

    return response.json({ data, ...pagination, returned: data.length });
  } catch {
    return response.status(502).json({
      error: true,
      message: "No fue posible consultar los datos educativos",
    });
  }
});

programsRouter.get("/:code", async (request, response) => {
  if (!/^\d+$/.test(request.params.code)) {
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
