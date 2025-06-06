import { z } from "zod";

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional(),
  PORT: z.string().regex(/^\d+$/, "PORT must be a number").optional(),
});

export function validateEnvironment() {
  try {
    const env = envSchema.parse(process.env);
    return {
      isValid: true,
      env,
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        env: null,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      isValid: false,
      env: null,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
}

export function logEnvironmentStatus() {
  const validation = validateEnvironment();
  
  if (!validation.isValid) {
    console.warn("⚠️ Environment validation warnings:");
    validation.errors?.forEach(error => console.warn(`  - ${error}`));
    console.warn("Continuing with available configuration...");
    return true; // Changed to non-blocking
  }
  
  console.log("✅ Environment validation passed");
  console.log(`   NODE_ENV: ${validation.env?.NODE_ENV}`);
  console.log(`   DATABASE_URL: ${validation.env?.DATABASE_URL ? '✓ Set' : '✗ Missing'}`);
  console.log(`   PORT: ${validation.env?.PORT || 'Using default (5000)'}`);
  
  return true;
}