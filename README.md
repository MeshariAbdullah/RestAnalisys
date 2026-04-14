# نظام مراقبة جودة الفرنشايز | Franchise Quality Monitor

نظام متكامل لمراقبة جودة المطاعم والمطابخ عبر تحليل الفيديو بالذكاء الاصطناعي.

---

## 🏗️ المعمارية | Architecture

```
RestAnalisys/
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── db/                 # Drizzle ORM schemas + migrations
│   │   │   ├── schema.ts       # Full DB schema (12 tables)
│   │   │   ├── index.ts        # DB connection pool
│   │   │   ├── migrate.ts      # Migration runner
│   │   │   └── seed.ts         # Demo data seeder
│   │   ├── routes/             # Express routes
│   │   │   ├── auth.ts         # JWT auth (login/register)
│   │   │   ├── stores.ts       # Stores CRUD
│   │   │   ├── recipes.ts      # Recipes CRUD
│   │   │   ├── videos.ts       # Video upload + analysis
│   │   │   ├── alerts.ts       # Alerts management
│   │   │   └── dashboard.ts    # KPIs + charts + reports
│   │   ├── services/
│   │   │   ├── geminiService.ts    # Gemini 1.5 Pro video analysis
│   │   │   ├── openaiService.ts    # GPT-4o frame analysis (4 prompts)
│   │   │   └── videoService.ts     # ffmpeg frame extraction
│   │   ├── queues/
│   │   │   └── analysisQueue.ts    # Async job queue + processing pipeline
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT middleware
│   │   ├── utils/
│   │   │   └── schemas.ts      # Zod validation schemas
│   │   └── index.ts            # Express app entrypoint
│   └── migrations/             # SQL migrations
└── client/                     # React + TypeScript frontend
    └── src/
        ├── pages/
        │   ├── Landing.tsx     # Landing page + login
        │   ├── Dashboard.tsx   # KPIs + charts (polling 5s)
        │   ├── Simulator.tsx   # Dual-provider analysis UI
        │   ├── Recipes.tsx     # Recipe CRUD + spec builder
        │   ├── Alerts.tsx      # Alert management
        │   ├── Reports.tsx     # Daily/weekly/monthly reports
        │   ├── Employees.tsx   # Placeholder
        │   └── Heatmap.tsx     # Placeholder
        ├── components/
        │   ├── Layout.tsx      # Sidebar navigation
        │   └── ui/             # shadcn/ui components
        └── lib/
            ├── api.ts          # Type-safe API client
            └── utils.ts        # Helpers + formatters
```

---

## 🔄 تدفق البيانات | Data Flow

```
1. User uploads MP4 → POST /api/videos/upload
   → Saved to uploads/ dir, DB record created

2. User clicks "Start Analysis" → POST /api/videos/:id/start-analysis
   → Job queued in async processor

3. Async processing pipeline:
   a. [extracting_frames] ffmpeg → 1 frame/5s (max 30 frames)
   b. [analyzing_gpt]    GPT-4o × 4 prompts per frame (allSettled)
      - Prompt 1: Operational Metrics
      - Prompt 2: Issue Detection
      - Prompt 3: Performance Scoring
      - Prompt 4: Recipe Compliance (if recipe selected)
      → If high-alert events found: extract 10 more frames at 1fps
   c. [analyzing_gemini] Gemini 1.5 Pro full video analysis
      → Single comprehensive prompt with recipe spec
   d. [saving_results]   Aggregate + store compliance results
   e. Generate alerts if scores below thresholds

4. Frontend polls /api/videos/:id/status every 2s
   → When done: fetches /api/videos/:id/results
   → Displays side-by-side provider comparison
```

---

## 🚀 التشغيل المحلي | Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- ffmpeg (for frame extraction)

```bash
# Install ffmpeg
sudo apt-get install ffmpeg          # Ubuntu/Debian
brew install ffmpeg                   # macOS
```

### 1. Clone and install

```bash
git clone <repo-url>
cd RestAnalisys
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example server/.env
# Edit server/.env with your settings
```

Required environment variables:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/franchise_quality_monitor
JWT_SECRET=your-secure-secret
GEMINI_API_KEY=your-google-ai-studio-key    # Get from https://aistudio.google.com
OPENAI_API_KEY=sk-your-openai-key           # Get from https://platform.openai.com
```

### 3. Database setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE franchise_quality_monitor;"

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

### 4. Run the application

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api
- **Health check:** http://localhost:3001/api/health

### 5. Demo login

```
Email:    admin@franchise.sa
Password: admin123
```

---

## 🧪 Example Test Flow

### Testing with a sample kitchen video:

```bash
# 1. Create a short test video (30 seconds of kitchen footage)
ffmpeg -f lavfi -i testsrc=duration=30:size=640x480:rate=25 \
       -c:v libx264 test_kitchen.mp4

# 2. Login via API
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@franchise.sa","password":"admin123"}' | jq -r '.token')

# 3. Upload video
VIDEO=$(curl -s -X POST http://localhost:3001/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test_kitchen.mp4" \
  -F "storeId=1" \
  -F "recipeId=1")
VIDEO_ID=$(echo $VIDEO | jq -r '.id')

# 4. Start analysis
curl -X POST "http://localhost:3001/api/videos/$VIDEO_ID/start-analysis" \
  -H "Authorization: Bearer $TOKEN"

