# CI/CD Setup Guide

This project uses **pnpm** as the package manager, not npm or yarn.

## Fixing CI/CD Errors

If you see errors like:

```
npm error The `npm ci` command can only install with an existing package-lock.json
```

This means your CI/CD configuration is trying to use `npm` instead of `pnpm`.

## Solution

### For GitHub Actions

Use the provided `.github/workflows/ci.yml` file, which:

- Installs pnpm
- Uses `pnpm install --frozen-lockfile` instead of `npm ci`

### For Other CI Systems

Replace any npm/yarn commands with pnpm:

**Instead of:**

```bash
npm install
npm ci
yarn install
yarn install --frozen-lockfile
```

**Use:**

```bash
# Install pnpm first
npm install -g pnpm

# Then install dependencies
pnpm install --frozen-lockfile
```

### Example CI Script

```bash
# Install pnpm
npm install -g pnpm@10.22.0

# Install dependencies
pnpm install --frozen-lockfile

# Run scripts
pnpm lint
pnpm exec tsc --noEmit
```

## Package Manager Field

The `package.json` includes a `packageManager` field that specifies pnpm:

```json
"packageManager": "pnpm@10.22.0"
```

This helps tools automatically detect which package manager to use.
