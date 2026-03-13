import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  boolean,
  pgEnum,
  real,
  varchar,
} from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["gemini", "gpt_frames"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["open", "acknowledged", "resolved"]);
export const videoStatusEnum = pgEnum("video_status", [
  "uploaded",
  "extracting_frames",
  "analyzing_gpt",
  "analyzing_gemini",
  "saving_results",
  "done",
  "error",
]);
export const cameraStatusEnum = pgEnum("camera_status", ["active", "inactive", "error"]);

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("restaurant"),
  city: text("city").notNull(),
  cameras: integer("cameras").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeCameras = pgTable("store_cameras", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  status: cameraStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipeSpecs = pgTable("recipe_specs", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").references(() => recipes.id).notNull(),
  specJson: jsonb("spec_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoUploads = pgTable("video_uploads", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  durationSec: real("duration_sec"),
  status: videoStatusEnum("status").notNull().default("uploaded"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoFrames = pgTable("video_frames", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videoUploads.id).notNull(),
  frameIndex: integer("frame_index").notNull(),
  timestampSec: real("timestamp_sec").notNull(),
  localPathOrRef: text("local_path_or_ref").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiVideoAnalysisGemini = pgTable("ai_video_analysis_gemini", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videoUploads.id).notNull(),
  model: text("model").notNull(),
  rawJson: jsonb("raw_json"),
  normalizedJson: jsonb("normalized_json"),
  summaryText: text("summary_text"),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiFrameAnalysisGpt = pgTable("ai_frame_analysis_gpt", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videoUploads.id).notNull(),
  frameId: integer("frame_id").references(() => videoFrames.id),
  model: text("model").notNull(),
  rawJson: jsonb("raw_json"),
  normalizedJson: jsonb("normalized_json"),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipeComplianceResults = pgTable("recipe_compliance_results", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videoUploads.id).notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id).notNull(),
  provider: providerEnum("provider").notNull(),
  scoreTotal: real("score_total").notNull().default(0),
  ingredientPresenceScore: real("ingredient_presence_score"),
  assemblyOrderScore: real("assembly_order_score"),
  portionScore: real("portion_score"),
  presentationScore: real("presentation_score"),
  safetyScore: real("safety_score"),
  reasonsJson: jsonb("reasons_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeAlerts = pgTable("store_alerts", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  videoId: integer("video_id").references(() => videoUploads.id),
  provider: text("provider"),
  severity: alertSeverityEnum("severity").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  status: alertStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("operator"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
