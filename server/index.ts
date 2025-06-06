import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { WebSocket } from 'ws';
global.WebSocket = WebSocket;

dotenv.config();

// Configurações de segurança
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(limiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// Health checks
app.get('/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.status(200).json({ status: 'healthy', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', db: 'disconnected' });
  }
});

// Logging middleware atualizado
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[REQUEST]', logData);
      }
    }
  });

  next();
});

// Error handling melhorado
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = status >= 500 ? 'Internal Server Error' : err.message;
  
  if (status >= 500) {
    console.error('[ERROR]', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  res.status(status).json({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

(async () => {
  const server = await registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`Servidor iniciado na porta ${port}`);
    log(`Modo: ${app.get("env")}`);
  });
})();