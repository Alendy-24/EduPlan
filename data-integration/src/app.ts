import express from "express";
import { institutionsRouter } from "./routes/institutions.routes.js";
import { programsRouter } from "./routes/programs.routes.js";

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "eduplan-data-integration" });
});

app.use("/api/institutions", institutionsRouter);
app.use("/api/programs", programsRouter);
