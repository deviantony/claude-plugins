#!/usr/bin/env bun
// Inline the bundled fonts and vendor scripts into a sketch-diagram HTML file.
//
//   bun build.ts <diagram.html> [-o out.html]
//
// Replaces three placeholders, each of which must appear exactly once:
//   __FONTS__      @font-face rules (base64 woff2) for every file in assets/fonts/
//   __ROUGH__      assets/vendor/rough.js
//   __SKETCHIFY__  assets/vendor/sketchify.js
// Without -o the input file is rewritten in place. Zero dependencies.

import { readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ASSETS = join(import.meta.dir, "..", "assets");
const USAGE = "usage: bun build.ts <diagram.html> [-o out.html]";

function die(msg: string): never {
  console.error(`build: ${msg}`);
  process.exit(1);
}

function parseArgs(argv: string[]): { input: string; output: string } {
  let input: string | undefined;
  let output: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--output") {
      output = argv[++i];
      if (!output) die(`${a} needs a path\n${USAGE}`);
    } else if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (a.startsWith("-")) {
      die(`unknown option ${a}\n${USAGE}`);
    } else if (input) {
      die(`unexpected argument ${a}\n${USAGE}`);
    } else {
      input = a;
    }
  }
  if (!input) die(USAGE);
  return { input: resolve(input), output: resolve(output ?? input) };
}

async function fontFaces(): Promise<string> {
  const dir = join(ASSETS, "fonts");
  const files = readdirSync(dir).filter((f) => f.endsWith(".woff2")).sort();
  if (files.length === 0) die(`no .woff2 files in ${dir}`);
  const rules: string[] = [];
  for (const f of files) {
    const m = /^(.+)-(\d{3})\.woff2$/.exec(f);
    if (!m) die(`font file ${f} is not named <Family>-<weight>.woff2`);
    const [, family, weight] = m;
    const b64 = Buffer.from(await Bun.file(join(dir, f)).arrayBuffer()).toString("base64");
    rules.push(
      `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;` +
        `src:url(data:font/woff2;base64,${b64}) format('woff2');}`,
    );
  }
  return rules.join("\n");
}

async function vendor(name: string): Promise<string> {
  const src = await Bun.file(join(ASSETS, "vendor", name)).text();
  // A literal "</script" inside the inlined code would end the <script> element early.
  if (/<\/script/i.test(src)) die(`${name} contains "</script" and cannot be inlined`);
  return src;
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const { input, output } = parseArgs(process.argv.slice(2));
const file = Bun.file(input);
if (!(await file.exists())) die(`${input} not found`);
let html = await file.text();

const slots: Record<string, () => Promise<string>> = {
  __FONTS__: fontFaces,
  __ROUGH__: () => vendor("rough.js"),
  __SKETCHIFY__: () => vendor("sketchify.js"),
};

// Check every placeholder before touching anything, so a bad file is reported in full.
const problems = Object.keys(slots)
  .map((k) => [k, count(html, k)] as const)
  .filter(([, n]) => n !== 1)
  .map(([k, n]) =>
    n === 0 ? `${k} is missing (already built? start again from the unbuilt source)` : `${k} appears ${n} times`,
  );
if (problems.length) die(`${basename(input)}: ${problems.join("; ")}`);

for (const [key, load] of Object.entries(slots)) {
  // split/join rather than String.replace: vendor code contains "$&"-style sequences.
  html = html.split(key).join(await load());
}

await Bun.write(output, html);
console.log(`build: wrote ${output} (${(html.length / 1024).toFixed(0)} KB)`);
