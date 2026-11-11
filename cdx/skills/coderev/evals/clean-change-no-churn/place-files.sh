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

cat > greet.go <<'X'
package shop

// Greeting returns the banner shown when a customer signs in.
func Greeting(name string) string {
	return "Hello, " + name
}
X
cat > greet_test.go <<'X'
package shop

import "testing"

func TestGreeting(t *testing.T) {
	if got := Greeting("Ada"); got != "Hello, Ada" {
		t.Fatalf("got %q", got)
	}
}
X
git add -A && git commit -qm "Add sign-in greeting"
git checkout -qb feature/farewell
cat >> greet.go <<'X'

// Farewell returns the banner shown when a customer signs out.
func Farewell(name string) string {
	return "Goodbye, " + name
}
X
cat >> greet_test.go <<'X'

func TestFarewell(t *testing.T) {
	if got := Farewell("Ada"); got != "Goodbye, Ada" {
		t.Fatalf("got %q", got)
	}
}
X
git add -A && git commit -qm "Add sign-out farewell"
