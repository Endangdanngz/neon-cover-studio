// Neon Cover Studio — the hand-in program for gta6-cover-art-01 (Node 22, standard library only).
//
// The product itself is the static web app in app/: plain files, ES modules,
// no build step and no network calls, which a desktop browser opens straight
// from disk or any static server. This program is only the courier. It
// copies app/ and screenshots/ into the output directory and writes
// dossier.json there with buildDossier from the vendored make.fun library,
// which is the summary the grader and the judge read.
//
// Try the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The app ships exactly as it sits in the repository.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

// Screenshots ride along when the folder is present.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json). text_max_bytes
// shapes the dossier text; the rest refuse anything the scorer itself would
// refuse: at most 4 screenshots of at most 256 KiB each, at most 993 files
// and 48 MiB under app/, and no app/ path longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
