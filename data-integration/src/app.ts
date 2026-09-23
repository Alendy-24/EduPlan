import express from "express";
import { institutionsRouter } from "./routes/institutions.routes.js";
import { programsRouter } from "./routes/programs.routes.js";

export const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();

app.use(express.json());

app.use("/api/institutions", (request, response, next) => {
  if (frontendOrigin) {
    response.vary("Origin");
    if (request.get("Origin") === frontendOrigin) {
      response.setHeader("Access-Control-Allow-Origin", frontendOrigin);
    }
  }
  next();
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "eduplan-data-integration" });
});

app.use("/api/institutions", institutionsRouter);
app.use("/api/programs", programsRouter);
