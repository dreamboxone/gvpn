# Roadmap

This is the project's queued work, organized by release batch. Use it when:
- Categorizing a new feature request from a user (which batch does this fit?)
- Cross-referencing roadmap items in your replies ("queued for v1.8.x")
- Deciding what to ship in the current batch vs deferred

Update this file when items ship (move to "shipped") or when new items are added (cluster with similar items in the right batch).

## v1.8.x (current batch — small fixes + diagnostics + Android UI)

The v1.8.x line is a **small-and-frequent** release pattern. Each release ships one or two completed items rather than batching many. The theme is "diagnostic improvements + Android UX + Apps Script script enhancements".

### Shipped

- ✅ **v1.8.0**: Random padding (DPI evasion), auto-blacklist deployments, decoy responses, full-mode usage counters, active-probing defense, DIAGNOSTIC_MODE flag in Code.gs
- ✅ **v1.8.1**: Decoy detection client-side (with v1.8.2/v1.8.3 corrections), `script_id` in error logs, `disable_padding` config flag
- ✅ **v1.8.2**: UI binary tracing reads `config.log_level` (with reload handle for live changes), softer 4-cause decoy detection error message
- ✅ **v1.8.3**: Spreadsheet-backed response cache (Code.gs, opt-in), DoH bypass for known DoH endpoints, H1 container keepalive (240s), 64 KB header cap with HTTP 431, clearer port-collision error message

### Queued (small, can ship in next 1-3 patch releases)

