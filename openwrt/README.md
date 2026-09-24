# GVPN for OpenWrt

`luci-app-gvpn` is the graphical OpenWrt package for GVPN. Its LuCI page is under **Services → GVPN Manager** and manages the relay engine and service. The default Apps Script setup is a manually configured web proxy that needs no VPS; transparent LAN routing is an optional Full-mode feature.

> Start with the standard `Code.gs` Apps Script relay: it needs no VPS and works as a manually configured web proxy. Full mode and automatic LAN routing are separate features requiring `CodeFull.gs` and a tunnel-node on a VPS or Cloud Run.

## Requirements and compatibility

- OpenWrt using **firewall4/nftables** (OpenWrt 22.03 or newer). The package declares `sing-box`, `kmod-nft-tproxy`, and `ip-full` as dependencies.
- OpenWrt builds using APK: install the `.apk` built for the router's exact SDK and package architecture. OpenWrt 24.10 and older generally use IPK/opkg; do not install this APK there.
- Artifacts under `dist/openwrt` are specific to the architecture used to build them. ARMv7 and AArch64 need separate builds. The AArch64 binary targets the generic 64-bit ARM ABI and can run on compatible ARMv8/ARMv9 CPUs, but that does not make the APK compatible with every firmware or kernel.
- The project's known initial test target is `ipq40xx/chromium`, package architecture `arm_cortex-a7_neon-vfpv4`. For other targets, use that target/release's official SDK; kernel dependencies must match the router firmware exactly.

## Install

In LuCI, open **System → Software → Upload Package**, upload the matching `luci-app-gvpn-*.apk`, and install it. Or copy it to the router and run:

```sh
apk add --allow-untrusted /tmp/luci-app-gvpn-*.apk
```

If `kmod-nft-tproxy` is unavailable for the running kernel, the SDK and firmware do not match. Build against the device's exact SDK/firmware; do not install a kernel module from another target or release.

## Get the Apps Script values

The “Google key” is not a Google Cloud API key. GVPN needs a private shared `AUTH_KEY` and one or more Apps Script Web App deployment IDs.

1. Create an Apps Script project and replace its default `Code.gs` content with [`assets/apps_script/Code.gs`](../assets/apps_script/Code.gs). Set a strong random `AUTH_KEY` in the script and keep it for the LuCI form. If you already deployed `CodeFull.gs`, its web relay also works in Apps Script mode without a tunnel-node.
2. In Apps Script, choose **Deploy → New deployment → Web app**. Set it to execute as **Me** and allow access by the router. Anyone who can reach an anonymously accessible deployment can attempt requests, so use a strong `AUTH_KEY` and protect it.
3. Authorize the script if prompted. Copy the deployment ID from **Deploy → Manage deployments**. Enter the ID, not the full `/exec` URL, in LuCI.
4. For multiple deployments, use the same `AUTH_KEY` in every copy. Add IDs one at a time to the LuCI list; saved IDs can be viewed or removed.

Full mode is optional. It requires [`CodeFull.gs`](../assets/apps_script/CodeFull.gs) and a separately deployed [`tunnel-node`](../tunnel-node/README.md); it will not relay tunnel traffic without that node.

Official Google references: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [deployments and deployment IDs](https://developers.google.com/apps-script/concepts/deployments), and [service quotas](https://developers.google.com/apps-script/guides/services/quotas).

## Start the Apps Script proxy

1. Under **Services → GVPN**, enter the deployment IDs and shared `AUTH_KEY`.
2. Select **Apps Script** and leave **Automatic LAN routing with TPROXY** disabled.
3. Click **Save & Apply** and start GVPN. Configure your client to use the router's LAN IP as an HTTP proxy on port `8085` or a SOCKS5 proxy on port `8086` for supported web traffic.
4. Check the engine status card. Enable service autostart if it should start on every boot.

Apps Script alone cannot carry arbitrary TCP/UDP or transparently route the whole LAN. Do not enable GVPN TPROXY without a working Full-mode tunnel-node.

For HTTPS, GVPN generates a local CA at `/etc/gvpn/data/mhrv-rs/ca/ca.crt`. Trust this public certificate only on client devices you control if you want to use HTTPS through the proxy. Never copy the adjacent private key `ca.key`. Trusting this CA permits the router to inspect HTTPS; without it, clients should reject the proxy certificate.

## Passwall2 and v2rayN

- For this Apps Script setup, keep GVPN's built-in TPROXY off. A SOCKS node at `127.0.0.1:8086` can be added to Passwall2, but Apps Script does not provide general UDP or transparent LAN tunneling.
- On Windows/v2rayN, add the router as a SOCKS5 node at the default port `8086` for manual web proxy use. For proxy chaining, see the v2rayN guide for your installed release.

## Stop and uninstall

Disable LAN routing in LuCI and click **Save & Apply**, then stop the service. To uninstall:

```sh
/etc/init.d/gvpn stop
/etc/init.d/gvpn disable
apk del luci-app-gvpn
```

The package manager may preserve `/etc/config/gvpn` as a configuration file. If you want to permanently remove account settings/secrets too, verify the path and keep a backup if needed, then remove that file separately.

## Build from an SDK

Use an OpenWrt SDK extracted and configured in WSL/Linux for the router target:

```sh
./scripts/build-openwrt.sh /path/to/openwrt-sdk
```

The build script reads the target and package architecture from the SDK, chooses the Rust target, builds the APK, and inspects its contents. Run it separately with a matching SDK for ARMv7 and AArch64 targets. Artifacts are written to `dist/openwrt/<package-architecture>/`. SDKs prepared in the current WSL environment are `/home/khava/owrt/aether-ipq-sdk` for ARMv7 and `/home/khava/owrt/aarch64-filogic-sdk-25.12.5` for AArch64 Cortex-A53.
