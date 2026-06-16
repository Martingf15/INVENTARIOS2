import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let pool: Pool | null = null;
let isFallback = true;
let dbError: string | undefined = undefined;

// Fallback inside-memory database
let localPersonal = [
  { id: 1, nombre_completo: "Carlos Pérez Morales", correo: "carlos.perez@empresa.com", telefono: "555-0199" },
  { id: 2, nombre_completo: "Ana María Gómez Torres", correo: "ana.gomez@empresa.com", telefono: "555-0144" },
  { id: 3, nombre_completo: "Roberto Solís Duarte", correo: "roberto.solis@empresa.com", telefono: "555-0182" }
];

let localProductos = [
  { id: 1, nombre: "Laptop Dell Latitude 3420", descripcion: "Core i7, 16GB RAM, 512GB SSD, Windows 11", cantidad: 4, precio_unitario: 1200.00, codigo_local: "EQ-001", categoria: "Cómputo", resguardo_id: 1, edificio: "Edificio Principal", ubicacion: "Piso 2, Oficina 204" },
  { id: 2, nombre: "Monitor HP M24f Full HD", descripcion: "Pantalla 24 pulgadas IPS con puertos HDMI y VGA", cantidad: 12, precio_unitario: 180.00, codigo_local: "EQ-002", categoria: "Monitores", resguardo_id: 2, edificio: "Edificio Principal", ubicacion: "Almacén Planta Baja" },
  { id: 3, nombre: "Proyector Epson PowerLite E20", descripcion: "Brillo 3400 lúmenes, parlante integrado de 5W", cantidad: 1, precio_unitario: 450.00, codigo_local: "EQ-003", categoria: "Audiovisual", resguardo_id: 1, edificio: "Edificio Central", ubicacion: "Sala de Juntas B" }
];

const LOCAL_DB_PATH = path.join(process.cwd(), "inventario_fallback.json");

function loadLocalDb() {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
      if (data.personal && data.productos) {
        localPersonal = data.personal;
        localProductos = data.productos;
        console.log("Mock database loaded from local JSON file.");
      }
    } catch (e: any) {
      console.error("Error reading local db file, using defaults:", e.message);
    }
  } else {
    saveLocalDb();
  }
}

function saveLocalDb() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ personal: localPersonal, productos: localProductos }, null, 2), "utf-8");
  } catch (e: any) {
    console.error("Error saving local db file:", e.message);
  }
}

