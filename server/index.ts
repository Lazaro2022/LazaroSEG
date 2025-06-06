import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { logEnvironmentStatus } from "./env-validation";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function validateDatabaseConnection() {
  try {
    log("Validating database connection...");
    await db.execute("SELECT 1");
    log("Database connection validated successfully");
    return true;
  } catch (error) {
    log(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function startServer() {
  try {
    // Validate environment variables (non-blocking)
    logEnvironmentStatus();

    // Add basic health check that doesn't require database
    app.get("/health", (req, res) => {
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Add root endpoint
    app.get("/", (req, res) => {
      res.status(200).json({ 
        message: "Document Management System API", 
        status: "running",
        version: "1.0.0"
      });
    });

    // Validate database connection (non-blocking)
    const dbConnected = await validateDatabaseConnection();
    if (!dbConnected) {
      log("⚠️ Database connection failed - some features may be limited");
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error: ${message} (${status})`);
      res.status(status).json({ message });
    });

    // Setup environment-specific middleware
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Configure port for Cloud Run compatibility
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "0.0.0.0";

    return new Promise<void>((resolve, reject) => {
      const serverInstance = server.listen(port, host, () => {
        log(`Server started successfully on ${host}:${port}`);
        log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        resolve();
      });

      serverInstance.on('error', (error: Error) => {
        log(`Server failed to start: ${error.message}`);
        reject(error);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        log('SIGTERM received, shutting down gracefully');
        serverInstance.close(() => {
          log('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        log('SIGINT received, shutting down gracefully');
        serverInstance.close(() => {
          log('Server closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

startServer().catch((error) => {
  log(`Startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
