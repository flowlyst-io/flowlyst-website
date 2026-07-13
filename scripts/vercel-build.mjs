/**
 * Vercel build command (see `vercel.json` → `buildCommand`).
 *
 * Thin entrypoint: the orchestration lives in `run-build.mjs` as an exported,
 * dependency-injectable function so it can be unit-tested without shelling out.
 * Invoking this file is identical to calling `buildOnVercel()` with the real
 * process dependencies. Local `pnpm build` never runs this script.
 */
import { buildOnVercel } from './run-build.mjs'

buildOnVercel()
