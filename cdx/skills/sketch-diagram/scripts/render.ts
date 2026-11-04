#!/usr/bin/env bun
// Freeze the CSS animations of a sketch-diagram HTML file frame by frame and
// encode a seamlessly looping GIF.
//
//   bun render.ts <in.html> <out.gif> [--fps 25] [--loop 3000] [--scale 2] [--preview N]
//
// --loop must match the --loop custom property in the HTML (milliseconds).
// --preview N writes N PNG frames spread across the loop next to the output
// (<out>-preview-K.png) and skips the GIF. Every run also prints advisory
// "note:" lines for dot speeds outside 80-150px/s and overlapping text.
//
// Talks to a headless Chrome over the DevTools protocol with bun's built-in
// WebSocket. Needs ffmpeg on PATH for the GIF. Zero npm dependencies.
// Chrome lookup: $CHROME_PATH, then Playwright's headless shell cache, then
// chromium / chromium-browser / google-chrome on PATH.

import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE =
  "usage: bun render.ts <in.html> <out.gif> [--fps 25] [--loop 3000] [--scale 2] [--preview N]";
const CALL_TIMEOUT_MS = 30_000;
const LAUNCH_TIMEOUT_MS = 20_000;

class Fatal extends Error {}
const fail = (msg: string): never => {
  throw new Fatal(msg);
};

// ---------- arguments ----------

type Opts = { input: string; output: string; fps: number; loop: number; scale: number; preview: number };

function parseArgs(argv: string[]): Opts {
  const pos: string[] = [];
  const num: Record<string, number> = { fps: 25, loop: 3000, scale: 2, preview: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (!(key in num)) fail(`unknown option ${a}\n${USAGE}`);
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) fail(`${a} needs a positive number`);
      num[key] = v;
    } else pos.push(a);
  }
  if (pos.length !== 2) fail(USAGE);
  if (!Number.isInteger(num.preview)) fail("--preview needs a whole number");
  return {
    input: resolve(pos[0]),
    output: resolve(pos[1]),
    fps: num.fps,
    loop: num.loop,
    scale: num.scale,
    preview: num.preview,
  };
}

// ---------- chrome discovery ----------

function newestHeadlessShell(cacheDir: string): string | undefined {
  if (!existsSync(cacheDir)) return;
  const builds = readdirSync(cacheDir)
    .map((d) => /^chromium_headless_shell-(\d+)$/.exec(d))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  for (const m of builds) {
    const root = join(cacheDir, m[0]);
    // chrome-headless-shell-linux64, -mac-arm64, -mac-x64, ...
    for (const sub of readdirSync(root).filter((d) => d.startsWith("chrome-headless-shell-"))) {
      const bin = join(root, sub, "chrome-headless-shell");
      if (existsSync(bin)) return bin;
    }
  }
}

function findChrome(): string {
  const env = process.env.CHROME_PATH;
  if (env) {
    if (!existsSync(env)) fail(`CHROME_PATH=${env} does not exist`);
    return env;
  }
  const home = homedir();
  const hit =
    newestHeadlessShell(join(home, ".cache", "ms-playwright")) ??
    newestHeadlessShell(join(home, "Library", "Caches", "ms-playwright")) ??
    ["chromium", "chromium-browser", "google-chrome"].map((n) => Bun.which(n)).find(Boolean);
  if (hit) return hit;
  return fail(
    "no headless Chrome found. Either set CHROME_PATH to a Chrome/Chromium binary, or install\n" +
      "Playwright's headless shell with: bunx playwright install chromium-headless-shell",
  );
}

// ---------- minimal CDP client ----------

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void; method: string; timer: Timer };

class Cdp {
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private listeners: Array<{ method: string; sessionId?: string; fn: (p: any) => void }> = [];

