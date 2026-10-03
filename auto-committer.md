# Auto-Committer Protocol: Antigravity Git Directives (`auto-committer.md`)

> **Role**: Automated Git Commit Manager  
> **Target Environment**: GitHub Repositories  
> **Strict Operational Objective**: Whenever code or documentation is created, modified, or deleted, automatically inspect each changed file, isolate it, and execute **one individual Git commit per file** using high-precision, prefix-free, professional sentence-style messages.

---

## 1. Non-Negotiable Formatting Rules

### 1.1 Strict Prohibition of Tags and Prefixes
**NEVER** use Conventional Commit tags, bracketed prefixes, or category prefixes.  
Forbidden patterns include:
- ❌ `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `style:`
- ❌ `(Feat)`, `[ADD]`, `(add)`, `[FIX]`, `(Update)`, `[DOCS]`
- ❌ `feat(web):`, `fix(extension):`
- ❌ `added ...`, `updated ...`, `fixed ...` (lowercase informal starts)

### 1.2 Required Sentence Style (The Golden Pattern)
Commit messages must read as **authoritative, clear, sentence-style descriptions** beginning with an **active, capitalized verb**:

$$\text{Format:} \quad \mathbf{[Action Verb]} \quad \mathbf{[Technical Object / Component]} \quad \mathbf{[Specific Scope / Purpose]}$$

#### Approved Action Verbs:
- `Define` (architectures, schemas, types, specs)
- `Implement` (features, algorithms, components, functions)
- `Establish` (protocols, configurations, pipelines, standards)
- `Enforce` (rules, linters, encodings, security limits)
- `Detail` (documentation, architectural flows, benchmarks)
- `Configure` (toolchains, build configs, dependencies, environment)
- `Integrate` (APIs, third-party services, modules)
- `Refactor` (code structure, performance improvements, deduplication)
- `Resolve` (bug fixes, edge cases, error conditions)
- `Add` (tests, assets, utilities)
- `Remove` (deprecated logic, dead code, obsolete files)

#### Visual Reference Examples (from Git Log Standards):
- `Add unit tests for settled frame re-classification and graceful teardown`
- `Enforce consistent LF line endings and UTF-8 encoding across repository`
- `Define autonomous agent architecture and real-time perception pipeline`
- `Detail technical pipeline, sub-millisecond capture benchmarks, and safety limits`
- `Establish automated commit protocols and per-file sentence formatting standards`
- `Implement stealth Canvas DOM scraper without triggering window blur events`
- `Configure Next.js Tailwind design tokens for blocky blue and white aesthetic`

---

## 2. The Per-File Commit Isolation Law

> [!IMPORTANT]
> **Every single modified, added, or deleted file MUST receive its own independent Git commit.**  
> Under no circumstances may `git add .` or `git commit -a` be executed to bundle multiple files into one commit.

### Workflow Execution Loop:
For each file in `git status --porcelain`:
1. Stage **only** that specific file:  
   `git add "<relative_path>"`
2. Inspect the exact changes made to that file:  
   `git diff --cached "<relative_path>"`
3. Generate a distinct, context-rich commit message specifically describing what changed inside **that file alone**.
4. Commit that single file:  
   `git commit -m "<Commit Message>"`
5. Repeat for the next modified file until staging is completely clean.

---

## 3. Real Example Commit Mapping (Formatic Project)

When the initial documentation and architecture files are committed, they are committed individually as follows:

| Target File | Exact Git Command & Commit Message |
|---|---|
| `SYSTEM_ARCHITECTURE.md` | `git commit -m "Detail Canvas anti-cheat mechanics, database schema, and deduplication pipeline"` |
| `CODEX_INSTRUCTIONS.md` | `git commit -m "Define step-by-step implementation roadmap and engineering guidelines for Codex"` |
| `README.md` | `git commit -m "Document project overview, core study features, and local development setup"` |
| `CONTRIBUTING.md` | `git commit -m "Establish contribution workflow, branching model, and extension safety rules"` |
| `auto-committer.md` | `git commit -m "Establish automated commit protocols and per-file sentence formatting standards"` |

---

## 4. Execution Commands Checklist

Whenever the user asks to commit, push, or save changes:

### Step 1: Detect Changed Files
```powershell
git status --porcelain
```

### Step 2: Individual Staging and Committing (Per File)
```powershell
# Example File 1
git add "SYSTEM_ARCHITECTURE.md"
git commit -m "Detail Canvas anti-cheat mechanics, database schema, and deduplication pipeline"

# Example File 2
git add "CODEX_INSTRUCTIONS.md"
git commit -m "Define step-by-step implementation roadmap and engineering guidelines for Codex"

# Example File 3
git add "README.md"
git commit -m "Document project overview, core study features, and local development setup"

# Example File 4
git add "CONTRIBUTING.md"
git commit -m "Establish contribution workflow, branching model, and extension safety rules"

# Example File 5
git add "auto-committer.md"
git commit -m "Establish automated commit protocols and per-file sentence formatting standards"
```

### Step 3: Verify Clean Tree & Push
```powershell
git status
git push origin <branch-name>
```

---

## 5. Summary of Agent Commitments

1. **Zero Conventional Prefixes**: Never output `feat:`, `(Feat)`, `(add)`, `[ADD]`, etc.
2. **Individual Commits**: 1 changed file = 1 commit. No grouped commits.
3. **Professional Grammatical Precision**: Capitalized active verb followed by precise technical scope.
4. **Self-Executing**: When requested to commit, follow this protocol autonomously without deviations.
