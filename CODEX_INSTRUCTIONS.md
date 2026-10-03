# CODEX IMPLEMENTATION GUIDE: FORMATIC

> **Target Agent / Engineer**: Codex  
> **Mission**: Build **Formatic**, a full-stack platform comprising a **Chrome Extension (Manifest V3)** for stealthily capturing Canvas LMS formative quizzes, and a **Next.js Web Application** for collaborative question staging, hierarchical folder organization, deduplication, and Aternos-themed study modes.

---

## 1. Project Directory Structure

Organize the repository as a clean monorepo:

```text
formatic/
├── apps/
│   ├── extension/                  # Chrome Extension (Manifest V3)
│   │   ├── manifest.json
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── background/
│   │   │   │   └── serviceWorker.ts
│   │   │   ├── content/
│   │   │   │   ├── canvasScraper.ts    # Passive DOM observer & scraper
│   │   │   │   └── stealthGuard.ts     # Anti-detection safeguards
│   │   │   ├── popup/
│   │   │   │   ├── index.html
│   │   │   │   ├── popup.tsx           # React/Tailwind staging tray
│   │   │   │   └── components/
│   │   │   │       ├── QuestionPreview.tsx
│   │   │   │       └── FolderPicker.tsx
│   │   │   ├── utils/
│   │   │   │   ├── hasher.ts           # SHA-256 question normalization
│   │   │   │   └── storage.ts          # chrome.storage.local wrapper
│   │   │   └── types/
│   │   │       └── canvas.ts
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── web/                        # Formatic Hub (Next.js 14 App Router)
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs         # CORS headers for extension & Vercel config
│       ├── vercel.json             # Vercel deployment & build overrides
│       ├── tailwind.config.ts      # Aternos blocky blue/white design tokens
│       ├── prisma/
│       │   ├── schema.prisma       # Database schema (PostgreSQL or SQLite)
│       │   └── seed.ts             # Default Admin & sample course data
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx        # Dashboard / Folder tree
│       │   │   ├── login/
│       │   │   │   └── page.tsx    # Soft-login modal / screen
│       │   │   ├── folder/
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx          # Folder overview & questions
│       │   │   │       ├── studystack/
│       │   │   │       │   └── page.tsx      # Side-by-side study table
│       │   │   │       ├── practice/
│       │   │   │       │   └── page.tsx      # Mock practice test
│       │   │   │       └── flashcards/
│       │   │   │           └── page.tsx      # Blocky flashcard deck
│       │   │   ├── admin/
│       │   │   │   └── page.tsx    # Question conflict & moderation panel
│       │   │   └── api/
│       │   │       ├── auth/
│       │   │       │   ├── login/route.ts
│       │   │       │   └── me/route.ts
│       │   │       ├── folders/
│       │   │       │   ├── route.ts
│       │   │       │   └── [id]/route.ts
│       │   │       ├── questions/
│       │   │       │   ├── route.ts
│       │   │       │   └── [id]/route.ts
│       │   │       └── sync/
│       │   │           └── push/route.ts     # Ingestion & Deduplication
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   │   ├── BlockyButton.tsx
│       │   │   │   ├── BlockyCard.tsx
│       │   │   │   ├── BlockyInput.tsx
│       │   │   │   └── Modal.tsx
│       │   │   ├── layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   └── FolderSidebar.tsx
│       │   │   └── study/
│       │   │       ├── StudyStackTable.tsx
│       │   │       ├── PracticeEngine.tsx
│       │   │       └── FlashcardDeck.tsx
│       │   └── lib/
│       │       ├── auth.ts         # JWT / Soft-login session utilities
│       │       ├── deduplicate.ts  # Normalization & Deduplication engine
│       │       └── prisma.ts       # Global Prisma client instance
├── packages/
│   └── shared-types/               # Shared TypeScript schemas
│       ├── index.ts
│       └── package.json
├── SYSTEM_ARCHITECTURE.md
├── CODEX_INSTRUCTIONS.md
└── README.md
```

