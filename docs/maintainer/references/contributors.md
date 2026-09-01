# Contributor ecosystem

The project's substantive contributors fall into a few specialty domains. Knowing who-does-what lets you tag the right reviewer, weight feedback appropriately, and route new design decisions to the people most likely to have informed opinions.

## Project owner

### @therealaleph

Maintainer. Final authority on architectural decisions, release timing, what merges. Persian/English bilingual. Replies that go through Claude carry the marker `[reply via Anthropic Claude | reviewed by @therealaleph]` and are reviewed before posting.

## Core community contributors

These are the contributors whose substantive PRs and reports have shaped the project's roadmap. When designing features that touch their domain, tag them for review.

### @w0l4i

**Domain**: deep diagnostic feedback, architectural insight, persistence on hard bugs.

**Notable contributions**:
- Drove the v1.8.1 → v1.8.2 → v1.8.3 evolution of decoy detection. Reported the false-positive in v1.8.1 that led to the 4-cause taxonomy (then 5-cause, then 6-cause).
- Reported the Persian-localized quota body case (#404) after multiple iterations through wrong hypotheses (third-party relay → Iranian VPS appliance → Hetzner DE → Apps Script account locale).
- Suggested the v1.8.x "per-deployment auto-throttle" feature (AIMD style) with detailed rationale.
- Suggested the v1.9.0 xmux roadmap items: byte-range slipstreaming across deployments, MTU/packet-size optimization, per-deployment burst limits.
- Drove the v1.8.x DNS architecture redesign by pointing out that Iranian DNS providers (Shecan, 403) perform DNS hijacking and poisoning — they cannot be trusted as privacy-preserving alternatives (see #449).

**How to engage**:
- Reports are detailed and self-correct fast as data comes in
- Setups tend to be advanced (multiple deployments, Hetzner VPS, Full mode)
- Tag as a core reviewer for v1.9.0 xmux design issue when filed
- Communication: English

### @2bemoji

**Domain**: roadmap design discussions, particularly for QUIC blocking and DNS optimization.

**Notable contributions**:
- Drove the design of `block_quic` 3-state UI toggle (off / drop / reject with ICMP unreachable for instant Happy Eyeballs failover) in #361 / #377
- Surfaced the mobile-accessibility framing for `block_quic` (config-only is "Linux desktop only" for users who can't easily edit Android's `/data/data/...` config)

**How to engage**:
- Tag for Android UI batch decisions, especially anything touching QUIC / DNS / network-layer toggles
- Tag for v1.9.0 xmux design as a core reviewer
- Communication: English

### @ipvsami / Sam Ashouri

**Domain**: advanced Full mode setups, dual-VPS topologies, account suspension reports.

**Notable contributions**:
- Reported the Iranian-VPS xray entry topology in #420 (Iranian VPS as xray entry, German VPS as tunnel-node exit) — drove the dual-routing-xray design discussion
- Reported the Google account flag pattern in #421 (phone-less new accounts, "action required" notifications, Workspace landing HTML on flagged deployments) — drove the v1.8.x detection for the 6th cause in the diagnostic taxonomy

**How to engage**:
- Comfortable with VPS / xray / network routing; explanations can assume that level
- Tag for v1.9.0 xmux design as a core reviewer
- Communication: English

### @dazzling-no-more

**Domain**: code contributor — substantive Rust PRs.

**Notable contributions**:
- PR #121 (`--remove-cert` flag for clean CA teardown)
- PR #359 (Google Drive queue tunnel mode — community-testing, awaiting cleanup confirmation)
- PR #438 (H1 container keepalive + 431 oversized headers + clearer port-collision message — merged in v1.8.3)
- PR #439 (DoH bypass for Cloudflare/Google/Quad9/etc. on TCP/443 — merged in v1.8.3)
- PR #446 (tunnel-node long-poll raised to 15s, adaptive straggler settle — merged in v1.8.4)

**How to engage**:
- PRs tend to be self-contained with tests and clean diffs
- Address review feedback substantively — they iterate based on reviewer comments
- Tag for v1.9.0 xmux design as a core reviewer (could potentially contribute the implementation)
- Communication: English

### @euvel

**Domain**: code contributor — Apps Script (Code.gs) features.

**Notable contributions**:
- Designed the spreadsheet-backed response cache (#400 design discussion → PR #443 implementation)
- All 5 review suggestions from the design discussion implemented in PR #443: TTL-aware caching, 35 KB body-size gate, header rewriting on hit, circular buffer for O(1) writes, Vary-aware compound cache keys

**How to engage**:
- Apps Script JavaScript expertise; consider tagging for any future Code.gs changes
- Communication: English

## Adjacent projects

### @masterking32

Original Python project (`masterking32/MasterHttpRelayVPN`). mhrv-rs is the Rust port; the project periodically cherry-picks stability/feature commits from masterking32. PR #438 in v1.8.3 was a batch of three such cherry-picks. Not a direct contributor here, but the project's design parent.

### @denuitt1

Maintainer of `denuitt1/mhr-cfw` — Cloudflare Workers backend that aims to be Apps Script-compatible. Independent project, not officially endorsed. Tracked in #380 / #393 for compatibility audit. Not a direct contributor here.

### @g3ntrix, @mehrad-mz

Authors of forks/branches on the Python project that occasionally have valuable commits to cherry-pick (see #430 for the audit list).

## Tagging conventions

When tagging in a comment:

- Reviewer requests: "@dazzling-no-more — would you mind reviewing this approach?"
- Cross-references: "see [#404](https://github.com/therealaleph/MasterHttpRelayVPN-RUST/issues/404) where @w0l4i described this"
- Recognition: "this drove the design — thanks @euvel for the detailed initial proposal"
- For v1.9.0 xmux design issue specifically (when it's filed): tag @w0l4i, @2bemoji, @ipvsami, @dazzling-no-more, @euvel as core reviewers

Don't ping people gratuitously; each ping should have a clear ask or recognition.

## Project history context

The project predates this repo as `masterking32/MasterHttpRelayVPN` (Python). The Rust port was started for performance + cross-platform binary distribution. Apps Script protocol stayed compatible across both, and we periodically cherry-pick from upstream Python. v1.7.x represented the initial port stabilization; v1.8.x is the "DPI evasion + diagnostics + community-contribution batch"; v1.9.0 will be the xmux flagship.

Canonical "long" issues for context:
- #313 — Iran ISP throttle, primary tracking issue
- #300 — SABR cliff, primary tracking for video streaming limit
- #310 — VPS setup help, primary tracking for setup questions
- #333 — VPS / Full mode / Iranian-network workarounds
- #420 — dual-VPS topology, primary tracking for advanced Full mode
- #382 — Cloudflare error patterns
- #325 — community-shared deployment workflow
- #361 / #377 — Android UI batch + QUIC blocking design
- #369 — v1.9.0 xmux design (RFC, not yet filed as the formal design issue)
- #449 — DNS architecture redesign (post-Shecan correction)
