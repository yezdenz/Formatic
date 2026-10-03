# Contributing to Formatic 🤝

Thank you for contributing to **Formatic**! This project is built for collaborative student learning, allowing classmates to improve study tools, refine question parsers, and maintain data consistency.

---

## 🛠️ Development Workflow

### 1. Branching Strategy
- `main`: Production-ready, stable codebase.
- `develop`: Ongoing feature integration.
- Feature branches: `feat/<feature-name>` (e.g., `feat/fuzzy-matching`, `feat/flashcard-hotkeys`).
- Bugfix branches: `fix/<bug-name>` (e.g., `fix/canvas-mathjax-selector`).

### 2. Monorepo Organization
- `apps/extension`: Chrome browser extension (Manifest V3) for Canvas DOM parsing, local staging, and the push tray.
- `apps/web`: Next.js 16 website (App Router, Prisma, Tailwind, study suite, and API routes).
- `packages/shared-types`: Shared TypeScript data contracts and payloads.

---

## 🛡️ Guidelines for Extension Contributors

When modifying the Chrome Extension:
1. **Stealth Preservation is #1 Priority**:
   - Under no circumstances should you dispatch synthetic events (`dispatchEvent`) to native Canvas elements.
   - Do not call `.focus()` or `.blur()` on any elements in the Canvas tab.
   - Never inject modal alerts (`window.alert`, `window.confirm`) during quiz sessions.
2. **Selector Robustness**:
   - Canvas templates vary across institutions and course settings. Always use fallback selectors when scraping question text or choice labels.

---

## 🎨 Design System Guidelines (Aternos Aesthetic)

Formatic follows the blocky Minecraft / Aternos web console look:
- **Colors**:
  - Surface: `#FFFFFF`
  - Canvas: `#F3F6FA`
  - Primary Accent: `#2F80ED`
  - Bevel/Border: `#1B5EBE`
- **Buttons**: Must use tactile 3D bottom bevels (`box-shadow: 0 4px 0 #1b5ebe`).
- **Corners**: Keep border radii crisp (`0px` to `4px`). Avoid rounded pill shapes (`rounded-full`).

---

## 🧪 Testing Checklist Before Submitting a PR

- [ ] Extension builds without errors (`cd apps/extension && npm run build`).
- [ ] Next.js web application passes TypeScript typecheck (`cd apps/web && npm run build`).
- [ ] Prisma schema migrations are up to date (`npx prisma migrate dev`).
- [ ] Deduplication logic handles both identical questions and newly added choices.
- [ ] Soft-login registers new users seamlessly and persists session cookies.
