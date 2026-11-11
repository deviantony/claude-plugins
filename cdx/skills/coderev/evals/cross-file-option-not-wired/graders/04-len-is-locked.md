---
type: llm
focus: trace
weight: 1
---

Cache.Len takes the mutex, and concurrent Set and Len calls pass go test -race.
