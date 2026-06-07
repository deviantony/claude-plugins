#!/usr/bin/env python3
"""Append the review annotation layer to an existing HTML report.

Non-destructive: writes a sibling copy (default `<name>.annotated.html`) and
leaves the original untouched. Idempotent: refuses a file that already carries
the layer. The layer inherits the report's own :root design tokens, so it
themes itself to whatever house style the report uses.

Usage:
    python annotate.py REPORT.html [OUTPUT.html]
"""

import sys
from pathlib import Path

LAYER = Path(__file__).resolve().parent.parent / "assets" / "review-layer.html"
MARKER = 'id="mcp-annotations"'


def fail(msg: str) -> "NoReturn":
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def main(argv: list[str]) -> None:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if argv else 1)

    src = Path(argv[0])
    if not src.is_file():
        fail(f"input not found: {src}")

    # Default: sibling `<stem>.annotated.html`. Build it from the stem by hand —
    # Path.with_suffix(".html") on "name.annotated" would treat ".annotated" as
    # the suffix and collapse the output path back onto the input, overwriting it.
    out = Path(argv[1]) if len(argv) > 1 else src.with_name(src.stem + ".annotated.html")

    if out.resolve() == src.resolve():
        fail("output path equals input path — refusing to overwrite the original")

    html = src.read_text(encoding="utf-8")

    if MARKER in html:
        fail(f"{src.name} already carries the review layer — refusing to double-inject")

    # The layer mounts onto `.page` and reads the report's :root tokens. Warn
    # (don't block) if neither is present — it'll still run, just unstyled.
    if "--accent" not in html:
        print("warning: no '--accent' token found; this may not be a house-style "
              "report. The layer will run but may not match the palette.", file=sys.stderr)
    if 'class="page"' not in html and "class='page'" not in html:
        print("warning: no element with class 'page' found; the layer self-disables "
              "on documents without it and nothing will be annotatable.", file=sys.stderr)

    idx = html.rfind("</body>")
    if idx == -1:
        fail("no </body> tag found; cannot determine where to inject the layer")

    layer = LAYER.read_text(encoding="utf-8").rstrip() + "\n\n"
    annotated = html[:idx] + layer + html[idx:]
    out.write_text(annotated, encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main(sys.argv[1:])