# 5. Poll status
watch -n 2 "curl -s 'http://localhost:3001/api/videos/$VIDEO_ID/status' \
  -H 'Authorization: Bearer $TOKEN' | jq '.status'"

# 6. Get results (when status = "done")
curl "http://localhost:3001/api/videos/$VIDEO_ID/results" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Expected Results:
```json
{
  "video": { "id": 1, "status": "done", ... },
  "frames": 6,
  "gemini": {
    "normalizedJson": {
      "overallQualityScore": 75,
      "alertLevel": "low",
      "timeline": [...],
      "keyFindings": [...],
      "recipeCompliance": { "totalScore": 82, ... }
    }
  },
  "gpt": {
    "framesAnalyzed": 6,
    "analyses": [...]
  },
  "compliance": [
    { "provider": "gemini", "scoreTotal": 82 },
    { "provider": "gpt_frames", "scoreTotal": 78 }
  ],
  "agreementPct": 95.1
}
```

---

## 📊 Database Schema

| Table | Description |
|-------|-------------|
| `stores` | Restaurant/kitchen branches |
| `store_cameras` | Camera endpoints per store |
| `users` | System users with JWT auth |
| `recipes` | Recipe definitions |
| `recipe_specs` | JSON spec (ingredients, rules, thresholds) |
| `video_uploads` | Uploaded MP4 files with processing status |
| `video_frames` | Extracted frame references |
| `ai_video_analysis_gemini` | Gemini full video analysis results |
| `ai_frame_analysis_gpt` | GPT-4o per-frame analysis results |
| `recipe_compliance_results` | Compliance scores per provider |
| `store_alerts` | Generated alerts with severity |
| `employees` | Staff roster with store + shift + status |
| `employee_performance` | Per-employee compliance/safety/hygiene scores |

---

## 🤖 AI Integration

### Gemini 1.5 Pro
- **Input:** Full MP4 video (inline base64 via Files API)
- **Output:** Comprehensive JSON including timeline, metrics, compliance
- **Model:** `gemini-1.5-pro`

### GPT-4o Vision
- **Input:** JPEG frames (base64 encoded)
- **Prompts:** 4 separate prompts per frame (allSettled)
  1. Operational Metrics (hygiene, crowding, equipment)
  2. Issue Detection (violations, alert level)
  3. Performance Scoring (overall score, strengths)
  4. Recipe Compliance (if recipe selected)
- **Aggregation:** Results averaged across all frames

---

## 🔐 API Reference

```
POST /api/auth/login              { email, password } → { token, user }
POST /api/auth/register           { email, password, name } → { token, user }

GET  /api/stores                  → Store[]
POST /api/stores                  → Store
GET  /api/stores/:id              → Store + cameras

GET  /api/recipes                 → Recipe[]
POST /api/recipes                 { name, version, specJson } → Recipe
PUT  /api/recipes/:id             → Recipe
DELETE /api/recipes/:id           → { success }

GET  /api/videos                  → VideoUpload[]
POST /api/videos/upload           multipart { video, storeId, recipeId? } → VideoUpload
POST /api/videos/:id/start-analysis → { jobId, status }
GET  /api/videos/:id/status       → VideoStatus
GET  /api/videos/:id/results      → VideoResults (full analysis)

GET  /api/alerts                  ?storeId&provider&status → Alert[]
PATCH /api/alerts/:id/status      { status } → Alert
GET  /api/alerts/stats            → AlertStats

GET  /api/dashboard/kpis          → DashboardKPIs
GET  /api/dashboard/charts        → DashboardCharts
GET  /api/dashboard/reports       ?period=daily|weekly|monthly → Report

GET  /api/employees               ?storeId&status&shift → Employee[]
POST /api/employees               { storeId, name, role, shift, ... } → Employee
GET  /api/employees/:id           → EmployeeDetail (with performance history)
PUT  /api/employees/:id           → Employee
DELETE /api/employees/:id         → { success }
GET  /api/employees/stats         → EmployeeStats
GET  /api/employees/leaderboard/top → Top 10 by compliance
POST /api/employees/:id/performance → EmployeePerformance

GET  /api/heatmap                 → { points, cities, summary } (geo + risk)

GET  /api/health                  → { ok, providers }
```

---

## 🌐 UI Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with pricing + login |
| `/dashboard` | KPIs + charts (auto-refresh 5s) |
| `/simulator` | Upload + dual AI analysis |
| `/recipes` | Recipe CRUD + visual spec builder |
| `/alerts` | Alert list + filtering + status management |
| `/reports` | Daily/weekly/monthly reports |
| `/employees` | Employee CRUD + performance leaderboard |
| `/heatmap` | Geographic distribution + risk heatmap of stores |

All pages use **Arabic RTL layout** with Cairo font.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS + shadcn/ui |
| Charts | Recharts |
| Routing | Wouter |
| Data Fetching | TanStack Query v5 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI - Video | Google Gemini 1.5 Pro |
| AI - Frames | OpenAI GPT-4o Vision |
| Video Processing | fluent-ffmpeg |
| Job Queue | In-process async queue (BullMQ-ready) |
| Auth | JWT (bcryptjs) |
| Validation | Zod |
