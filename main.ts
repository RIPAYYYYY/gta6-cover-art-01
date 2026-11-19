// ViceFrame hand-in program (Node 22, standard library only).
//
// The app itself is the static site in app/ — plain files a desktop browser
// opens offline, no build step and no network request. This program hands
// the entry in: it copies app/ and screenshots/ from beside this file into
// the output directory and writes dossier.json there with buildDossier from
// the vendored make.fun library (vendor/makefun-app.ts, kept byte-identical
// to the kit's copy so the scorer rebuilds the same dossier).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To try the app itself: node serve.ts, then open the local address it prints.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the gate's own limits, so a hand-in this program
// writes is one the scorer can accept: the dossier text cap, at most four
// screenshots of at most 256 KiB each, and app/ within its file and byte
// budgets and path length limit.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
