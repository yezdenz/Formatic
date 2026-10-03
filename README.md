# Formatic 📘⚡

> **Collaborative Canvas LMS Formative Test Saver, Question Deduplication Engine & Study Suite**

Formatic is a website and Chrome extension for saving and studying questions from permitted formative Canvas quizzes. Students sign in, enter a shared class code such as `TS31`, and see that class's folders on a simple dashboard.

---

## 🌟 Key Features

### 1. 🛡️ Stealth Canvas Saver (Chrome Extension MV3)
- **Passive capture**: Reads rendered quiz DOM with a content script and stores drafts in extension storage. It does not dispatch input events or call focus methods. Behavior in a particular Canvas or proctoring setup must be tested; no detection guarantee is possible.
- **Formative Test Tracking**: Automatically extracts question prompts, multiple-choice options, student selections, and post-submission correct answers & teacher feedback.
- **Local Staging**: Staged questions are saved privately in `chrome.storage.local` until you choose to commit them.

### 2. 🚀 Git-Like Push & Deduplication Repository
- **Collaborative Pushing**: Classmates can push their staged formative quiz attempts to a shared repository with a single click.
- **Smart SHA-256 Deduplication**: Identifies repeat questions across attempts and students. Automatically merges new answer choices, records confirmed correct keys, and tracks encounter frequency and error statistics.
- **Courses and Folders**: Create courses at the top level, then add and rename folders inside them (e.g., `Biology 101` ➔ `Unit 3: Genetics` ➔ `Formative Quiz 2`).

### 3. 🔑 Soft Login & Repository Moderation
- **Frictionless Soft Login**: No tedious email verification links or OAuth setups. Enter a username and passcode to immediately start collaborating.
- **Admin and Mod ranks**: Admins can assign or remove Mod rank for registered members of their team. Admins and Mods can edit or delete team questions, resolve answer conflicts, merge duplicates, and manage team folders.
- **Push rollback**: Admins and Mods can roll back a whole push when every question was newly created and has not been changed or used by a later push. Mixed pushes need individual question review so earlier work is not erased.
- **Moderation history**: Question deletions and push rollbacks keep audit snapshots for recovery.

### 4. 🎮 Study Suite
- **Class Repository**: A greeting, unique class code, and searchable folder list in a clean workspace inspired by Quest Log's navigation and panels.
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
| **Styling** | Tailwind CSS and custom CSS |
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

# Apply the checked-in migrations and optionally seed the admin account
npm run db:deploy
npx prisma db seed

# Run the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view Formatic Hub.
The interactive preview at [http://localhost:3000/demo](http://localhost:3000/demo) starts with blank sign-in fields, no team code, and no folders. It runs only in the current browser tab; real sign-in and shared folders require a PostgreSQL connection.
Set every value in `.env` before starting. `ADMIN_SECRET_KEY` must contain at least 16 characters and `JWT_SECRET` at least 32. The optional seed creates only an `admin` account whose passcode is `ADMIN_SECRET_KEY`; the team code and courses start empty. You can also create an admin account through the sign-in page by using the admin passcode.
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

See [Deployment guide](DEPLOYMENT.md) for the Vercel project settings, Prisma Postgres database connection, environment variables, and migration flow. The Vercel build applies the checked-in migrations before building the website. The extension needs the deployed HTTPS domain in its popup settings and its actual ID in the website's `EXTENSION_ID` variable.

---

## ⚖️ Academic Integrity & Ethical Disclaimer

Formatic is designed **strictly for formative assessments, open-book practice quizzes, and personal/collaborative study preparation**. It is **not** intended for use in high-stakes, summative, closed-book, or proctored examinations (such as Honorlock, Respondus Lockdown Browser, or Proctorio). Users are responsible for adhering to their educational institution's academic honor codes and Canvas usage guidelines.

---

## 📄 License

MIT License. Built for collaborative student learning.
