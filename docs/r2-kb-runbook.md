# R2 Knowledge-Base — Ops Runbook

This document covers how to author, upload, update, and retire documents in the
private `sybil-twin-kb` R2 bucket that feeds the SybilTwin digital-agent context.

> **Security note:** The bucket is private. There is no public URL, no signed
> public read access, and no client-side route that exposes its contents. Only the
> server-side Worker (`/api/agent`) reads from it via the `SYBIL_TWIN_KB` R2
> binding. Never commit raw knowledge-base files to this repository.

---

## 1. Bucket Details

| Property | Value |
|---|---|
| Bucket name | `sybil-twin-kb` |
| Access | Private (no public URL) |
| Wrangler binding | `SYBIL_TWIN_KB` |
| Region | Cloudflare's automatic placement |

---

## 2. Key Layout

```
kb/<slug>.md           # Personal notes, thinking documents, context essays
index/manifest.json    # Reserved — optional metadata index (future use)
```

Rules:
- All knowledge-base documents live under the `kb/` prefix.
- Only files ending in `.md` are loaded by the agent.
- Use lowercase, hyphenated slugs for consistency (e.g. `kb/cloud-architecture-philosophy.md`).
- Filenames become section headings in the system prompt: `how-i-think-about-systems.md` → **How I Think About Systems**.

---

## 3. Document Format

Each document should be a plain Markdown file. YAML front-matter is stripped before the content is included in the prompt, so add it for your own cataloguing purposes:

```markdown
---
title: How I Think About Systems
tags: [architecture, thinking, cloud]
date: 2026-04-18
---

Write in first person, as if speaking directly to someone asking about this topic.

I approach large distributed systems by first mapping trust boundaries...
```

**Writing tips:**
- Write in the first person — the agent speaks *as* Sybil.
- Be specific and concrete; vague prose produces vague answers.
- Keep each document to one coherent topic.
- Aim for 200–1 000 words per file. Very long files may be truncated (see budget below).

---

## 4. Token / Size Budget

The loader enforces these limits per prompt build:

| Limit | Value |
|---|---|
| Max files loaded | 20 |
| Max total characters | 12 000 (~3 000 tokens) |

Files are read in R2's default listing order (lexicographic by key). If the budget is
exhausted mid-file, that file is truncated. To prioritise certain documents, prefix
their slugs with a number: `kb/00-core-identity.md`, `kb/01-career-philosophy.md`, etc.

---

## 5. Creating the Bucket

Run once in your Cloudflare account:

```bash
npx wrangler r2 bucket create sybil-twin-kb
```

Verify:

```bash
npx wrangler r2 bucket list
```

---

## 6. Uploading / Updating Documents

Author markdown files locally outside the repository (e.g. `~/sybil-twin-kb/`).

**Upload a single file:**

```bash
npx wrangler r2 object put sybil-twin-kb/kb/cloud-architecture-philosophy.md \
  --file ~/sybil-twin-kb/cloud-architecture-philosophy.md \
  --content-type text/markdown
```

**Upload all files from a local folder:**

```bash
for f in ~/sybil-twin-kb/*.md; do
  slug=$(basename "$f")
  npx wrangler r2 object put "sybil-twin-kb/kb/$slug" \
    --file "$f" \
    --content-type text/markdown
done
```

**Overwrite an existing document** (same command — R2 replaces by key):

```bash
npx wrangler r2 object put sybil-twin-kb/kb/cloud-architecture-philosophy.md \
  --file ~/sybil-twin-kb/cloud-architecture-philosophy.md \
  --content-type text/markdown
```

---

## 7. Forcing a Cache Refresh

The system prompt (including KB context) is cached per Worker isolate. A new
deployment always starts a fresh isolate and picks up the latest bucket contents.

If you upload new documents and need the running Worker to refresh **without a
full redeploy**, upload a sentinel object that the loader ignores but forces a
new list result to be observed on the next cold start:

```bash
npx wrangler r2 object put sybil-twin-kb/index/version.txt \
  --body "$(date -u +%s)"
```

The next Worker cold start (or after the current isolate is evicted) will reload
all KB documents.

---

## 8. Listing and Inspecting Bucket Contents

**List all objects:**

```bash
npx wrangler r2 object list sybil-twin-kb
```

**Download a document to inspect it:**

```bash
npx wrangler r2 object get sybil-twin-kb/kb/cloud-architecture-philosophy.md \
  --file /tmp/inspect.md
cat /tmp/inspect.md
```

---

## 9. Deleting a Document

```bash
npx wrangler r2 object delete sybil-twin-kb/kb/cloud-architecture-philosophy.md
```

To remove all KB documents and start fresh:

```bash
# List all keys first, then delete each one
npx wrangler r2 object list sybil-twin-kb
```

---

## 10. Validating the Integration Locally

The R2 binding (`SYBIL_TWIN_KB`) is **not** declared in `wrangler.jsonc` (root config)
because Cloudflare's local dev proxy does not support R2 bindings without a real bucket.

To test locally with a real binding, use a `.dev.vars` file (already in `.gitignore`):

```ini
# .dev.vars — never commit
SYBIL_TWIN_KB=<not applicable for R2 — use preview deploy instead>
```

The recommended validation workflow:
1. Deploy to a Cloudflare preview environment.
2. Open `/agent` on the preview URL.
3. Ask: *"Tell me about how you approach cloud architecture"* — the answer should
   reflect content from your KB documents if they cover that topic.
4. Check Worker logs (`npx wrangler tail --env preview`) for:
   - `[r2-context] loaded N/M files — X chars` — confirms KB was read.
   - Any `[r2-context] bucket.get failed` lines — indicates a key or permission issue.

---

## 11. Security Checklist

- [ ] Bucket is private (confirmed via Cloudflare dashboard → R2 → bucket settings).
- [ ] No public access URL is configured.
- [ ] No CORS rules that allow browser-direct reads.
- [ ] No API route in this repository exposes bucket contents to clients.
- [ ] KB markdown files are stored outside this repository.
- [ ] `.gitignore` already covers `.dev.vars` — confirm no KB paths are tracked.
