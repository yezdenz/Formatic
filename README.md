# Formatic 📘⚡

> **Collaborative Canvas LMS Formative Test Saver, Question Deduplication Engine & Study Suite**

Formatic is a tool for students to collaboratively preserve, curate, and master questions from formative Canvas LMS quizzes. It combines a **stealthy Chrome Extension (Manifest V3)** that automatically captures quiz questions without triggering Canvas anti-cheat or proctoring alerts, and a **centralized Web Hub** built with an Aternos/Minecraft-inspired blocky blue-and-white aesthetic.

---

## 🌟 Key Features

### 1. 🛡️ Stealth Canvas Saver (Chrome Extension MV3)
- **Passive capture**: Reads rendered quiz DOM with a content script and stores drafts in extension storage. It does not dispatch input events or call focus methods. Behavior in a particular Canvas or proctoring setup must be tested; no detection guarantee is possible.
- **Formative Test Tracking**: Automatically extracts question prompts, multiple-choice options, student selections, and post-submission correct answers & teacher feedback.
- **Local Staging**: Staged questions are saved privately in `chrome.storage.local` until you choose to commit them.

### 2. 🚀 Git-Like Push & Deduplication Repository
- **Collaborative Pushing**: Classmates can push their staged formative quiz attempts to a shared repository with a single click.
- **Smart SHA-256 Deduplication**: Identifies repeat questions across attempts and students. Automatically merges new answer choices, records confirmed correct keys, and tracks encounter frequency and error statistics.
- **Nested Course Folders**: Organize questions hierarchically (e.g., `Biology 101` ➔ `Unit 3: Genetics` ➔ `Formative Quiz 2`). Full folder CRUD with drag-and-drop / nesting support.

### 3. 🔑 Soft Login & Admin Consistency Guard
- **Frictionless Soft Login**: No tedious email verification links or OAuth setups. Enter a username and passcode to immediately start collaborating.
- **Role-Based Consistency (Admin)**: Designated admin users can moderate questions, edit answers, resolve conflict flags, and reorganize global folder trees.

### 4. 🎮 Aternos / Minecraft-Themed Study Suite
- **Blocky White & Blue Aesthetic**: Clean, high-contrast, tactile UI inspired by Aternos and Minecraft with 3D beveled buttons and crisp tabular layouts.
- **StudyStack Side-by-Side Table**: Dense two-column study view (Question vs. Answer/Explanation) with a one-click "Hide Answers" mode for self-testing.
- **Practice Test Engine**: Configurable mock quizzes with instant-feedback or exam mode, randomized choices, and live scoring.
- **Flashcard Deck**: 3D blocky flip cards with keyboard navigation (`[Space]` to flip, `[1]` for review, `[2]` for mastered).

---

## 📁 Repository Documentation

- **[System Architecture](SYSTEM_ARCHITECTURE.md)**: Comprehensive technical specification, Canvas anti-detection analysis, database schema, data flow sequences, and deduplication logic.
- **[Codex Implementation Guide](CODEX_INSTRUCTIONS.md)**: Turnkey prompt and instructions for Codex (or AI coding agents) to build the complete monorepo.
- **[Contributing Guide](CONTRIBUTING.md)**: Collaboration standards, Git branching model, and code style.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Chrome Extension** | Manifest V3, TypeScript, Vite, `chrome.storage.local` |
| **Web Application** | Next.js 16 (App Router), React, TypeScript |
| **Styling** | Tailwind CSS (Custom Aternos Design Tokens), `lucide-react` |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Authentication** | Soft-login (Stateless JWT / HttpOnly Cookie), RBAC |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20.9.0 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A PostgreSQL database with pooled and direct connection URLs

### 2. Setup the Web Application
```bash
# Navigate to web app directory
cd apps/web

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Apply the checked-in migration and seed the admin account
npx prisma migrate deploy
npx prisma db seed

# Run the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view Formatic Hub.
Set every value in `.env` before starting. `ADMIN_SECRET_KEY` must contain at least 16 characters and `JWT_SECRET` at least 32. The seed creates an `admin` account whose passcode is `ADMIN_SECRET_KEY`.
With the local hub running, run `npm run smoke` from `apps/web` to check nested folders, question pushes, deduplication, and admin merge aliases. This test creates temporary records and removes its test folders afterward.

### 3. Load the Chrome Extension
```bash
# Navigate to extension directory
cd apps/extension

# Install dependencies and build
npm install
npm run build
```
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `apps/extension/dist` folder.
4. Copy the extension ID from `chrome://extensions` into the hub's `EXTENSION_ID` environment variable and restart the hub.
5. Sign in to the hub, open the extension popup, and set its Hub URL. Open a permitted Canvas formative quiz page to stage questions, then use the popup to review and push them.

### Vercel deployment

Set the Vercel project root to `apps/web`. Configure `DATABASE_URL` with a pooled PostgreSQL URL, `DIRECT_URL` with a direct PostgreSQL URL, and the other variables from `apps/web/.env.example`. Apply migrations with `npx prisma migrate deploy` against the production database before using the app. The extension's popup URL must be set to the deployed HTTPS domain, and `EXTENSION_ID` must match the packed extension ID. The app uses an exact extension origin for credentialed CORS; wildcard origins are not valid with cookies.

---

## ⚖️ Academic Integrity & Ethical Disclaimer

Formatic is designed **strictly for formative assessments, open-book practice quizzes, and personal/collaborative study preparation**. It is **not** intended for use in high-stakes, summative, closed-book, or proctored examinations (such as Honorlock, Respondus Lockdown Browser, or Proctorio). Users are responsible for adhering to their educational institution's academic honor codes and Canvas usage guidelines.

---

## 📄 License

MIT License. Built for collaborative student learning.
