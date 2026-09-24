#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${1:-/home/khava/owrt/aether-ipq-sdk}"
EXPECTED_ARCH="arm_cortex-a7_neon-vfpv4"
TARGET_BOARD=""
TARGET_SUBTARGET=""
TARGET_TRIPLE=""
TARGET_CPU=""
TARGET_DIR=""
PREBUILT_DIR=""
DIST_DIR=""
CHECK_DIR="$(mktemp -d)"

fail() {
	echo "Error: $*" >&2
	exit 1
}

[[ -f "${SDK_ROOT}/.config" ]] || fail "OpenWrt SDK config not found at ${SDK_ROOT}"
# OpenWrt 25.x SDKs build APK; 24.10 and older build IPK. Follow whichever
# the SDK is configured for instead of insisting on one.
if grep -Fqx 'CONFIG_USE_APK=y' "${SDK_ROOT}/.config"; then
	PKG_EXT="apk"
else
	PKG_EXT="ipk"
fi

EXPECTED_ARCH="$(sed -n 's/^CONFIG_TARGET_ARCH_PACKAGES="\([^"]*\)"$/\1/p' "${SDK_ROOT}/.config")"
TARGET_BOARD="$(sed -n 's/^CONFIG_TARGET_BOARD="\([^"]*\)"$/\1/p' "${SDK_ROOT}/.config")"
TARGET_SUBTARGET="$(sed -n 's/^CONFIG_TARGET_SUBTARGET="\([^"]*\)"$/\1/p' "${SDK_ROOT}/.config")"
[[ -n "${EXPECTED_ARCH}" && -n "${TARGET_BOARD}" && -n "${TARGET_SUBTARGET}" ]] || fail "Unable to read target architecture from SDK .config"
case "${EXPECTED_ARCH}" in
	arm_cortex-*|arm_cortexa*)
		TARGET_TRIPLE="armv7-unknown-linux-musleabihf"
		TARGET_CPU="generic"
		[[ "${EXPECTED_ARCH}" == arm_cortex-a7_neon-vfpv4 ]] && TARGET_CPU="cortex-a7"
		TOOLCHAIN_PATTERN='arm-openwrt-linux-muslgnueabi-gcc'
		;;
	aarch64_*)
		TARGET_TRIPLE="aarch64-unknown-linux-musl"
		TARGET_CPU="generic"
		TOOLCHAIN_PATTERN='aarch64-openwrt-linux-musl-gcc'
		;;
	*) fail "Unsupported OpenWrt ARM package architecture: ${EXPECTED_ARCH} (supported: ARMv7 and AArch64/ARMv8/ARMv9)" ;;
esac
TARGET_DIR="${REPO_ROOT}/target/${TARGET_TRIPLE}/release"
PREBUILT_DIR="${REPO_ROOT}/openwrt/package/luci-app-gvpn/prebuilt/${EXPECTED_ARCH}"
DIST_DIR="${REPO_ROOT}/dist/openwrt/${EXPECTED_ARCH}"

TOOLCHAIN_GCC="$(find "${SDK_ROOT}/staging_dir" -maxdepth 4 -type f -name "${TOOLCHAIN_PATTERN}" -print -quit)"
[[ -n "${TOOLCHAIN_GCC}" ]] || fail "OpenWrt cross-compiler not found in SDK for ${EXPECTED_ARCH}"
TOOLCHAIN_DIR="$(dirname "${TOOLCHAIN_GCC}")"
export PATH="${TOOLCHAIN_DIR}:${PATH}"
TARGET_ENV="$(printf '%s' "${TARGET_TRIPLE}" | tr '[:lower:]-' '[:upper:]_')"
export "CC_${TARGET_TRIPLE//-/_}=${TOOLCHAIN_GCC}"
export "AR_${TARGET_TRIPLE//-/_}=${TOOLCHAIN_DIR}/$(basename "${TOOLCHAIN_GCC}" | sed 's/gcc$/ar/')"
export "CARGO_TARGET_${TARGET_ENV}_LINKER=${TOOLCHAIN_GCC}"
export "CARGO_TARGET_${TARGET_ENV}_RUSTFLAGS=-C target-cpu=${TARGET_CPU}"

cd "${REPO_ROOT}"
cargo build --release --locked --target "${TARGET_TRIPLE}" --bin mhrv-rs

mkdir -p "${PREBUILT_DIR}" "${DIST_DIR}"
install -m 0755 "${TARGET_DIR}/mhrv-rs" "${PREBUILT_DIR}/gvpn"

if [[ -e "${SDK_ROOT}/package/luci-app-gvpn" ]]; then
	fail "SDK path already contains package/luci-app-gvpn; refusing to overwrite it"
fi
cp -a "${REPO_ROOT}/openwrt/package/luci-app-gvpn" "${SDK_ROOT}/package/luci-app-gvpn"

cleanup() {
	rm -rf "${SDK_ROOT}/package/luci-app-gvpn"
	rm -rf "${CHECK_DIR}"
}
trap cleanup EXIT

# The SDK scanned its package metadata before this package was copied in, so
# it does not know the package exists yet and `package/*/compile` would be a
# silent no-op. Drop the cached scan and select the package in .config —
# passing CONFIG_PACKAGE_... as a make variable alone is not enough on 24.10.
rm -f "${SDK_ROOT}/tmp/.packageinfo" "${SDK_ROOT}/tmp/.packagedeps"
sed -i '/^# CONFIG_PACKAGE_luci-app-gvpn is not set$/d; /^CONFIG_PACKAGE_luci-app-gvpn=/d' "${SDK_ROOT}/.config"
echo 'CONFIG_PACKAGE_luci-app-gvpn=m' >> "${SDK_ROOT}/.config"
make -C "${SDK_ROOT}" defconfig >/dev/null
grep -Fqx 'CONFIG_PACKAGE_luci-app-gvpn=m' "${SDK_ROOT}/.config" \
	|| fail "SDK did not keep luci-app-gvpn selected after defconfig"

make -C "${SDK_ROOT}" package/luci-app-gvpn/compile

mapfile -t BUILT_PACKAGES < <(find "${SDK_ROOT}/bin/packages/${EXPECTED_ARCH}" -type f \
	-name "luci-app-gvpn-*.${PKG_EXT}" -print)
[[ "${#BUILT_PACKAGES[@]}" -eq 1 ]] || fail "Expected exactly one luci-app-gvpn ${PKG_EXT^^}, found ${#BUILT_PACKAGES[@]}"

rm -f "${DIST_DIR}"/gvpn-*."${PKG_EXT}" "${DIST_DIR}"/luci-app-gvpn-*."${PKG_EXT}"
cp "${BUILT_PACKAGES[@]}" "${DIST_DIR}/"

for package in "${DIST_DIR}"/*."${PKG_EXT}"; do
	case "$(basename "${package}")" in
		luci-app-gvpn-*) package_dir="${CHECK_DIR}/luci-app-gvpn" ;;
		*) fail "Unexpected package in output directory: ${package}" ;;
	esac
	mkdir -p "${package_dir}"
	if [[ "${PKG_EXT}" == apk ]]; then
		"${SDK_ROOT}/staging_dir/host/bin/apk" extract --allow-untrusted --destination "${package_dir}" "${package}"
	else
		# An IPK is an ar/tar wrapper; the payload we inspect is data.tar.*.
		tar -xzf "${package}" -C "${package_dir}" ./data.tar.gz 2>/dev/null \
			|| tar -xf "${package}" -C "${package_dir}"
		data_tar="$(find "${package_dir}" -maxdepth 1 -name 'data.tar*' -print -quit)"
		[[ -n "${data_tar}" ]] || fail "${package} has no data payload"
		tar -xf "${data_tar}" -C "${package_dir}"
	fi
	[[ -x "${package_dir}/usr/bin/gvpn" ]] || fail "${package} is missing usr/bin/gvpn"
	[[ -f "${package_dir}/etc/init.d/gvpn" ]] || fail "${package} is missing the GVPN service"
	[[ -f "${package_dir}/etc/config/gvpn" ]] || fail "${package} is missing its UCI config"
	find "${package_dir}/www/luci-static/resources/view/gvpn" -type f -print -quit | grep -q . || fail "${package} is missing the LuCI view"
done

file "${PREBUILT_DIR}/gvpn"
sha256sum "${PREBUILT_DIR}/gvpn" "${DIST_DIR}"/*."${PKG_EXT}"
echo "OpenWrt packages built and inspected for ${TARGET_BOARD}/${TARGET_SUBTARGET} (${EXPECTED_ARCH}, ${TARGET_TRIPLE})."
