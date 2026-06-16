import app from "./api/index";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";

const PORT = 3000;

async function startAppServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for rendering react on the same port
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development server starting on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}

startAppServer();
