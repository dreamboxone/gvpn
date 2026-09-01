# Release workflow

Cutting a release is fast and low-ceremony for this project. Most releases are patch bumps that go from "decision to ship" to "Telegram channel posting" in under 30 minutes of human work + ~30 minutes of CI.

## When to cut a release

Cut a release whenever **anything user-visible** has landed since the last tag. User-visible includes:

- Bug fixes that affect runtime behavior
- New config options
- New CLI subcommands or flags
- Diagnostic improvements (better log messages, error categories)
- Apps Script script changes (Code.gs / CodeFull.gs)
- Documentation that users will read (README updates, troubleshooting docs — though these can also batch into the next release)

Don't cut for:
- Internal refactors with no behavior change
- CI/workflow file edits
- Markdown formatting fixes
- Test-only changes

When in doubt, cut. Patch releases are cheap and Iranian users actively check the Telegram channel for updates.

## The release workflow

### Step 1: Decide the version

Read the latest tag:

```bash
git describe --tags --abbrev=0
```

Then bump:
- **Patch (Z+1)** — for ~95% of releases. v1.8.2 → v1.8.3
- **Minor (Y+1)** — for a coherent feature batch shipped together. v1.7.x → v1.8.0 represented "DPI evasion + active-probing defense + full-mode usage counters" together
- **Major (X+1)** — never done in this project's history. Reserved for true protocol-incompatible changes with the Apps Script side. Don't bump major without explicit go-ahead.

### Step 2: Bump `Cargo.toml`

Edit `Cargo.toml` line 3 (`version = "X.Y.Z"`). Keep package name `mhrv-rs` unchanged. The `tunnel-node` subcrate has its own version that's independent — don't bump it unless you're shipping a tunnel-node change.

### Step 3: Build to refresh `Cargo.lock`

```bash
cargo build --release 2>&1 | tail -3
```

`Cargo.lock` will pick up the new version string. Verify with:

```bash
git diff Cargo.lock | head -20
```

Should show only the `name = "mhrv-rs"` block's `version = "X.Y.Z"` change.

### Step 4: Write the changelog

Create `docs/changelog/vX.Y.Z.md` using the format in `assets/changelog-template.md`. Persian first, then `---`, then English. See `workflow-conventions.md` for format details.

When the release is shipping multiple PRs from contributors, credit each by name + handle in both halves of the changelog.

### Step 5: Run tests + final build

```bash
cargo test --lib 2>&1 | tail -5
cargo build --release 2>&1 | tail -3
cargo build --bin mhrv-rs-ui --release --features ui 2>&1 | tail -3
```

All three must succeed. Test count varies by version. All passing is the gate.

If any contributor PRs were merged in this release, also verify by re-running tests after the merge — sometimes integration with main reveals issues that didn't show in the PR's CI.

### Step 6: Commit + tag + push

```bash
git add Cargo.toml Cargo.lock docs/changelog/vX.Y.Z.md
git status  # sanity check
git commit -m "$(cat <<'EOF'
chore: vX.Y.Z — <short summary fitting under 75 chars>

<longer body explaining the why and the changes — see workflow-conventions.md
for format>
EOF
)"

git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

The `git push origin vX.Y.Z` is the trigger — release CI auto-fires on tag push.

If `git push origin main` fails with `non-fast-forward`, someone (often the auto-binary-refresh CI from a prior release) pushed in the meantime:

```bash
git pull --rebase origin main
git push origin main
git tag vX.Y.Z   # if you didn't tag yet
git push origin vX.Y.Z
```

If you already tagged before the push race, the tag still works — it's pinned to your commit, and the rebase shouldn't change your commit's SHA unless there were conflicts.

### Step 7: Watch CI

```bash
gh run list --limit 3
```

Two workflows fire on tag push:
1. **`release-drafter`** — quick (~15s), updates the GitHub release draft. Always succeeds.
2. **`release`** — slow (~25-35 minutes), builds binaries for all platforms, attaches to release.

Once `release` succeeds, a third workflow auto-fires:
3. **`Telegram publish release files`** — posts each binary individually to the Telegram channel `mhrv_rs` with Persian captions, SHA-256 hashes, and a cross-link from the main channel. Takes ~1-2 minutes.

If `release` fails, common causes:

- **Cross-compile failure** — particularly on i686 / mipsel. i686 was dropped from the matrix in v1.7.11 because of MSRV churn (see #411 thread). If a new architecture starts failing, it's usually a transitive dep bumping MSRV past what the toolchain pinned for that target supports. Triage: check which architecture's job failed, look at the cargo error, decide whether to pin a dep with `cargo update --precise` or drop the architecture.
- **`actions/download-artifact@v4` flakiness** — replaced with `gh run download` + 3-attempt retry in v1.7.11. Should be stable now; if it flakes again, increase retry count.

After CI succeeds, optionally check the binary refresh:

```bash
git pull origin main
git log --oneline -3
```

You should see an auto-generated commit `chore(releases): refresh prebuilt binaries for vX.Y.Z` from the release CI bot.

### Step 8: Verify Telegram channel

The Telegram publish workflow posts to channel `mhrv_rs` (public link `https://t.me/mhrv_rs`). The channel should show:

