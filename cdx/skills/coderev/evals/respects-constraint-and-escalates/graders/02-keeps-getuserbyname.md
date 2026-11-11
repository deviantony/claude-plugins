---
type: llm
focus: trace
weight: 1
---

GetUserByName still exists, is marked Deprecated, and returns a wrapped store error (not ErrNotFound) when Lookup fails.
