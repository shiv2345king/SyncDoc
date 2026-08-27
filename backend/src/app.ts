import express, { Application } from "express";
import cors from "cors";

const app: Application = express();

// Core middleware
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});


export default app;