---

## 2. Phase 1: Chrome Extension (Manifest V3)

### 2.1 `manifest.json` Specifications
Codex must construct a strict Manifest V3 without unnecessary permissions that trigger browser warnings:

```json
{
  "manifest_version": 3,
  "name": "Formatic - Canvas Formative Saver",
  "version": "1.0.0",
  "description": "Stealthily captures Canvas formative quiz questions and synchronizes with your study hub.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*/*"
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "src/background/serviceWorker.ts"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*/*quizzes/*",
        "*://*/*quiz_submissions/*"
      ],
      "js": ["src/content/canvasScraper.ts"],
      "run_at": "document_idle"
    }
  ]
}
```

### 2.2 Anti-Detection Rules (Critical Requirement)
Codex must enforce the following technical guarantees inside `src/content/stealthGuard.ts`:
1. **Never Dispatch Simulated Events**: No synthetic `KeyboardEvent`, `MouseEvent`, or `FocusEvent`.
2. **Never Call Focus Methods**: Never execute `.focus()`, `.blur()`, `.select()`, or `.scrollIntoView()`.
3. **No In-Page Focus-Stealing Modals**: Do not render intrusive alerts or popups on the quiz DOM. Use silent storage writes (`chrome.storage.local`).
4. **Passive MutationObserver Only**: Observe `#questions` or `#quiz-submission` with `childList: true, subtree: true`.

### 2.3 Canvas DOM Extraction Logic
Canvas quizzes generally render in two formats:
- **During Quiz Attempt**: `https://<school>.instructure.com/courses/<cid>/quizzes/<qid>/take`
- **Post-Submission Review**: `https://<school>.instructure.com/courses/<cid>/quizzes/<qid>/history?version=<v>` or `.../quiz_submissions/<id>`

#### CSS Selectors to Target:
- Question Container: `.quiz_question, .display_question, div[id^="question_"]`
- Question ID: Extracted from container `id` (e.g., `question_12345`) or `data-question-id`
- Question Text: `.question_text, .text, .question_holder .text`
- Answer Choices: `.answers .answer, .answer_label, .answer_row`
- Choice Text: `.answer_text, label, .answer_label`
- Correct Indicator (On Review page): `.correct_answer`, `.answer.correct_answer`, `.user_answer.correct_answer`
- User Selected Answer: `input[type="radio"]:checked`, `input[type="checkbox"]:checked`, or `.user_answer`
- Explanation / Feedback: `.quiz_comment, .answer_comments, .feedback`

#### Scraper Algorithm (`src/content/canvasScraper.ts`):
```typescript
export interface ScrapedChoice {
  text: string;
  isCorrect?: boolean | null;
  isSelected?: boolean;
}

export interface ScrapedQuestion {
  canvasQuestionId: string;
  courseTitle?: string;
  quizTitle?: string;
  questionText: string;
  choices: ScrapedChoice[];
  explanation?: string;
  isPostSubmission: boolean;
  timestamp: number;
}
```
1. Run on `document_idle`.
2. Detect if page is a quiz take or quiz review.
3. Traverse all `.quiz_question` elements.
4. Clean HTML text: Preserve necessary formatting (code snippets, math formulas), strip script tags and noise.
5. Save questions locally to `chrome.storage.local` keyed by `staged_attempts_${quizId}`.

### 2.4 Extension Review & Push Tray (`src/popup/popup.tsx`)
The popup UI provides a Git-like push interface:
- Displays active user status (logged into Formatic Hub).
- Shows current staged questions: Total count, verified answer count.
- **Target Folder Dropdown**: Fetches user's available folders from Formatic Hub (`GET /api/folders`).
- **"Push to Formatic Hub" Button**:
  - Sends payload via `POST /api/sync/push`.
  - Displays progress bar & push summary (e.g., *"Pushed 15 questions: 12 new, 3 merged"*).
  - Clears staged cache once successfully pushed.

---

## 3. Phase 2: Formatic Hub (Next.js 14 App Router)

