# GVPN Manager for OpenWrt

`luci-app-gvpn` adds a graphical GVPN manager to OpenWrt LuCI. The default setup uses Google Apps Script as a manually configured web proxy, without a VPS. Optional Full mode can transparently route LAN TCP/UDP through TPROXY when a separate tunnel-node is available.

**This repository's user guide is for OpenWrt routers.** See the [Persian guide](README.fa.md), the [detailed English OpenWrt guide](openwrt/README.md), or [OpenWrt releases](https://github.com/dreamboxone/gvpn/releases).

## What you need

- An OpenWrt router with firewall4/nftables and a package format matching the release. APK packages are for APK-based OpenWrt; do not install them on older opkg/IPK firmware.
- The package built for your router's architecture and firmware. Separate builds are provided for ARMv7 and AArch64. Kernel modules must match the exact firmware release and target.
- A Google account for the standard Apps Script relay. This path needs no VPS. It relays HTTP/HTTPS through a manually configured proxy, not arbitrary TCP/UDP or the whole LAN.

## 1. Create the Google Apps Script

Access to [script.google.com](https://script.google.com/) may be filtered. If it does not open, connect through a VPN to create or manage the Web App.

1. Create a project at [script.google.com](https://script.google.com/) and replace its default `Code.gs` content with [`assets/apps_script/Code.gs`](assets/apps_script/Code.gs). Do not use `CodeFull.gs` for this VPS-free setup.
2. In the script, set a strong random value for `AUTH_KEY`. Keep it private; you will enter this same key in LuCI.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to **Me**, and set access as required by the script guide (the Web App must be reachable by the router). Approve Google's authorization prompt.
4. Open **Deploy → Manage deployments** and copy the Deployment ID. Enter the ID only, not the full `/exec` URL.
5. Every deployment you add must use the same `AUTH_KEY`. You can add several Deployment IDs in LuCI and remove them individually.

Full mode is optional and requires both [`CodeFull.gs`](assets/apps_script/CodeFull.gs) and a separately deployed [`tunnel-node`](tunnel-node/README.md) on a VPS or Cloud Run. It is not part of the setup below.

## 2. Install on the router

Download the `luci-app-gvpn-*.apk` package for the router's architecture from [Releases](https://github.com/dreamboxone/gvpn/releases). In LuCI, open **System → Software → Upload Package**, choose the APK, and install it. Alternatively, copy it to the router and run:

```sh
apk add --allow-untrusted /tmp/luci-app-gvpn-*.apk
```

Open **Services → GVPN Manager**. The page displays the installed package version. If the router reports a missing `kmod-nft-tproxy`, use a package built for the exact firmware/SDK; do not install a kernel module from a different release or target.

## 3. Configure the Apps Script proxy

1. Enter the shared `AUTH_KEY` and add one or more Deployment IDs.
2. Select **Apps Script** and leave **Automatic LAN routing with TPROXY** off. This mode does not support transparent whole-LAN TCP/UDP routing.
3. Click **Save & Apply** and start the service. Configure an HTTP proxy on the client using the router's LAN IP and port `8085`, or a SOCKS5 proxy on port `8086`, for supported web traffic.

Do not enable GVPN TPROXY for the Apps Script-only path. It requires Full mode and a tunnel-node to handle arbitrary LAN TCP/UDP. A successful Apps Script deployment does not remove that limitation.

## Passwall2 and v2rayN

- **Passwall2:** For this Apps Script setup, leave GVPN TPROXY off. You can add its local SOCKS5 endpoint at `127.0.0.1:8086` to Passwall2, but it does not provide arbitrary TCP/UDP tunneling. Full mode needs a tunnel-node.
- **v2rayN on Windows:** For manual web proxy use, add the router's LAN IP as a SOCKS5 server on port `8086`.

## Stop and uninstall

First disable LAN TPROXY in LuCI and click **Save & Apply**, then run:

```sh
/etc/init.d/gvpn stop
/etc/init.d/gvpn disable
apk del luci-app-gvpn
```

OpenWrt may preserve `/etc/config/gvpn` as a configuration file after uninstall. Remove it separately only if you also want to delete the saved credentials and settings.

## Build for another target

Use the official OpenWrt SDK matching the router's firmware target and release. In WSL/Linux, run:

```sh
./scripts/build-openwrt.sh /path/to/openwrt-sdk
```

The script builds the Rust binary and LuCI APK for that SDK's package architecture. See [`openwrt/README.md`](openwrt/README.md) for target details, limitations, troubleshooting, and package testing.
