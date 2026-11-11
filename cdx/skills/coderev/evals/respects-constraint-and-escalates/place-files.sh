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

cat > users.go <<'X'
package shop

import (
	"errors"
	"fmt"
)

// ErrNotFound is returned when no user matches.
var ErrNotFound = errors.New("user not found")

// User is a customer account.
type User struct {
	ID   int
	Name string
}

// Store looks users up by name. ok is false when no user matches.
type Store interface {
	Lookup(name string) (u User, ok bool, err error)
}

// GetUserByName returns the user with the given name.
func GetUserByName(s Store, name string) (User, error) {
	u, ok, err := s.Lookup(name)
	if err != nil {
		return User{}, fmt.Errorf("lookup %q: %w", name, err)
	}
	if !ok {
		return User{}, ErrNotFound
	}
	return u, nil
}
X
git add -A && git commit -qm "Add user lookup"
git checkout -qb feature/find-user
cat > users.go <<'X'
package shop

import "errors"

// ErrNotFound is returned when no user matches.
var ErrNotFound = errors.New("user not found")

// User is a customer account.
type User struct {
	ID   int
	Name string
}

// Store looks users up by name. ok is false when no user matches.
type Store interface {
	Lookup(name string) (u User, ok bool, err error)
}

// FindUser returns the user with the given name, or nil if there is none.
func FindUser(s Store, name string) *User {
	u, ok, err := s.Lookup(name)
	if err != nil || !ok {
		return nil
	}
	return &u
}

// GetUserByName returns the user with the given name.
//
// Deprecated: use FindUser.
func GetUserByName(s Store, name string) (User, error) {
	u := FindUser(s, name)
	if u == nil {
		return User{}, ErrNotFound
	}
	return *u, nil
}
X
git add -A && git commit -qm "Add FindUser and deprecate GetUserByName"
cat > users_test.go <<'X'
package shop

import "testing"

type mapStore map[string]User

func (m mapStore) Lookup(name string) (User, bool, error) {
	u, ok := m[name]
	return u, ok, nil
}

func TestFindUser(t *testing.T) {
	s := mapStore{"ada": {ID: 1, Name: "ada"}}
	if u := FindUser(s, "ada"); u == nil || u.ID != 1 {
		t.Fatalf("got %v", u)
	}
	if u := FindUser(s, "bob"); u != nil {
		t.Fatalf("want nil, got %v", u)
	}
}
X