### 3.1 Tech Stack
- **Framework**: Next.js 14 (App Router, Server Actions or Route Handlers).
- **Language**: TypeScript.
- **Styling**: Tailwind CSS + custom Aternos theme config.
- **Icons**: `lucide-react`.
- **Database**: PostgreSQL (Production) or SQLite (Local Dev) managed via **Prisma ORM**.
- **Auth**: Stateless JWT or Cookie session ("Soft Login").

### 3.2 Database Setup & Prisma Schema
Use the exact schema defined in [`SYSTEM_ARCHITECTURE.md`](file:///c:/Users/hoody/OneDrive/Documents/Personal%20Projects/Formatic/SYSTEM_ARCHITECTURE.md#L97-L208).
Key models: `User`, `Folder`, `Question`, `Choice`, `PushBatch`, `PushBatchItem`, `AdminLog`.

### 3.3 Soft Login & RBAC Implementation (`src/lib/auth.ts`)
- **Login / Register Route** (`POST /api/auth/login`):
  - Request body: `{ username: string, passcode: string }`.
  - If username exists: Validate password hash.
  - If username does not exist: Auto-register user with default `role: "USER"` (Soft login principle).
  - If `passcode === process.env.ADMIN_SECRET_KEY`: Automatically grant `role: "ADMIN"`.
  - Issue signed JWT in `httpOnly` cookie `formatic_session`.
- **Session Verification** (`GET /api/auth/me`):
  - Returns `{ id, username, role, nickname }`.

### 3.4 Hierarchical Folder System (`src/app/api/folders`)
Enable full recursive folder nesting:
- `GET /api/folders`: Returns full folder tree (using recursive CTE or hierarchical tree builder from `parentId`).
- `POST /api/folders`: Create folder `{ name, parentId?, description?, color? }`.
- `PATCH /api/folders/[id]`: Rename or change parent (`{ name?, parentId? }`).
- `DELETE /api/folders/[id]`: Recursive delete (cascades to child folders and questions, or reassigns).

### 3.5 Deduplication & Git-Like Push Engine (`src/app/api/sync/push/route.ts`)

#### Ingestion Workflow:
```typescript
// Algorithm to execute inside transaction for each question in push payload:
1. const normalizedText = normalizeQuestionText(rawText);
2. const hash = crypto.createHash('sha256').update(normalizedText).digest('hex');

3. const existing = await prisma.question.findUnique({
     where: { hash },
     include: { choices: true }
   });

if (!existing) {
  // New Question Insertion
  await prisma.question.create({
    data: {
      hash,
      text: rawText,
      plainText: stripHtml(rawText),
      folderId: targetFolderId,
      explanation: incoming.explanation,
      isVerified: incoming.choices.some(c => c.isCorrect !== null),
      timesEncountered: 1,
      choices: {
        create: incoming.choices.map(c => ({
          text: c.text,
          isCorrect: c.isCorrect ?? null
        }))
      }
    }
  });
  stats.newItems++;
} else {
  // Duplicate Detected -> Merge Logic
  let updatedVerified = existing.isVerified;
  let explanation = existing.explanation || incoming.explanation;

  for (const inChoice of incoming.choices) {
    const existingChoice = existing.choices.find(c => 
      normalizeText(c.text) === normalizeText(inChoice.text)
    );
    if (existingChoice) {
      // If we now know the correct answer and didn't before, update it!
      if (existingChoice.isCorrect === null && inChoice.isCorrect !== null) {
        await prisma.choice.update({
          where: { id: existingChoice.id },
          data: { isCorrect: inChoice.isCorrect }
        });
        updatedVerified = true;
      }
    } else {
      // New choice option encountered
      await prisma.choice.create({
        data: {
          questionId: existing.id,
          text: inChoice.text,
          isCorrect: inChoice.isCorrect ?? null
        }
      });
    }
  }

  await prisma.question.update({
    where: { id: existing.id },
    data: {
      timesEncountered: { increment: 1 },
      isVerified: updatedVerified,
      explanation
    }
  });
  stats.mergedItems++;
}
```

---

## 4. Phase 3: Aternos / Minecraft Visual Theme

Codex must configure Tailwind to match the blocky, high-contrast, clean blue-and-white Aternos aesthetic.

### 4.1 Tailwind Configuration (`tailwind.config.ts`)
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        aternos: {
          blue: "#2F80ED",
          darkBlue: "#1B5EBE",
          deepNavy: "#0E3A75",
          ice: "#EBF3FE",
          border: "#D1D5DB",
          darkBorder: "#1B5EBE",
          surface: "#FFFFFF",
          canvas: "#F3F6FA"
        }
      },
      boxShadow: {
        'blocky': '0 4px 0 #1B5EBE',
        'blocky-sm': '0 2px 0 #1B5EBE',
        'blocky-red': '0 4px 0 #991B1B',
        'blocky-green': '0 4px 0 #166534',
        'blocky-card': '0 4px 0 #CBD5E1'
      },
      borderRadius: {
        'blocky': '3px'
      }
    }
  },
  plugins: []
};