// Check database setup
async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.trim() !== "") {
    try {
      console.log("Database connection URL detected. Connecting...");
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      
      const client = await pool.connect();
      console.log("Connected to Neon PostgreSQL successfully!");
      isFallback = false;
      
      // Establish schemas
      await client.query(`
        CREATE TABLE IF NOT EXISTS personal_resguardo (
          id SERIAL PRIMARY KEY,
          nombre_completo VARCHAR(255) NOT NULL,
          correo VARCHAR(255),
          telefono VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS productos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          cantidad INTEGER NOT NULL DEFAULT 0,
          precio_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          codigo_local VARCHAR(100) UNIQUE NOT NULL,
          categoria VARCHAR(100) NOT NULL,
          resguardo_id INTEGER REFERENCES personal_resguardo(id) ON DELETE SET NULL,
          edificio VARCHAR(100),
          ubicacion VARCHAR(150),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Check if seeding is required
      const countRes = await client.query("SELECT COUNT(*) FROM personal_resguardo");
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        console.log("Database tables are empty. Seeding with default dataset...");
        const p1 = await client.query(
          "INSERT INTO personal_resguardo (nombre_completo, correo, telefono) VALUES ($1, $2, $3) RETURNING id",
          ["Carlos Pérez Morales", "carlos.perez@empresa.com", "555-0199"]
        );
        const p2 = await client.query(
          "INSERT INTO personal_resguardo (nombre_completo, correo, telefono) VALUES ($1, $2, $3) RETURNING id",
          ["Ana María Gómez Torres", "ana.gomez@empresa.com", "555-0144"]
        );
        const p3 = await client.query(
          "INSERT INTO personal_resguardo (nombre_completo, correo, telefono) VALUES ($1, $2, $3) RETURNING id",
          ["Roberto Solís Duarte", "roberto.solis@empresa.com", "555-0182"]
        );

        const id1 = p1.rows[0].id;
        const id2 = p2.rows[0].id;

        await client.query(`
          INSERT INTO productos (nombre, descripcion, cantidad, precio_unitario, codigo_local, categoria, resguardo_id, edificio, ubicacion)
          VALUES 
          ('Laptop Dell Latitude 3420', 'Core i7, 16GB RAM, 512GB SSD, Windows 11', 4, 1200.00, 'EQ-001', 'Cómputo', $1, 'Edificio Principal', 'Piso 2, Oficina 204'),
          ('Monitor HP M24f Full HD', 'Pantalla 24 pulgadas IPS con puertos HDMI y VGA', 12, 180.00, 'EQ-002', 'Monitores', $2, 'Edificio Principal', 'Almacén Planta Baja'),
          ('Proyector Epson PowerLite E20', 'Brillo 3400 lúmenes, parlante integrado de 5W', 1, 450.00, 'EQ-003', 'Audiovisual', $1, 'Edificio Central', 'Sala de Juntas B')
        `, [id1, id2]);
      }
      
      client.release();
    } catch (err: any) {
      console.error("Neon PostgreSQL connection error. Falling back to local storage.", err.message);
      dbError = err.message;
      isFallback = true;
      loadLocalDb();
    }
  } else {
    console.log("No DATABASE_URL environment variable provided. Initializing in Fallback Database Mode.");
    isFallback = true;
    loadLocalDb();
  }
}

// API Routes

// Connection status
app.get("/api/status", (req, res) => {
  res.json({
    connected: !isFallback,
    isFallback,
    databaseName: isFallback ? "Local JSON DBMS file" : "Neon Serverless PostgreSQL",
    error: dbError
  });
});

// Admin authentication
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (password === "admin2026+") {
    res.json({ success: true, token: "admin-jwt-token-2026-auth-ok" });
  } else {
    res.status(401).json({ success: false, error: "Contraseña incorrecta." });
  }
});

// --- PERSONAL (CUSTODIOS) ---

// List all
app.get("/api/personal", async (req, res) => {
  if (!isFallback && pool) {
    try {
      const dbRes = await pool.query(`
        SELECT p.*, COALESCE((SELECT COUNT(*) FROM productos WHERE resguardo_id = p.id), 0) as total_equipos
        FROM personal_resguardo p
        ORDER BY p.nombre_completo ASC
      `);
      res.json(dbRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const list = localPersonal.map(p => {
      const count = localProductos.filter(pr => pr.resguardo_id === p.id).length;
      return { ...p, total_equipos: count };
    });
    // Sort alphabetically
    list.sort((a,b) => a.nombre_completo.localeCompare(b.nombre_completo));
    res.json(list);
  }
});

// Create
app.post("/api/personal", async (req, res) => {
  const { nombre_completo, correo, telefono } = req.body;
  if (!nombre_completo) {
    return res.status(400).json({ error: "El nombre completo es requerido." });
  }

  if (!isFallback && pool) {
    try {
      const dbRes = await pool.query(
        "INSERT INTO personal_resguardo (nombre_completo, correo, telefono) VALUES ($1, $2, $3) RETURNING *",
        [nombre_completo, correo || "", telefono || ""]
      );
      res.status(210).json(dbRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const newId = localPersonal.length > 0 ? Math.max(...localPersonal.map(p => p.id)) + 1 : 1;
    const newItem = { id: newId, nombre_completo, correo: correo || "", telefono: telefono || "" };
    localPersonal.push(newItem);
    saveLocalDb();
    res.status(201).json(newItem);
  }
});

// Update
app.put("/api/personal/:id", async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr, 10);
  const { nombre_completo, correo, telefono } = req.body;

  if (!nombre_completo) {
    return res.status(400).json({ error: "El nombre completo es obligatorio." });
  }

  if (!isFallback && pool) {
    try {
      const dbRes = await pool.query(
        "UPDATE personal_resguardo SET nombre_completo = $1, correo = $2, telefono = $3 WHERE id = $4 RETURNING *",
        [nombre_completo, correo || "", telefono || "", id]
      );
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: "Personal no encontrado." });
      }
      res.json(dbRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const idx = localPersonal.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Personal no encontrado." });
    }
    localPersonal[idx] = {
      ...localPersonal[idx],
      nombre_completo,
      correo: correo || "",
      telefono: telefono || ""
    };
    saveLocalDb();
    res.json(localPersonal[idx]);
  }
});

// Delete
app.delete("/api/personal/:id", async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr, 10);

  if (!isFallback && pool) {
    try {
      await pool.query("DELETE FROM personal_resguardo WHERE id = $1", [id]);
      res.json({ success: true, message: "Personal de resguardo eliminado correctamente." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const index = localPersonal.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Personal no encontrado." });
    }
    localPersonal.splice(index, 1);
    // Mimic ON DELETE SET NULL relation cascade
    localProductos = localProductos.map(p => {
      if (p.resguardo_id === id) {
        return { ...p, resguardo_id: null };
      }
      return p;
    });
    saveLocalDb();
    res.json({ success: true, message: "Personal de resguardo eliminado correctamente de la base de datos local." });
  }
});

// --- PRODUCTOS ---

// List all
app.get("/api/productos", async (req, res) => {
  if (!isFallback && pool) {
    try {
      const dbRes = await pool.query(`
        SELECT p.*, r.nombre_completo as resguardo_nombre, r.correo as resguardo_correo, r.telefono as resguardo_telefono
        FROM productos p
        LEFT JOIN personal_resguardo r ON p.resguardo_id = r.id
        ORDER BY p.nombre ASC
      `);
      res.json(dbRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const enriched = localProductos.map(p => {
      const custodian = localPersonal.find(cp => cp.id === p.resguardo_id);
      return {
        ...p,
        resguardo_nombre: custodian ? custodian.nombre_completo : undefined,
        resguardo_correo: custodian ? custodian.correo : undefined,
        resguardo_telefono: custodian ? custodian.telefono : undefined
      };
    });
    // Sort by name alphabetically
    enriched.sort((a,b) => a.nombre.localeCompare(b.nombre));
    res.json(enriched);
  }
});

// Create
app.post("/api/productos", async (req, res) => {
  const {
    nombre,
    descripcion,
    cantidad,
    precio_unitario,
    codigo_local,
    categoria,
    resguardo_id,
    edificio,
    ubicacion
  } = req.body;

  if (!nombre || !codigo_local || !categoria) {
    return res.status(400).json({ error: "Faltan campos obligatorios (nombre, código local, categoría)." });
  }

  // Validate duplicate local code
  if (!isFallback && pool) {
    try {
      const checkRes = await pool.query("SELECT id FROM productos WHERE codigo_local = $1", [codigo_local]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: `El código local '${codigo_local}' ya está registrado con otro producto.` });
      }

      const dbRes = await pool.query(`
        INSERT INTO productos (
          nombre, descripcion, cantidad, precio_unitario, codigo_local, categoria, resguardo_id, edificio, ubicacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `, [
        nombre,
        descripcion || "",
        parseInt(cantidad, 10) || 0,
        parseFloat(precio_unitario) || 0.0,
        codigo_local,
        categoria,
        resguardo_id ? parseInt(resguardo_id, 10) : null,
        edificio || "",
        ubicacion || ""
      ]);

      res.status(201).json(dbRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const isDuplicate = localProductos.some(p => p.codigo_local.toUpperCase() === codigo_local.toUpperCase());
    if (isDuplicate) {
      return res.status(400).json({ error: `El código local '${codigo_local}' ya está registrado con otro producto.` });
    }

    const newId = localProductos.length > 0 ? Math.max(...localProductos.map(p => p.id)) + 1 : 1;
    const newItem = {
      id: newId,
      nombre,
      descripcion: descripcion || "",
      cantidad: parseInt(cantidad, 10) || 0,
      precio_unitario: parseFloat(precio_unitario) || 0.0,
      codigo_local,
      categoria,
      resguardo_id: resguardo_id ? parseInt(resguardo_id, 10) : null,
      edificio: edificio || "",
      ubicacion: ubicacion || ""
    };
    localProductos.push(newItem);
    saveLocalDb();
    res.status(201).json(newItem);
  }
});

// Update
app.put("/api/productos/:id", async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr, 10);
  const {
    nombre,
    descripcion,
    cantidad,
    precio_unitario,
    codigo_local,
    categoria,
    resguardo_id,
    edificio,
    ubicacion
  } = req.body;

  if (!nombre || !codigo_local || !categoria) {
    return res.status(400).json({ error: "Faltan campos obligatorios (nombre, código local, categoría)." });
  }

  if (!isFallback && pool) {
    try {
      // Validate duplicate check
      const duplCheck = await pool.query("SELECT id FROM productos WHERE codigo_local = $1 AND id <> $2", [codigo_local, id]);
      if (duplCheck.rows.length > 0) {
        return res.status(400).json({ error: `El código local '${codigo_local}' ya es usado por otro producto.` });
      }

      const dbRes = await pool.query(`
        UPDATE productos SET 
          nombre = $1, 
          descripcion = $2, 
          cantidad = $3, 
          precio_unitario = $4, 
          codigo_local = $5, 
          categoria = $6, 
          resguardo_id = $7, 
          edificio = $8, 
          ubicacion = $9
        WHERE id = $10 RETURNING *
      `, [
        nombre,
        descripcion || "",
        parseInt(cantidad, 10) || 0,
        parseFloat(precio_unitario) || 0.0,
        codigo_local,
        categoria,
        resguardo_id ? parseInt(resguardo_id, 10) : null,
        edificio || "",
        ubicacion || "",
        id
      ]);

      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado." });
      }

      res.json(dbRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const isDuplicate = localProductos.some(p => p.codigo_local.toUpperCase() === codigo_local.toUpperCase() && p.id !== id);
    if (isDuplicate) {
      return res.status(400).json({ error: `El código local '${codigo_local}' ya es usado por otro producto.` });
    }

    const idx = localProductos.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    localProductos[idx] = {
      ...localProductos[idx],
      nombre,
      descripcion: descripcion || "",
      cantidad: parseInt(cantidad, 10) || 0,
      precio_unitario: parseFloat(precio_unitario) || 0.0,
      codigo_local,
      categoria,
      resguardo_id: resguardo_id ? parseInt(resguardo_id, 10) : null,
      edificio: edificio || "",
      ubicacion: ubicacion || ""
    };
    saveLocalDb();
    res.json(localProductos[idx]);
  }
});

// Delete
app.delete("/api/productos/:id", async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr, 10);

  if (!isFallback && pool) {
    try {
      const dbRes = await pool.query("DELETE FROM productos WHERE id = $1 RETURNING *", [id]);
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado." });
      }
      res.json({ success: true, message: "Producto eliminado correctamente." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const idx = localProductos.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }
    localProductos.splice(idx, 1);
    saveLocalDb();
    res.json({ success: true, message: "Producto eliminado de la base de datos local." });
  }
});

// Initialize database setup and then boot Express
setupDatabase().then(() => {
  startAppServer();
});

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
    console.log(`Server starting on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}
