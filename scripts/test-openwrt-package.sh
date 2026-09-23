#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${1:-/home/khava/owrt/aether-ipq-sdk}"
ARCH="$(sed -n 's/^CONFIG_TARGET_ARCH_PACKAGES="\([^"]*\)"$/\1/p' "${SDK_ROOT}/.config")"
[[ -n "${ARCH}" ]] || { echo "Unable to read package architecture from SDK" >&2; exit 1; }
DIST_DIR="${REPO_ROOT}/dist/openwrt/${ARCH}"
APK="${SDK_ROOT}/staging_dir/host/bin/apk"
CHECK_DIR="$(mktemp -d)"
trap 'rm -rf "${CHECK_DIR}"' EXIT

sh -n "${REPO_ROOT}/openwrt/package/luci-app-gvpn/files/usr/libexec/gvpn/configure"
sh -n "${REPO_ROOT}/openwrt/package/luci-app-gvpn/files/usr/libexec/gvpn/status"
sh -n "${REPO_ROOT}/openwrt/package/luci-app-gvpn/files/usr/libexec/gvpn/transparent"
sh -n "${REPO_ROOT}/openwrt/package/luci-app-gvpn/files/etc/init.d/gvpn"
bash -n "${REPO_ROOT}/scripts/build-openwrt.sh"
python3 -m json.tool "${REPO_ROOT}/openwrt/package/luci-app-gvpn/root/usr/share/luci/menu.d/luci-app-gvpn.json" >/dev/null
python3 -m json.tool "${REPO_ROOT}/openwrt/package/luci-app-gvpn/root/usr/share/rpcd/acl.d/luci-app-gvpn.json" >/dev/null

shopt -s nullglob
PACKAGES=("${DIST_DIR}/luci-app-gvpn-"*.apk)
[[ "${#PACKAGES[@]}" -eq 1 ]] || { echo "Expected one luci-app-gvpn APK" >&2; exit 1; }
if compgen -G "${DIST_DIR}/gvpn-*.apk" >/dev/null; then
	echo "Unexpected separate gvpn APK found" >&2
	exit 1
fi

for package in "${PACKAGES[@]}"; do
	package_dir="${CHECK_DIR}/$(basename "${package}")"
	mkdir -p "${package_dir}"
	"${APK}" extract --allow-untrusted --destination "${package_dir}" "${package}"
done

APP_DIR="${CHECK_DIR}/$(basename "${PACKAGES[0]}")"
[[ -x "${APP_DIR}/usr/bin/gvpn" ]]
[[ -f "${APP_DIR}/etc/init.d/gvpn" ]]
[[ -f "${APP_DIR}/etc/config/gvpn" ]]
[[ -f "${APP_DIR}/usr/libexec/gvpn/configure" ]]
[[ -f "${APP_DIR}/usr/libexec/gvpn/transparent" ]]
find "${APP_DIR}/www/luci-static/resources/view/gvpn" -type f -print -quit | grep -q .
[[ -f "${APP_DIR}/usr/share/luci/menu.d/luci-app-gvpn.json" ]]
[[ -f "${APP_DIR}/usr/share/rpcd/acl.d/luci-app-gvpn.json" ]]
echo "OpenWrt package structure and archive checks passed."
