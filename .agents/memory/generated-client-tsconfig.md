---
name: Generated client TypeScript configuration
description: Orval's generated fetch client relies on Headers.entries during workspace typechecks.
---

Include `dom.iterable` in the generated React client package's TypeScript `lib` list.

**Why:** The generated client normalizes `Headers` with `entries()`, which is not available from the base `dom` library alone in this workspace's composite build.

**How to apply:** If API codegen succeeds but the library typecheck reports `Property 'entries' does not exist on type 'Headers'`, update the client package TypeScript libs before changing generated output.