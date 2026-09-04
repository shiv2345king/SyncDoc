import express, { Application } from "express";
import cors from "cors";
import passport from "./config/passport";
import authRoutes from "./routes/authRoutes";
import documentRoutes from "./routes/documentRoutes";
import blockRoutes from "./routes/blockRoutes";
import oauthRoutes from "./routes/oauthRoutes";

const app: Application = express();

// Core middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Feature routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/blocks", blockRoutes);

export default app;