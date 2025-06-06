import { log } from "./vite";

export interface DeploymentConfig {
  port: number;
  host: string;
  environment: string;
  maxMemory: string;
  healthCheckPath: string;
  shutdownTimeout: number;
}

export function getDeploymentConfig(): DeploymentConfig {
  const environment = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Cloud Run specific optimizations
  const config: DeploymentConfig = {
    port,
    host: "0.0.0.0",
    environment,
    maxMemory: environment === 'production' ? "512Mi" : "1Gi",
    healthCheckPath: "/health",
    shutdownTimeout: 30000, // 30 seconds for graceful shutdown
  };

  return config;
}

export function logDeploymentInfo(config: DeploymentConfig) {
  log(`🚀 Deployment Configuration:`);
  log(`   Environment: ${config.environment}`);
  log(`   Host: ${config.host}`);
  log(`   Port: ${config.port}`);
  log(`   Health Check: ${config.healthCheckPath}`);
  log(`   Memory Limit: ${config.maxMemory}`);
  log(`   Shutdown Timeout: ${config.shutdownTimeout}ms`);
}

export function validateCloudRunEnvironment(): boolean {
  const requiredEnvVars = ['DATABASE_URL'];
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    log(`❌ Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }

  log(`✅ All required environment variables are set`);
  return true;
}

// Production-specific optimizations
export function configureProductionOptimizations() {
  if (process.env.NODE_ENV === 'production') {
    // Increase memory efficiency
    if (process.env.NODE_OPTIONS) {
      process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} --max-old-space-size=512`;
    } else {
      process.env.NODE_OPTIONS = '--max-old-space-size=512';
    }

    // Configure garbage collection for better performance
    process.env.NODE_OPTIONS += ' --gc-interval=100';
    
    log(`🔧 Production optimizations applied`);
  }
}