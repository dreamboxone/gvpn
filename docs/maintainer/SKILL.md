# mhrv-rs maintenance

This document encodes the project context, recurring patterns, and conventions needed to ship code, triage issues, and respond to users effectively. It is the entry point to the broader knowledge base in `references/`.

## Why this matters

mhrv-rs is **infrastructure for circumvention**. The bulk of the userbase is in Iran — under one of the world's heaviest internet censorship regimes — using this tool to reach YouTube, Wikipedia, Telegram, GitHub, news sites, banking, and (critically) to communicate with family abroad. A non-trivial fraction of users are in Russia, China, Belarus, and other censored networks, but Iran dominates the issue tracker.

The architecture's importance is the architecture itself: by routing traffic through Google Apps Script, the user's ISP only sees encrypted HTTPS to Google IPs (`216.239.38.120` etc.) — the exact same fingerprint as `www.google.com`. ISPs that block conventional VPNs are forced to either let mhrv-rs through or break Google access for the entire country. This asymmetry is what makes the project work, and it shapes every architectural decision.

When responding to a Persian-language issue, the responder is often the only English-speaking maintainer the reporter has access to. Be clear, generous, and specific. When shipping a release, you're shipping it to people for whom the alternative is not "use a different tool" but "lose internet access". This drives the project's bias toward shipping over polish, toward backwards-compatible defaults, and toward documenting workarounds even when the proper fix is months away.

## Working directory and conventions

This is a standard Rust project. `cd` into your local clone before running git/gh/cargo commands, or use absolute paths. Reply markdown files for `gh issue comment --body-file` are conventionally written to a temporary file (e.g., `/tmp/...`) before posting, to avoid HEREDOC quoting issues with backticks and `$()` substitutions.

## Reference files (read as needed)

This knowledge base is structured for progressive disclosure. The body below covers conventions and reflexes; the reference files have the deep context for specific tasks. Read them lazily — only the ones relevant to what you're doing.

- **`references/architecture.md`** — Read when explaining the system to a user, debugging unfamiliar log patterns, or making an architectural decision. Covers domain fronting, apps_script vs Full mode, MITM CA, tunnel-node, the AUTH_KEY/TUNNEL_AUTH_KEY/DIAGNOSTIC_MODE distinction, SNI rewriting, and `google_ip` rotation.
- **`references/issue-patterns.md`** — Read when triaging a new issue. Catalogs the most common user-reported issue patterns with diagnostic procedures and canonical reply structures.
- **`references/diagnostic-taxonomy.md`** — Read when a user shows a failure log with `no json in batch response` or HTML body. The six candidate causes for the placeholder body, what each looks like, and how `DIAGNOSTIC_MODE=true` disambiguates them.
- **`references/workflow-conventions.md`** — Read when writing a reply, changelog, or commit message. Reply marker, Persian-vs-English language convention, changelog format, semver discipline.
- **`references/release-workflow.md`** — Read when cutting a release. Cargo.toml bump → changelog → commit → tag → push, then auto-fired CI handles the rest (release builds + Telegram channel publishing).
- **`references/contributors.md`** — Read when interacting with named contributors. Each top contributor has a domain they specialize in.
- **`references/roadmap.md`** — Read when categorizing a feature request. Current and upcoming release batches.
- **`references/persian-templates.md`** — Read when writing a Persian reply. Common phrases and full-paragraph templates for the most-repeated Persian-language situations.
- **`assets/changelog-template.md`** — Use as the starting template when creating a new `docs/changelog/vX.Y.Z.md` file.
- **`assets/reply-marker.md`** — The exact reply footer to append to every issue/PR comment.

## Conventions to internalize

These show up so frequently they should be memorized rather than looked up each time.

### The reply marker

Every substantive issue or PR comment ends with this exact footer (with a literal `---` HR before it):

```
---
<sub>[reply via Anthropic Claude | reviewed by @therealaleph]</sub>
```

This is non-negotiable. Users in this community recognize the marker. It signals that the reply was drafted by Claude and reviewed by the maintainer before posting. Don't omit it, don't paraphrase it, don't translate "reviewed by" into Persian.

### Persian or English: match the user

If the user wrote in Persian, reply in Persian. If they wrote in English, reply in English. If they mixed (common), match the dominant language. Never assume Iranian users want English — many are more comfortable in Persian and the message lands better in their language.

Code blocks, command examples, technical terms (`AUTH_KEY`, `script_id`, `parallel_concurrency`), URLs, and the reply marker always stay in their original Latin form. Don't translate them.

### Public artifact tone

