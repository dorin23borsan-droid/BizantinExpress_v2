import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "bizantin-secret-key-2026";

// NOTE: SQLite uses a local file. On platforms like Railway, the filesystem is ephemeral.
// For production, consider using a persistent volume or a managed database like PostgreSQL.
const db = new Database("bizantin.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'merchant', 'runner', 'admin'
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER,
    merchant_name TEXT,
    merchant_phone TEXT,
    delivery_address TEXT,
    recipient_name TEXT,
    intercom TEXT,
    type TEXT, -- 'city' or 'suburb'
    distance REAL,
    price REAL,
    status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'completed'
    runner_id INTEGER,
    delivery_photo TEXT, -- Base64 photo
    delivery_slot TEXT, -- Selected time slot
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(merchant_id) REFERENCES users(id),
    FOREIGN KEY(runner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed default users if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const salt = bcrypt.genSaltSync(10);
  
  // --- CAMBIA QUI LE CREDENZIALI ---
  const ADMIN_USERNAME = "direzione"; 
  const ADMIN_PASSWORD = "Amuitat230618270788?!"; // Password scelta dall'utente
  // ---------------------------------

  const adminPass = bcrypt.hashSync(ADMIN_PASSWORD, salt);
  const merchantPass = bcrypt.hashSync("merchant123", salt);
  const runnerPass = bcrypt.hashSync("runner123", salt);
  
  // Update or Insert admin
  const existingAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get(ADMIN_USERNAME);
  if (existingAdmin) {
    db.prepare("UPDATE users SET password = ? WHERE username = ?").run(adminPass, ADMIN_USERNAME);
  } else {
    db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run(ADMIN_USERNAME, adminPass, "admin", "Amministratore");
  }
  db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run("merchant", merchantPass, "merchant", "Negozio Centro");
  db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run("runner", runnerPass, "runner", "Runner Marco");
}

async function startServer() {
  const app = express();
  
  // CORS configuration for Express
  app.use(cors({
    origin: "*", // In produzione potresti voler limitare gli origin
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send_message", (data) => {
      const { user_id, username, role, content } = data;
      try {
        const stmt = db.prepare("INSERT INTO messages (user_id, username, role, content) VALUES (?, ?, ?, ?)");
        const result = stmt.run(user_id, username, role, content);
        
        const newMessage = {
          id: result.lastInsertRowid,
          user_id,
          username,
          role,
          content,
          created_at: new Date().toISOString()
        };
        
        io.emit("receive_message", newMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/register", (req, res) => {
    const { username, password, role, name } = req.body;
    
    if (!username || !password || !role || !name) {
      return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username già in uso" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    try {
      const info = db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run(username, hashedPassword, role, name);
      const user = { id: info.lastInsertRowid, username, role, name };
      const token = jwt.sign(user, JWT_SECRET);
      res.json({ token, user });
    } catch (err) {
      res.status(500).json({ error: "Errore durante la registrazione" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  });

  app.get("/api/me", authenticateToken, (req: any, res) => {
    res.json(req.user);
  });

  app.get("/api/messages", authenticateToken, (req: any, res) => {
    const messages = db.prepare("SELECT * FROM messages ORDER BY created_at ASC LIMIT 100").all();
    res.json(messages);
  });

  // API Routes
  app.get("/api/orders", authenticateToken, (req: any, res) => {
    let orders;
    if (req.user.role === 'merchant') {
      orders = db.prepare("SELECT * FROM orders WHERE merchant_id = ? ORDER BY created_at DESC").all(req.user.id);
    } else if (req.user.role === 'runner') {
      orders = db.prepare("SELECT * FROM orders WHERE status = 'pending' OR runner_id = ? ORDER BY created_at DESC").all(req.user.id);
    } else {
      orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    }
    res.json(orders);
  });

  app.post("/api/orders", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Solo i negozianti possono creare ordini" });
    }

    const { merchant_phone, delivery_address, recipient_name, intercom, type, distance, price, delivery_slot } = req.body;
    const info = db.prepare(`
      INSERT INTO orders (merchant_id, merchant_name, merchant_phone, delivery_address, recipient_name, intercom, type, distance, price, delivery_slot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, req.user.name, merchant_phone, delivery_address, recipient_name, intercom, type, distance, price, delivery_slot);
    
    const newOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(info.lastInsertRowid);
    
    // Notify Runner and Admin
    io.emit("order:new", newOrder);
    res.json(newOrder);
  });

  app.patch("/api/orders/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { status, delivery_photo } = req.body;
    
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });

    if (status === 'completed') {
      if (req.user.role !== 'runner' && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Azione non consentita" });
      }
      db.prepare("UPDATE orders SET status = ?, delivery_photo = ? WHERE id = ?").run(status, delivery_photo || null, id);
      const updatedOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
      io.emit("order:completed", updatedOrder);
      res.json(updatedOrder);
    } else if (status === 'assigned') {
      if (req.user.role !== 'runner' && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Azione non consentita" });
      }
      db.prepare("UPDATE orders SET status = ?, runner_id = ? WHERE id = ?").run(status, req.user.id, id);
      const updatedOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
      io.emit("order:updated", updatedOrder);
      res.json(updatedOrder);
    }
  });

  app.delete("/api/orders/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Solo l'amministratore può eliminare ordini" });
    }
    const { id } = req.params;
    db.prepare("DELETE FROM orders WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = process.env.PORT || 3000;
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
