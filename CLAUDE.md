# Claude Code Operational Rules

## 1. Token Efficiency (MANDATORY)
- Never read entire files unless explicitly instructed.
- Always search first (rg or equivalent) before opening files.
- When opening a file, read a maximum of 40 lines unless otherwise specified.
- Do not perform exploratory reading across multiple files.
- Do not repeat or summarize investigation steps.

## 2. Investigation Scope
- Only read files directly related to the symbol or function mentioned.
- Do not inspect unrelated components.
- Avoid reading build artifacts, dist, docs, public, or node_modules.

## 3. Response Format
- Provide:
  1) Root cause
  2) Exact lines involved
  3) Minimal patch (copy-paste ready)
- No narration of investigation process.

## 4. Large File Policy
If a file exceeds 500 lines:
- Ask for a specific symbol or function name before reading.
- Never scan the entire file.

## 5. Refactoring
- Prefer minimal diff.
- Avoid architectural rewrites unless explicitly requested.

## 6. Safety
- Never modify configuration or environment files unless explicitly asked.
- Never auto-generate large new files.

Failure to follow these rules is considered incorrect behavior.
