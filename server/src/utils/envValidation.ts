interface EnvVar {
  key: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

const ENV_SCHEMA: EnvVar[] = [
  { key: "DATABASE_URL", required: true, description: "PostgreSQL connection string" },
  { key: "JWT_SECRET", required: false, defaultValue: "mlr-platform-dev-secret-change-me", description: "JWT signing secret" },
  { key: "PORT", required: false, defaultValue: "3001", description: "API server port" },
  { key: "CLIENT_URL", required: false, defaultValue: "http://localhost:5173", description: "Frontend origin for CORS" },
  { key: "NAFATH_API_BASE", required: false, description: "Nafath identity verification API" },
  { key: "NAFATH_API_KEY", required: false, description: "Nafath API key" },
  { key: "NAFITH_API_BASE", required: false, description: "Nafith Sanad issuance API" },
  { key: "NAFITH_API_KEY", required: false, description: "Nafith API key" },
  { key: "PAYMENT_GATEWAY_API_KEY", required: false, description: "Payment gateway API key" },
  { key: "ZATCA_API_KEY", required: false, description: "ZATCA e-invoicing API key" },
];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_SCHEMA) {
    const value = process.env[v.key];
    if (!value && v.required) {
      errors.push(`Missing required env var: ${v.key} — ${v.description}`);
    } else if (!value && !v.required && v.defaultValue) {
      process.env[v.key] = v.defaultValue;
    }
  }

  if (process.env.JWT_SECRET === "mlr-platform-dev-secret-change-me") {
    warnings.push("JWT_SECRET is using the default dev value — change it for production");
  }

  const integrations = ["NAFATH_API_KEY", "NAFITH_API_KEY", "PAYMENT_GATEWAY_API_KEY", "ZATCA_API_KEY"];
  const stubbed = integrations.filter((k) => !process.env[k]);
  if (stubbed.length > 0) {
    warnings.push(`Stubbed integrations (dev mode): ${stubbed.join(", ")}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function printEnvReport(report: ReturnType<typeof validateEnv>): void {
  if (report.errors.length > 0) {
    console.error("  ENV ERRORS:");
    for (const e of report.errors) console.error(`    ${e}`);
  }
  if (report.warnings.length > 0) {
    console.warn("  ENV WARNINGS:");
    for (const w of report.warnings) console.warn(`    ${w}`);
  }
  if (report.valid && report.warnings.length === 0) {
    console.log("  Environment: all checks passed");
  }
}
