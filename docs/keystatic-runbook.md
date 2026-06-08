# Keystatic CMS & Markdoc — Ops Runbook

This document covers how to use, configure, and troubleshoot Keystatic CMS and its Markdoc content collections in this repository, both locally and in a secure production deployment on Cloudflare.

---

## 1. Architecture Overview

Keystatic runs in two distinct modes depending on the environment:

| Environment | Mode | Storage Backend | Authentication |
|---|---|---|---|
| **Local Development** | `local` | Native Node.js File System (`fs`) | None (auto-allowed) |
| **Production (Cloudflare)** | `github` | GitHub API (commits/PRs to repo) | GitHub OAuth (via GitHub App) |

All content is authored in **Markdoc** format (`.mdoc` files), structured under `src/content/`.

---

## 2. Local Development Workflow

To author content locally:

1. **Start the dev server**:
   ```bash
   npm run dev
   ```
2. **Access the CMS**:
   Navigate to `http://localhost:4321/keystatic`.
3. **Edit and Save**:
   Creating or updating entries writes files directly to your workspace (e.g. `src/content/posts/my-post.mdoc`).
4. **Deploy**:
   Commit the generated `.mdoc` and asset files to your Git branch and push/merge to deploy.

---

## 3. Production Deployment Workflow (Secure Cloud Access)

To access the `/keystatic` admin panel on your live website, you must authenticate through a private **GitHub App** linked to your organization/repository.

### Step 1: Create the GitHub App
* Go to your **GitHub Settings** (or **Organization Settings** if your repo is in an organization) > **Developer settings** > **GitHub Apps** > **New GitHub App**.
* Configure the following settings:
  * **GitHub App name**: `SybilsEdge CMS` (or similar)
  * **Homepage URL**: `https://sybilsedge.com` (your production domain)
  * **Callback URL**: `https://sybilsedge.com/api/keystatic/github/oauth/callback`
  * **Webhooks**: Uncheck **Active**

### Step 2: Configure Permissions
Under **Repository permissions**, grant:
* **Contents**: **Read and write** (allows Keystatic to write files/commits to your repo)
* **Metadata**: **Read-only** (auto-selected)
* **Pull requests**: **Read and write** (allows creating drafts as PR branches)

### Step 3: Install the App
* Go to the **Install App** tab in your GitHub App settings.
* Click **Install** next to your account/organization.
* Choose **Only select repositories** and pick `ngnetworkpro/sybilsedge.com`.

### Step 4: Add Cloudflare Environment Variables
Add these encrypted secret environment variables in your Cloudflare dashboard under your worker/pages settings:

| Variable Name | Description | Value Type |
|---|---|---|
| `KEYSTATIC_GITHUB_CLIENT_ID` | Client ID from the GitHub App settings page | Encrypted / Secret |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | Client Secret generated in the GitHub App settings page | Encrypted / Secret |
| `KEYSTATIC_SECRET` | A random 32-character string used to encrypt cookie sessions | Encrypted / Secret |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | The slug of your GitHub App (e.g. `sybilsedge-cms`) | Plaintext / Variable |

---

## 4. Content Formatting & Schema Rules

To prevent build-time validation crashes (such as `InvalidContentEntryDataError`), the schemas are designed with the following safeguards:

### 1. Images
* **Keystatic Empty State**: When no image is uploaded in the CMS, Keystatic writes `image: {}` (an empty object) to the frontmatter.
* **Astro Validation**: In [src/content.config.ts](file:///c:/Users/sybil/git/sybilsedge/src/content.config.ts), we use the custom `optionalImage(image)` helper. This preprocesses any empty object `{}` and converts it to `undefined` before Astro validates it, allowing the schema check to pass.
* **Rendering**: In your components/pages, always check if `image?.src` is defined before rendering the image tag.

### 2. Optional Text Fields
* Text fields (e.g., `description`, `synopsis`, `tagline`, `summary`) are configured with `.default('')`. If left blank in the CMS, they default to an empty string instead of failing the build due to a missing frontmatter key.

### 3. Custom Markdoc Tags
When writing content in the Markdoc editor, you can insert rich interactive islands using custom tags:
* **Blueprint Gallery**:
  ```markdoc
  {% blueprintGallery items=$galleryItems label="Build Documentation" /%}
  ```

---

## 5. Troubleshooting Common Warnings

### `WARN: A component changed from uncontrolled to controlled.`
* **Cause**: React logs this warning in development because some Keystatic fields initialize with `undefined` values and become controlled once typed into.
* **Fix**: This is a harmless development warning and can be safely ignored.

### `An empty string ("") was passed to the href attribute.`
* **Cause**: React 19+ is strict about `href=""` attributes. Keystatic's internal `BreadcrumbItem` passes an empty string during certain routing states.
* **Fix**: This is a cosmetic warning in Keystatic's pre-compiled admin UI bundle and does not impact functionality.

### TypeScript error: `Property 'dataset' does not exist on type 'Element'`
* **Cause**: `document.querySelectorAll()` returns a generic list of `Element` elements, which don't natively define `dataset`.
* **Fix**: Cast query selectors to `HTMLElement` using generic parameters:
  ```typescript
  const buttons = document.querySelectorAll<HTMLElement>('.filter-btn');
  ```