export default config;
```

### 4.2 Reusable Blocky Components
- **`BlockyButton.tsx`**:
  - Class styling: `px-4 py-2 bg-aternos-blue text-white font-bold rounded-blocky border-2 border-aternos-darkBlue shadow-blocky active:translate-y-1 active:shadow-none transition-all flex items-center gap-2`.
- **`BlockyCard.tsx`**:
  - Class styling: `bg-white border-2 border-slate-300 rounded-blocky shadow-blocky-card p-5 hover:border-aternos-blue transition-colors`.
- **`BlockyInput.tsx`**:
  - Class styling: `px-3 py-2 bg-white border-2 border-slate-300 rounded-blocky font-mono text-sm focus:border-aternos-blue focus:outline-none`.

---

## 5. Phase 4: Collaborative Study Modes

Inside any folder route (`/folder/[id]`), provide seamless navigation across three study modes:

### 5.1 StudyStack Side-by-Side Table (`/folder/[id]/studystack`)
- **Layout**: Two-column responsive tabular list.
  - Left column: Question text + question type badge + times encountered counter.
  - Right column: Correct answer(s) + explanation notes.
- **Interactive Controls**:
  - **"Hide Answers" Toggle**: Masks the right column with clickable blocky "Reveal" buttons for active recall practice.
  - **Filter**: Filter by "Verified Answers Only", "Unresolved Questions", or keyword search.
  - **Export**: Export folder as CSV or JSON.

### 5.2 Practice Test Engine (`/folder/[id]/practice`)
- **Configuration Modal**: Select question count (e.g., 5, 10, 20, All), shuffle questions toggle, shuffle answer options toggle.
- **Test Runner View**:
  - Chunky blocky progress bar across the top.
  - Question view with selectable option cards (`bg-white border-2 hover:border-aternos-blue`).
  - Radio button selection state with vibrant Aternos blue highlight (`bg-aternos-ice border-aternos-blue`).
- **Modes**:
  - **Immediate Feedback Mode**: Instantly shows green (correct) or red (incorrect) upon choosing, plus explanation.
  - **Exam Mode**: Submit at the end; displays overall score, percentage, and detailed breakdown.

### 5.3 Flashcard Review Engine (`/folder/[id]/flashcards`)
- **Card Design**:
  - Chunky 3D card widget with smooth flip animation.
  - Front: Question text, course tags.
  - Back: Correct answer highlighted in bold green, list of options, and teacher explanation.
- **Controls**:
  - Click card or press `[Spacebar]` to flip.
  - Button `[1]` / Left Arrow: **"Need Review"** (moves to review queue).
  - Button `[2]` / Right Arrow: **"Mastered"** (increments score).
  - Progress tracker: *"Card 7 of 24 (18 Mastered, 6 Review)"*.

---

---

## 6. Phase 5: Vercel Production Deployment & Accommodation

The web repository must be fully optimized for deployment on **Vercel** serverless infrastructure. Codex must adhere to the following specifications:

### 6.1 Monorepo Deployment & Build Settings
- **Root Directory in Vercel**: Set `apps/web` as the root directory in the Vercel project dashboard, or configure `apps/web/vercel.json`:
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs",
    "buildCommand": "npx prisma generate && next build"
  }
  ```
