import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.js";
import fixtureRoutes from "./routes/fixtures.js";
import runRoutes from "./routes/runs.js";
import uploadRoutes from "./routes/uploads.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.use(healthRoutes);
  app.use(fixtureRoutes);
  app.use(runRoutes);
  app.use(uploadRoutes);

  return app;
}
