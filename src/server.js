// src/server.js
// Main server entry point. Loads environment variables, initializes middleware,
// registers routes dynamically, and starts the Express application.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import registerRoutes from "./routes/index.js";

dotenv.config();

// Debug (remove before production)
console.log("SERVER PORT =", process.env.PORT);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("API is running."));

// Route loader and server bootstrap
(async () => {
  try {
    await registerRoutes(app);

    app.use((req, res) => res.status(404).json({ error: "Route not found" }));

    app.use((err, req, res, next) => {
      console.error("Internal Server Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://192.168.1.4:${PORT}`);
    });
  } catch (err) {
    console.error("Route registration failed:", err);
    process.exit(1);
  }
})();
