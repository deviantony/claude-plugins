#!/usr/bin/env bash
# Builds the fixture git repo in the current directory.
set -eu
git init -q -b main
git config user.name "Test Dev"; git config user.email "dev@example.com"
cat > go.mod <<'X'
module svc

go 1.22
X
cat > CLAUDE.md <<'X'
# svc

Small Go service. Run `go test ./...` before committing.
Every setting is read from the environment in `config.go` and passed to its component in `server.go`.
X
mkdir -p cache
cat > cache/cache.go <<'X'
package cache

import (
	"sync"
	"time"
)

// Options configures a Cache.
type Options struct {
	TTL time.Duration
}

type entry struct {
	val     string
	expires time.Time
}

// Cache is a concurrency-safe string cache with expiry.
type Cache struct {
	mu    sync.Mutex
	opts  Options
	items map[string]entry
}

// New returns an empty cache.
func New(opts Options) *Cache {
	return &Cache{opts: opts, items: map[string]entry{}}
}

// Set stores val under key.
func (c *Cache) Set(key, val string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = entry{val: val, expires: time.Now().Add(c.opts.TTL)}
}

// Get returns the value for key if present and not expired.
func (c *Cache) Get(key string) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.items[key]
	if !ok || time.Now().After(e.expires) {
		return "", false
	}
	return e.val, true
}
X
cat > cache/cache_test.go <<'X'
package cache

import (
	"testing"
	"time"
)

func TestSetGet(t *testing.T) {
	c := New(Options{TTL: time.Minute})
	c.Set("a", "1")
	if v, ok := c.Get("a"); !ok || v != "1" {
		t.Fatalf("got %q %v", v, ok)
	}
}
X
cat > config.go <<'X'
package main

import (
	"os"
	"time"
)

// Config holds the service settings.
type Config struct {
	CacheTTL time.Duration
}

// LoadConfig reads settings from the environment.
func LoadConfig() Config {
	cfg := Config{CacheTTL: 5 * time.Minute}
	if v, err := time.ParseDuration(os.Getenv("CACHE_TTL")); err == nil {
		cfg.CacheTTL = v
	}
	return cfg
}
X
cat > server.go <<'X'
package main

import (
	"fmt"

	"svc/cache"
)

func newCache(cfg Config) *cache.Cache {
	return cache.New(cache.Options{TTL: cfg.CacheTTL})
}

func main() {
	c := newCache(LoadConfig())
	c.Set("boot", "ok")
	fmt.Println("ready")
}
X
git add -A && git commit -qm "Add service with TTL cache"
git checkout -qb feature/cache-max-entries
python3 - <<'P'
import re
p="cache/cache.go"; s=open(p).read()
s=s.replace("\tTTL time.Duration\n}", "\tTTL time.Duration\n\t// MaxEntries bounds the number of entries. 0 means unlimited.\n\tMaxEntries int\n}")
s=s.replace("""	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = entry""", """	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.items[key]; !exists && len(c.items) >= c.opts.MaxEntries {
		c.evictOne()
	}
	c.items[key] = entry""")
s+='''
// evictOne removes the entry closest to expiry.
func (c *Cache) evictOne() {
	var oldest string
	var at time.Time
	for k, e := range c.items {
		if oldest == "" || e.expires.Before(at) {
			oldest, at = k, e.expires
		}
	}
	delete(c.items, oldest)
}

// Len returns the number of stored entries.
func (c *Cache) Len() int {
	return len(c.items)
}
'''
open(p,"w").write(s)
p="config.go"; s=open(p).read()
s=s.replace('import (\n\t"os"\n', 'import (\n\t"os"\n\t"strconv"\n')
s=s.replace("\tCacheTTL time.Duration\n}", "\tCacheTTL        time.Duration\n\tCacheMaxEntries int\n}")
s=s.replace("\treturn cfg\n", '\tif n, err := strconv.Atoi(os.Getenv("CACHE_MAX_ENTRIES")); err == nil {\n\t\tcfg.CacheMaxEntries = n\n\t}\n\treturn cfg\n')
open(p,"w").write(s)
P
cat >> cache/cache_test.go <<'X'

func TestMaxEntries(t *testing.T) {
	c := New(Options{TTL: time.Minute, MaxEntries: 2})
	c.Set("a", "1")
	c.Set("b", "2")
	c.Set("c", "3")
	if c.Len() != 2 {
		t.Fatalf("len %d", c.Len())
	}
}
X
gofmt -w . 
git add -A && git commit -qm "Bound cache size with CACHE_MAX_ENTRIES"