- **v1.8.4 candidate items**:
  - Soften decoy detection further with the 6-cause taxonomy (Persian quota body + Workspace landing HTML detection)
  - Per-`script_id` rolling-window error-category counter visible in CLI/UI
  - run.bat auto-fallback to CLI when both UI renderers fail (#417 / #426)
  - TUNNEL_AUTH_KEY startup warning when `MHRV_AUTH_KEY` is set without `TUNNEL_AUTH_KEY` (catches the recurring #391-style env var typo)
  - Range-aware splicing in Code.gs (lets large downloads work via HTTP Range requests, partial fix for #441)

### Queued (medium-effort, batch into focused release)

- **`googlevideo_ip` config field** (#300) — separate `google_ip` for googlevideo.com vs other Google domains. Some users have one IP that works for the latter but not the former. Approx 1-2 days of work.
- **DNS ad-blocking via StevenBlack/hosts** (#377) — opt-in DNS-level filtering during SOCKS5/MITM dispatch. Reduces upstream calls for ad-domains.
- **DNS caching + parallel dispatch via hickory-resolver** (#377) — replace blocking DNS with cached + parallel resolver. Substantial latency win for browser pageloads.
- **Tunable strike-counter threshold for auto-blacklist** (#391) — single-deployment users currently hit the auto-blacklist after a few transient errors and end up with no working deployment. Make threshold configurable.
- **`block_quic` 3-state UI toggle** (#361 / #377): off / drop / reject (default reject = ICMP unreachable, instant Happy Eyeballs failover). 2bemoji's design.
- **Android UI batch** (#285 / #361 / #261 / #295 / #254 / #313 / #375):
  - block_quic toggle
  - youtube_via_relay toggle
  - listen_host editor
  - passthrough_hosts editor
  - Active deployment indicator
  - Per-deployment quota counters
  - Android disconnect crash fix (#418)
- **System proxy toggle** (#432) — Windows/macOS/Linux desktop UI: on Connect set system HTTP proxy to mhrv-rs, on Disconnect clear. With crash-rollback so a hung mhrv-rs doesn't leave system proxy stuck.
- **`script_ids_url` dynamic config** (#433) — config field pointing at an HTTPS URL that returns a JSON list of deployment IDs. mhrv-rs fetches at startup + every TTL. Lets distributors update deployment lists for many users without each editing config manually.
- **In-app updater via mhrv-rs's own proxy** (#366) — let mhrv-rs check for updates + download new binaries through its own relay (avoiding the chicken-and-egg of "I can't reach github.com to update mhrv-rs"). Defense in depth.
- **Temporal jitter** (#369 §2) — randomize timing of batch dispatches to defeat timing-correlation DPI.
- **`tls_verify` config** (#430 / masterking32 PR #26) — opt-in to skip upstream TLS verification for self-signed certs. Trade-off: opens MITM-of-MITM risk; needs careful design.
- **`request_timeout` configurable** (#430 / masterking32 PR #25) — currently hard-coded `BATCH_TIMEOUT = 30s`. Make configurable for users on slow networks who want longer timeouts.
- **CF Workers backend audit** (#380 / #393) — test mhr-cfw compatibility. If it works, document as alternative backend.

### Documentation queued

- **`docs/full-mode-google-bypass.md`** (#420) — dual-routing in xray for users with Iranian VPS xray entry topology
- **`docs/full-mode-iran-vps-setup.md`** (#420) — full step-by-step for the dual-VPS topology (Iranian xray entry + non-Iranian tunnel-node exit)
- **`docs/iran-mirrors.md`** (#422) — community-maintained Iranian CDN mirrors for users who can't reach github.com. Pending SHA-256 verification of @amintoorchi's xdevteam.liara.space mirrors.
- **`docs/win7-build.md`** (#411) — manual Cargo.lock downgrade + cargo update --precise chain for community Win7 32-bit builds. Officially unsupported since v1.7.11 but the build path works for technical users.
- **`docs/faq/android.md`** — user trust store explanation, which apps work, why Gmail/YouTube don't, root + Magisk option
- **Updates to README** — short explanation of dual-routing for Google services + xray config snippet

## v1.9.0 (headline release — xmux)

The v1.9.0 release is the **xmux** feature: stream splitting across multiple Apps Script deployments at byte-range level. Currently in design / RFC stage (#369).

### Design goals

- **Survivability under ISP RST** — when one deployment's TCP connection gets RST-injected mid-stream, other deployments continue to carry remaining byte ranges
- **Latency reduction** — small responses can hit any of N deployments first; mhrv-rs takes the first to respond
- **Bandwidth aggregation** — large downloads chunk across deployments concurrently. 5 deployments × 10 MB/s each ≈ 50 MB/s aggregate (subject to per-deployment caps)
- **SABR cliff mitigation** — long YouTube streams chunk into <30s windows across deployments; each window finishes within Apps Script's response cap, then mhrv-rs reassembles

### Open design questions

- **Reordering buffer size** — bigger = more memory; smaller = more retries on out-of-order
- **Failure recovery** — if a deployment fails mid-chunk, who picks up the half-served range?
- **Idempotency** — POST requests are tricky; current design only handles GET safely
- **State consistency** — if some chunks come from cache and some don't, ETag/Last-Modified handling needs care
- **Configurability** — when does a user want xmux on (latency-sensitive) vs off (quota-sensitive)?

### Implementation timeline

- 4-6 weeks of design + implementation
- Tag @w0l4i, @2bemoji, @ipvsami, @dazzling-no-more, @euvel as core reviewers when design issue is filed

The design issue should be filed after the v1.8.x batch settles (so the queue isn't too long).

## v1.9.x and beyond (longer-horizon)

These are committed to the project's roadmap but not actively in design. Listed for traceability when users ask "are you planning X?".

- **Cloudflare WARP integration** (#309) — outbound traffic exits via Cloudflare WARP after Apps Script. Lets sites that flag Google IPs (most CF-protected) see traffic as Cloudflare-residential. Feasibility uncertain — needs CF account + WARP wireguard interface integration.
- **TLS fingerprint randomization** (#369 §2) — randomize JA3/JA4 across deployments. Defeats CF / commercial bot detection.
- **tunnel-node UPSTREAM_SOCKS5 chain** (#333 kanan-droid) — let tunnel-node forward through a SOCKS5 upstream (e.g., another VPN). Defense in depth + IP variety.
- **Tier-3 i686-win7-windows-msvc target** (#411) — Windows 7 32-bit support via tier-3 target with `-Z build-std`. Needs nightly Rust. Roadmap v1.9.x or v2.x.
- **Web frontend / dashboard** (#384) — landing page for the project. Low priority but recurring request.
- **In-app changelog viewer** — show changelog for new version inside mhrv-rs UI when an update is available (small UX polish).

## How to use this when triaging issues

When a feature request comes in:

1. Match the request to an existing item in this list. If found, reply: "Queued for v1.8.x [or whichever batch]. ETA ~X weeks. See [#NNN](#) for the canonical thread."
2. If it's a duplicate of an existing roadmap item, close as duplicate of the canonical issue.
3. If it's a new request not on this list:
   - Substantive feature: add to v1.8.x or v1.9.x list as appropriate, note the issue number, reply with the planned bucket
   - Long-horizon / uncertain: add to v1.9.x and beyond, reply that it's noted but no timeline
   - Architectural impossibility (UrlFetchApp self-loop, MTProto, etc.): close with explanation, link to architectural reference

## Roadmap velocity

The project ships v1.x.y patches frequently — typically 1-3 per week during active development. Minor (1.x) bumps happen every few months. v1.0 → v1.8 took ~12 months. So:

- "v1.8.x ETA" usually means "next 1-2 weeks" for small items, "next 1-2 months" for big items
- "v1.9.0 ETA" usually means "next 2-3 months"
- "v1.9.x" or "v2.x" means "no specific timeline, but committed to consider"

Be honest with users about timelines. Iranian users especially appreciate knowing whether to wait or pursue alternatives.