Anything that goes into the public repo — issue replies, PR comments, commit messages, PR descriptions, changelogs — is full prose, written warmly and clearly. Persian or English, adjust to the user. Iranian users especially read carefully and brevity reads as cold or dismissive in this context. Use full sentences. Explain reasoning. Be patient.

### Semver discipline

The project uses `vX.Y.Z` strictly:
- **X (major)** — currently `1`. Bump only on a true ABI/protocol break with the Apps Script side.
- **Y (minor)** — feature batch. Bump when shipping a coherent set of features (e.g. v1.7 → v1.8).
- **Z (patch)** — small fix or single-feature addition that doesn't justify a minor bump. Most releases are patch bumps.

Patch releases (v1.8.1, v1.8.2, v1.8.3) ship continuously — every time something user-visible lands. Don't sit on completed work; releases are cheap and Iranian users who ask "when's the fix shipping?" deserve "in the next 30 minutes" not "next week". The release CI is fast (~30 min from tag push to Telegram publish).

### Persian-then-English changelog

Every changelog file in `docs/changelog/vX.Y.Z.md` follows this exact format:

```markdown
<!-- see docs/changelog/v1.1.0.md for the file format: Persian, then `---`, then English. -->
• [bullet 1 in Persian]
• [bullet 2 in Persian]
---
• [same bullet 1 in English]
• [same bullet 2 in English]
```

Persian comes first because the userbase is majority-Persian. The English version is for international contributors and the public repo audience. Both versions cover the same content but are written natively in each language — not machine-translated.

### When to close issues

Close immediately:
- **Resolved** — user confirmed fix works (`gh issue close N --reason completed`)
- **Duplicate** — point to canonical thread (`gh issue close N --reason "not planned"`)
- **Architectural limit** — feature can't be implemented due to Apps Script restrictions (close with explanation, mark as `not planned`)

Keep open:
- **Tracking** — issue serves as canonical reference for a roadmap item (e.g., #313 for ISP throttle, #300 for SABR cliff, #420 for dual-VPS docs)
- **Awaiting user verification** — a fix/workaround was posted, waiting for user to confirm
- **Active diagnostic** — back-and-forth with user gathering data

When closing as duplicate, always include the canonical issue number in the close comment so future readers can navigate.

## DOPR (Daily Open PR + Issue Triage) cycle

For "do DOPR", "check issues", "issues, prs", or similar requests, the workflow is:

1. **List open PRs**: `gh pr list --state open --limit 20`
2. **List recently-updated issues**: `gh issue list --state open --limit 30 --search "sort:updated-desc"`
3. **For each PR**: review the diff, check CI, decide merge/comment/decline. New PRs from new accounts that look like supply-chain-pattern (typosquat, "update requirements.txt" with weird deps, rebrand-and-replace) get declined politely. Substantive code from known contributors generally gets merged after a local `cargo test --lib` + build. See `references/contributors.md` for who's known.
4. **For each issue updated since last DOPR**: read the latest comments. If there's a new user message, reply substantively (not just "thanks, will look into it"). If there's user confirmation that a fix worked, close the issue. If you've been waiting on user data and they haven't responded for several days, the issue can stay open or be closed with "Closing for now; reopen if it's still happening." (use judgment).
5. **If anything user-visible landed**: cut a patch release. Don't batch up 5 PRs into one big release — ship one at a time.
6. **For each new substantive issue**: write a real reply. Default to writing it in a temp file (e.g., `/tmp/r-<issue>-<topic>.md`) and posting via `gh issue comment N --body-file ...` (avoids HEREDOC quoting hell with backticks and `$()`).

DOPR replies should not be templated. Use the issue-patterns reference to recognize the situation, then write a reply that addresses _this user's specific report_ — their log lines, their config, their setup. Templated replies are easy to spot and erode trust.

## Operational guardrails

- **Don't merge PRs without local verification** — `git fetch && gh pr checkout N && cargo test --lib && cargo build --release`. CI doesn't run tests on PRs in this repo (only the release-drafter), so local verification is the real gate.
- **Don't push to `main` while a release is mid-flight** — `release.yml` auto-fires on tag push and races with subsequent commits. Wait for the release CI to complete before merging more PRs.
- **Don't skip the `--reason` flag on `gh issue close`** — `completed` for resolved, `not planned` for duplicates and architectural limits.
- **Don't update `docs/changelog/` for already-released versions** — the file is the historical record of what shipped. New work goes into a new file for the next version.
- **Don't share AUTH_KEYs, TUNNEL_AUTH_KEYs, or deployment IDs** that a user posted in an issue. They might think they obfuscated them, but if they didn't, don't quote them back. If you need to reference them, use `YOUR_AUTH_KEY` / `<deployment_id>` placeholders.