1. An announcement post: `📦 mhrv-rs vX.Y.Z منتشر شد...` referencing the changelog file
2. ~16 individual file posts (Android APKs split by ABI, Windows ZIP, macOS arm64/amd64 dmg+tar, Linux x86_64/arm64 incl. musl, Raspbian, OpenWRT)
3. Each file caption includes Persian description (e.g., "نسخه ویندوز x86") + SHA-256 hash
4. A "main channel" post (different channel) cross-linking to the files channel post

Files larger than 50 MB get chunked into `.part_aa`, `.part_ab`, etc. via the `split` pattern in `.github/scripts/telegram_publish_files.py`.

If something didn't post, check the workflow run logs:

```bash
gh run view <run-id> --log
```

Common cause: the auto-fire dispatch on `workflow_run` requires the parent workflow to succeed; if release.yml had a flaky download retry, the dispatch might still succeed but partial.

## Manual re-publish (rare)

If you need to re-trigger Telegram publishing for an already-released version (e.g., the workflow failed and you fixed it), use `workflow_dispatch`:

```bash
gh workflow run "Telegram publish release files" -f version=vX.Y.Z
```

The script downloads artifacts via `gh release download` (not the workflow's artifacts) so it works retroactively.

## Re-cutting a release (very rare)

If a release was tagged and pushed but turns out to be broken (e.g., bug in a merged PR you wanted to revert):

1. **Don't** delete the tag if the release is already public. Iranian users may have already pulled the binaries; a deleted tag confuses them and they think the project is gone.
2. Cut a fix immediately as the next patch (vX.Y.Z+1).
3. Optionally edit the GitHub release notes for the broken version to say "known issue, upgrade to vX.Y.Z+1".

If you tagged but didn't push yet, just delete the tag locally and re-tag after fixing:

```bash
git tag -d vX.Y.Z   # local only; safe
# fix the issue, commit
git tag vX.Y.Z
git push origin vX.Y.Z
```

## Pre-release rollback

If `cargo test --lib` fails after merging PRs but before tagging:

1. Don't tag.
2. Either revert the merge commit (`git revert <merge-commit-sha>`) or fix forward (commit a new fix on main).
3. Re-run tests until green.
4. Tag.

The release CI doesn't run tests before building, so untagged-but-broken main is fine — you have time to fix before tagging.

## Coordinating with multiple PRs in flight

If two PRs are both ready to merge, the order matters:

- Merge them one at a time (not both into a single tag) **only** if they're independent
- If they touch the same files, merge them sequentially with `gh pr checkout N1 && cargo test && merge`, then `gh pr checkout N2` (which now bases on the new main; CI on the PR may show the old base, but the local checkout sees latest main) `&& cargo test && merge`
- If a merge introduces conflicts, GitHub's UI flags the PR as conflicting; resolve via `gh pr checkout N` + manual rebase + push to the PR branch

After all PRs are merged, **then** bump version, write changelog (covering all merged PRs), tag, push.

## Versioning the tunnel-node subcrate

`tunnel-node/Cargo.toml` has its own version field separate from the main crate. Bump it when:

- Changing the tunnel-node HTTP API (`/tunnel`, `/batch` endpoints)
- Changing the auth flow (`TUNNEL_AUTH_KEY` semantics)
- Changing the env var contract
- Bumping the Docker image label

For pure internal refactors of tunnel-node that don't change the surface, leave it alone — the Docker image at `ghcr.io/therealaleph/mhrv-tunnel-node:latest` continues to be the latest tag and users don't need to know an internal version bumped.

When tunnel-node version bumps, the Docker image gets re-tagged in the registry by the CI. Users running `docker pull ghcr.io/therealaleph/mhrv-tunnel-node:latest` get the new version automatically; users pinned to a specific version stay pinned.
