#!/usr/bin/env bash
# Builds the fixture git repo in the current directory.
set -eu
git init -q -b main
git config user.name "Test Dev"; git config user.email "dev@example.com"
cat > go.mod <<'EOF'
module shop

go 1.22
EOF
cat > CLAUDE.md <<'EOF'
# shop

Small Go library. Run `go test ./...` before committing.
Use the helpers in `internal/mathx` rather than re-implementing numeric utilities.
EOF

mkdir -p internal/mathx
cat > internal/mathx/clamp.go <<'X'
package mathx

// Clamp returns v limited to the range [lo, hi].
func Clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
X
cat > items.go <<'X'
package shop

// Item is a product in the catalogue.
type Item struct {
	ID   int
	Name string
}
X
git add -A && git commit -qm "Initial catalogue types"
git checkout -qb feature/pagination
cat > paginate.go <<'X'
package shop

// Page returns the items on page p (1-based) for the given page size,
// along with the total number of pages.
func Page(items []Item, p, size int) ([]Item, int) {
	if size <= 0 {
		size = 10
	}
	total := len(items) / size
	p = clampInt(p, 1, total)
	start := (p - 1) * size
	end := start + size
	if end > len(items) {
		end = len(items)
	}
	return items[start:end], total
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
X
cat > paginate_test.go <<'X'
package shop

import "testing"

func TestPage(t *testing.T) {
	items := make([]Item, 20)
	got, total := Page(items, 2, 10)
	if len(got) != 10 || total != 2 {
		t.Fatalf("got %d items, %d pages", len(got), total)
	}
}
X
git add -A && git commit -qm "Add pagination for product listing"