- **Prisma Client Generation on Build**:
  Inside `apps/web/package.json`, ensure the `postinstall` script runs `prisma generate`:
  ```json
  {
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "postinstall": "prisma generate"
    }
  }
  ```

### 6.2 Serverless Database & Connection Pooling
> [!IMPORTANT]
> Local SQLite files (`file:./dev.db`) **cannot** persist data in Vercel serverless functions (ephemeral filesystem). Production must use a managed PostgreSQL provider (Vercel Postgres, Neon, Supabase, or Railway) with connection pooling enabled.

Configure `apps/web/prisma/schema.prisma` with direct and pooled connection strings:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL") // Connection-pooled URL (PgBouncer/Neon pooler)
  directUrl = env("DIRECT_URL")   // Direct URL for schema migrations
}
```

### 6.3 CORS Accommodation for Chrome Extension (`apps/web/next.config.mjs`)
Because the Chrome extension sends requests from `chrome-extension://<EXTENSION_ID>`, Next.js route handlers on Vercel must return appropriate CORS headers to prevent cross-origin push blocks:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
        ]
      }
    ];
  }
};

export default nextConfig;
```
For `OPTIONS` preflight requests, route handlers (`/api/sync/push/route.ts` and `/api/folders/route.ts`) must export:
```typescript
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
```

### 6.4 Serverless Route Runtimes & Dynamic Rendering
To prevent build-time static generation failures with database calls:
- In routes querying Prisma or reading cookies, enforce Node.js serverless runtime and dynamic execution:
  ```typescript
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';
  ```

### 6.5 Required Environment Variables on Vercel
Codex must include `.env.example` documenting all variables required in the Vercel dashboard:
- `DATABASE_URL`: Serverless pooled PostgreSQL connection URL.
- `DIRECT_URL`: Direct PostgreSQL connection URL for Prisma migrations.
- `JWT_SECRET`: Random 256-bit secret string for signing soft-login session tokens.
- `ADMIN_SECRET_KEY`: Passcode used to bootstrap and authorize admin accounts.
- `NEXT_PUBLIC_APP_URL`: Production Vercel domain (e.g., `https://formatic.vercel.app`).

---

## 7. Phase 6: Verification & Testing Checklist

When Codex completes each module, execute this test matrix:

1. **Anti-Detection Verification**:
   - Verify that running the extension in a live Canvas quiz tab triggers zero `blur`, `focusout`, or `visibilitychange` events in `window` event logs.
2. **Push & Deduplication Verification**:
   - Push a set of 10 questions.
   - Re-push the same 10 questions with 2 new questions added.
   - Confirm server response: `10 merged, 2 new`, total count becomes 12.
3. **Folder Tree Hierarchy**:
   - Create Root Folder ("Biology 101").
   - Create Child Folder ("Unit 1: Cell Structure").
   - Create Grandchild Folder ("Organelles Quiz").
   - Move or rename grandchild folder; verify questions remain mapped accurately.
4. **Soft Login & Admin Capabilities**:
   - Verify instant login with a plain username and passcode.
   - Log in with `ADMIN_SECRET_KEY`; verify access to the `/admin` moderation page for merging duplicate questions.
5. **Study Suite Rendering**:
   - Verify that all three study views load smoothly on both desktop and mobile viewports.
6. **Vercel Build & Serverless Compatibility**:
   - Verify `npm run build` succeeds locally with `prisma generate`.
   - Verify CORS allows extension preflight `OPTIONS` requests to `/api/sync/push`.
   - Verify database queries function without timeouts on serverless cold starts.