  private constructor(private ws: WebSocket) {
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
        else p.resolve(msg.result);
      } else {
        for (const l of this.listeners)
          if (l.method === msg.method && l.sessionId === msg.sessionId) l.fn(msg.params);
      }
    };
    ws.onclose = () => {
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error(`${p.method}: DevTools connection closed`));
      }
      this.pending.clear();
    };
  }

  static connect(url: string): Promise<Cdp> {
    return new Promise((res, rej) => {
      const ws = new WebSocket(url);
      ws.onopen = () => res(new Cdp(ws));
      ws.onerror = () => rej(new Error(`cannot connect to DevTools at ${url}`));
    });
  }

  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method}: no reply after ${CALL_TIMEOUT_MS / 1000}s`));
      }, CALL_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, method, timer });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  once(method: string, sessionId?: string): Promise<any> {
    return new Promise((resolve) => {
      const l = {
        method,
        sessionId,
        fn: (p: any) => {
          this.listeners = this.listeners.filter((x) => x !== l);
          resolve(p);
        },
      };
      this.listeners.push(l);
    });
  }

  close() {
    this.ws.close();
  }
}

// ---------- browser lifecycle ----------

async function waitForDevTools(stderr: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stderr.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let timer: Timer | undefined;
  const timeout = new Promise<{ value: undefined; done: true }>((r) => {
    timer = setTimeout(() => r({ value: undefined, done: true }), LAUNCH_TIMEOUT_MS);
  });
  while (true) {
    const { value, done } = await Promise.race([reader.read(), timeout]);
    if (done) break;
    if (value) buf += decoder.decode(value, { stream: true });
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
    if (m) {
      clearTimeout(timer);
      // Keep draining stderr so Chrome never blocks on a full pipe.
      (async () => {
        try {
          while (!(await reader.read()).done);
        } catch {}
      })();
      return m[1];
    }
  }
  clearTimeout(timer);
  return fail(`Chrome did not start a DevTools endpoint. Its output:\n${buf.trim() || "(none)"}`);
}

// Runtime.evaluate with the page result unwrapped and exceptions surfaced.
async function evaluate(cdp: Cdp, sessionId: string, expression: string): Promise<any> {
  const r = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    fail(`page script failed: ${d.exception?.description ?? d.text}`);
  }
  return r.result.value;
}

// ---------- main ----------

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!existsSync(o.input)) fail(`${o.input} not found`);

  const exact = (o.loop / 1000) * o.fps;
  const frames = Math.round(exact);
  if (frames < 1) fail(`--loop ${o.loop} at --fps ${o.fps} gives no frames`);
  if (Math.abs(exact - frames) > 1e-9)
    console.warn(
      `warn: ${o.loop}ms x ${o.fps}fps = ${exact.toFixed(2)} frames, rounded to ${frames}; the loop will not be exact`,
    );

  const ffmpeg = o.preview ? null : Bun.which("ffmpeg");
  if (!o.preview && !ffmpeg) fail("ffmpeg not found on PATH (needed to encode the GIF)");

  const chrome = findChrome();
  const profile = mkdtempSync(join(tmpdir(), "sketch-chrome-"));
  const framesDir = mkdtempSync(join(tmpdir(), "sketch-frames-"));
  let proc: ReturnType<typeof Bun.spawn> | undefined;
  let cdp: Cdp | undefined;

  const cleanup = async () => {
    try {
      cdp?.close();
    } catch {}
    if (proc && proc.exitCode === null) {
      proc.kill("SIGKILL");
      await proc.exited;
    }
    rmSync(profile, { recursive: true, force: true });
    rmSync(framesDir, { recursive: true, force: true });
  };
  const onSignal = () => cleanup().finally(() => process.exit(130));
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    proc = Bun.spawn(
      [
        chrome,
        "--headless",
        "--remote-debugging-port=0",
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        "--mute-audio",
        "about:blank",
      ],
      { stdin: "ignore", stdout: "ignore", stderr: "pipe" },
    );
    cdp = await Cdp.connect(await waitForDevTools(proc.stderr as ReadableStream<Uint8Array>));

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    const loaded = cdp.once("Page.loadEventFired", sessionId);
    const nav = await cdp.send("Page.navigate", { url: pathToFileURL(o.input).href }, sessionId);
    if (nav.errorText) fail(`cannot open ${o.input}: ${nav.errorText}`);
    await loaded;
    await evaluate(cdp, sessionId, "document.fonts.ready.then(() => true)");

    const box = await evaluate(
      cdp,
      sessionId,
      `(() => { const el = document.querySelector('.canvas') || document.body;
                const r = el.getBoundingClientRect();
                return { w: Math.ceil(r.width), h: Math.ceil(r.height), canvas: el !== document.body }; })()`,
    );
    if (!box.canvas) console.warn("warn: no .canvas element; measuring <body> instead");
    if (!box.w || !box.h) fail(`measured an empty canvas (${box.w}x${box.h})`);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: box.w, height: box.h, deviceScaleFactor: o.scale, mobile: false },
      sessionId,
    );

    // Pause everything and report animations that would break the seamless loop.
    const audit: { count: number; bad: string[]; css: string } = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const loop = ${o.loop};
        const anims = document.getAnimations();
        anims.forEach(a => a.pause());
        const bad = [];
        for (const a of anims) {
          const t = a.effect && a.effect.getComputedTiming();
          if (!t) continue;
          const name = a.animationName || a.id || 'animation';
          const el = a.effect.target;
          const where = el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
            (el.getAttribute('class') ? '.' + el.getAttribute('class').trim().split(/\\s+/).join('.') : '') : '?';
          const d = Number(t.duration);
          const k = loop / d;
          if (!(d > 0) || Math.abs(k - Math.round(k)) > 1e-6)
            bad.push(name + ' on ' + where + ': duration ' + d + 'ms does not divide ' + loop + 'ms');
          else if (t.iterations !== Infinity)
            bad.push(name + ' on ' + where + ': not infinite');
        }
        const css = getComputedStyle(document.documentElement).getPropertyValue('--loop').trim();
        return { count: anims.length, bad: [...new Set(bad)], css };
      })()`,
    );
    const cssLoop = /^([\d.]+)(ms|s)$/.exec(audit.css ?? "");
    if (cssLoop) {
      const ms = Number(cssLoop[1]) * (cssLoop[2] === "s" ? 1000 : 1);
      if (ms !== o.loop) console.warn(`warn: the page sets --loop: ${audit.css} but this render uses --loop ${o.loop}`);
    }
    if (audit.count === 0) console.warn("warn: the page has no CSS animations; every frame will be identical");
    for (const b of audit.bad) console.warn(`warn: ${b} (the GIF loop will jump)`);

    // Layout notes: dot speeds outside the style's 80–150px/s target, and text labels
    // that overlap each other. Advisory only; the author decides.
    const notes: string[] = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const out = [];
        const ns = 'http://www.w3.org/2000/svg';
        const probe = document.createElementNS(ns, 'path');
        for (const a of document.getAnimations()) {
          if (a.animationName !== 'travel') continue;
          const el = a.effect.target;
          const m = /path\\(["'](.+?)["']\\)/.exec(getComputedStyle(el).offsetPath || '');
          if (!m) continue;
          probe.setAttribute('d', m[1]);
          const len = probe.getTotalLength();
          const dur = Number(a.effect.getComputedTiming().duration) / 1000;
          const v = len / dur;
          if (v < 80 || v > 150)
            out.push('dot on path ' + m[1].slice(0, 40) + (m[1].length > 40 ? '...' : '') +
              ': ' + Math.round(len) + 'px in ' + dur + 's = ' + Math.round(v) + 'px/s (target 80-150)');
        }
        const texts = [...document.querySelectorAll('svg text')]
          .map(t => {
            // Text boxes include ascender/descender room; trim a quarter of the height
            // top and bottom so labels that merely sit close are not reported.
            const b = t.getBoundingClientRect(), pad = b.height / 4;
            return { s: t.textContent.trim(), r: { left: b.left, right: b.right, top: b.top + pad, bottom: b.bottom - pad } };
          })
          .filter(t => t.s && t.r.right > t.r.left);
        for (let i = 0; i < texts.length; i++)
          for (let j = i + 1; j < texts.length; j++) {
            const a = texts[i].r, b = texts[j].r;
            const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (w > 2 && h > 1)
              out.push('text "' + texts[i].s.slice(0, 30) + '" overlaps "' + texts[j].s.slice(0, 30) + '"');
          }
        return out;
      })()`,
    );
    for (const n of notes) console.log(`note: ${n}`);

    // Preview samples are spaced loop/(N+0.5) apart rather than loop/N, so a dot whose
    // period is loop/2, loop/3 or loop/4 lands in a different spot in every sample.
    const sample = (n: number) =>
      [...new Set(Array.from({ length: n }, (_, k) => Math.round((k * frames) / (n + 0.5)) % frames))];
    const wanted = o.preview ? sample(Math.min(o.preview, frames)) : Array.from({ length: frames }, (_, i) => i);

    const pad = String(frames - 1).length;
    const shots: string[] = [];
    for (const [n, i] of wanted.entries()) {
      const t = (i * 1000) / o.fps;
      // Seek, then wait two animation frames so style and layout reflect the new time.
      await evaluate(
        cdp,
        sessionId,
        `new Promise(r => { document.getAnimations().forEach(a => { a.currentTime = ${t}; });
                            requestAnimationFrame(() => requestAnimationFrame(() => r(true))); })`,
      );
      const { data } = await cdp.send(
        "Page.captureScreenshot",
        { format: "png", fromSurface: true, captureBeyondViewport: false },
        sessionId,
      );
      const file = join(framesDir, `f${String(i).padStart(pad, "0")}.png`);
      await Bun.write(file, Buffer.from(data, "base64"));
      shots.push(file);
      if (process.stdout.isTTY) process.stdout.write(`\rframe ${n + 1}/${wanted.length}`);
    }
    if (process.stdout.isTTY) process.stdout.write("\n");

    const px = `${Math.round(box.w * o.scale)}x${Math.round(box.h * o.scale)}`;
    if (o.preview) {
      const stem = join(dirname(o.output), basename(o.output, extname(o.output)));
      const outs: string[] = [];
      for (const [k, f] of shots.entries()) {
        const dest = `${stem}-preview-${k + 1}.png`;
        await Bun.write(dest, Bun.file(f));
        outs.push(dest);
      }
      console.log(`preview: ${outs.length} frames at ${px} (frame ${wanted.join(", ")} of ${frames})`);
      for (const f of outs) console.log(`  ${f}`);
      return;
    }

    const enc = Bun.spawn(
      [
        ffmpeg!,
        "-v", "error",
        "-y",
        "-framerate", String(o.fps),
        "-i", join(framesDir, `f%0${pad}d.png`),
        "-vf", "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a",
        "-loop", "0",
        o.output,
      ],
      { stdin: "ignore", stdout: "inherit", stderr: "inherit" },
    );
    if ((await enc.exited) !== 0) fail(`ffmpeg exited with code ${enc.exitCode}`);
    const kb = (statSync(o.output).size / 1024).toFixed(0);
    console.log(`gif: ${o.output}\n  ${px}, ${frames} frames @ ${o.fps}fps (${o.loop}ms loop), ${kb} KB`);
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await cleanup();
  }
}

main().catch((e) => {
  console.error(`render: ${e instanceof Fatal ? e.message : (e?.stack ?? e)}`);
  process.exit(1);
});
