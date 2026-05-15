# Rackitect README Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a polished public GitHub README for Rackitect plus a short local development quick-start file.

**Architecture:** Documentation-only change. `README.md` presents the project, features, live demo, screenshots placeholder, tech stack, and links to the quick local setup file. `DEVELOPMENT.md` contains only the commands needed to run the app locally.

**Tech Stack:** Markdown, React, Vite, npm.

---

### Task 1: Create public README

**Files:**
- Create: `README.md`

**Step 1: Write README content**

Include:
- Title: `Rackitect`
- Tagline for visual rack planning
- Overview paragraph
- Feature list
- Live demo link: `https://lucacri.github.io/Rackitect/`
- Screenshots placeholder
- Tech stack
- Link to `DEVELOPMENT.md`
- Project status

**Step 2: Review rendered Markdown basics**

Run:

```bash
sed -n '1,220p' README.md
```

Expected: README is readable, no broken relative link to `DEVELOPMENT.md`, no old `RackBluePrint` branding.

**Step 3: Commit README**

```bash
git add README.md
git commit -m "docs: add project README"
```

### Task 2: Create local development quick-start

**Files:**
- Create: `DEVELOPMENT.md`

**Step 1: Write quick-start content**

Include:
- Clone URL: `https://github.com/lucacri/Rackitect.git`
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- Note that the app is Vite-powered and runs locally at the URL printed by Vite.

**Step 2: Review rendered Markdown basics**

Run:

```bash
sed -n '1,180p' DEVELOPMENT.md
```

Expected: concise setup instructions only, no deep contribution guide.

**Step 3: Commit quick-start**

```bash
git add DEVELOPMENT.md
git commit -m "docs: add local development quickstart"
```

### Task 3: Verify docs and build

**Files:**
- Read: `README.md`
- Read: `DEVELOPMENT.md`

**Step 1: Check git diff/status**

Run:

```bash
git status --short
```

Expected: clean working tree after commits.

**Step 2: Verify build still works**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.
