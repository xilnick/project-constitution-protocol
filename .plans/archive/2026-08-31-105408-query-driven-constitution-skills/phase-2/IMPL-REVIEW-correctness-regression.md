# Lens: correctness-regression
**Verdict:** approve

**Blockers:** 
None

**Non-blocking:** 
None

**Gates run:**
```bash
node -e 'const fs = require("fs"); const { execSync } = require("child_process"); const skills = [ { path: ".agents/skills/constitution-query/SKILL.md", name: "constitution-query", reqs: ["Progressive Disclosure", "ai-docs/constitution.yaml", "d-xxxx", "c-xxxx", "r-xxxx", "l-xxxx", "security.rules", "yq"] }, { path: ".agents/skills/code-intelligence/SKILL.md", name: "code-intelligence", reqs: ["Progressive Disclosure", "tokensave tool", "find_exact_symbol", "entities", "callers", "callees", "impact", "body"] }, { path: ".agents/skills/adr-manager/SKILL.md", name: "adr-manager", reqs: ["ai-docs/constitution.yaml", "ai-docs/decisions", "d-xxxx", "Status", "Context", "Decision Drivers", "Considered Options", "Consequences"] } ]; for (const s of skills) { if (!fs.existsSync(s.path)) throw new Error("Missing skill file: " + s.path); const content = fs.readFileSync(s.path, "utf8"); const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!match) throw new Error("Missing YAML frontmatter in " + s.path); const fm = match[1]; if (!fm.includes("name: " + s.name) || !fm.includes("description:")) throw new Error("Invalid frontmatter in " + s.path); for (const req of s.reqs) { if (!content.includes(req)) throw new Error("Missing required snippet \"" + req + "\" in " + s.path); } } const q1 = execSync("yq \".decisions[] | select(.id == \\\"d-8f3a\\\") | .adr\" ai-docs/constitution.yaml").toString().trim(); if (!fs.existsSync(q1)) throw new Error("ADR referenced in constitution does not exist: " + q1); const q2 = execSync("tokensave tool status").toString(); const st = JSON.parse(q2); if (!st.node_count || st.node_count <= 0) throw new Error("Invalid tokensave status node_count"); console.log("Phase 2 Acceptance Gate: All 3 modular skills verified and command tooling functional!");'
```
Output:
```
Phase 2 Acceptance Gate: All 3 modular skills verified and command tooling functional!
```

**Unverified:** 
None
