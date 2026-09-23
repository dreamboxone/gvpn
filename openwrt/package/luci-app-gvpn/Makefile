include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-gvpn
PKG_VERSION:=1.0.0
PKG_RELEASE:=2
PKG_LICENSE:=MIT
PKG_MAINTAINER:=dreamboxone

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-gvpn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=GVPN Google relay proxy
  PKGARCH:=$(ARCH_PACKAGES)
  DEPENDS:=+luci-base +rpcd-mod-file +firewall4 +sing-box +kmod-nft-tproxy +ip-full
endef

define Package/luci-app-gvpn/description
GVPN Google Apps Script relay proxy with Persian LuCI management interface.
endef

VIEW:=settings-$(subst .,-,$(PKG_VERSION))-r$(PKG_RELEASE)
GVPN_BINARY?=$(firstword $(wildcard $(CURDIR)/prebuilt/$(ARCH_PACKAGES)/gvpn $(TOPDIR)/package/luci-app-gvpn/prebuilt/$(ARCH_PACKAGES)/gvpn))

define Build/Prepare
	$(call Build/Prepare/Default)
	$(CP) ./htdocs $(PKG_BUILD_DIR)/htdocs
	$(CP) ./files $(PKG_BUILD_DIR)/files
	@test -n "$(GVPN_BINARY)" -a -f "$(GVPN_BINARY)" || (echo "GVPN binary is missing for $(ARCH_PACKAGES)" >&2; exit 1)
	$(CP) "$(GVPN_BINARY)" $(PKG_BUILD_DIR)/gvpn
endef

define Build/Compile
endef

define Package/luci-app-gvpn/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/gvpn $(1)/usr/bin/gvpn
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/files/etc/config/gvpn $(1)/etc/config/gvpn
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/etc/init.d/gvpn $(1)/etc/init.d/gvpn
	$(INSTALL_DIR) $(1)/usr/libexec/gvpn
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/usr/libexec/gvpn/configure $(1)/usr/libexec/gvpn/configure
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/usr/libexec/gvpn/status $(1)/usr/libexec/gvpn/status
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/usr/libexec/gvpn/transparent $(1)/usr/libexec/gvpn/transparent
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/gvpn
	sed 's#gvpn/settings#gvpn/$(VIEW)#' ./htdocs/luci-static/resources/view/gvpn/settings.js \
		> $(1)/www/luci-static/resources/view/gvpn/$(VIEW).js
	chmod 0644 $(1)/www/luci-static/resources/view/gvpn/$(VIEW).js
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	sed 's#gvpn/settings#gvpn/$(VIEW)#' ./root/usr/share/luci/menu.d/luci-app-gvpn.json \
		> $(1)/usr/share/luci/menu.d/luci-app-gvpn.json
	chmod 0644 $(1)/usr/share/luci/menu.d/luci-app-gvpn.json
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-gvpn.json $(1)/usr/share/rpcd/acl.d/luci-app-gvpn.json
endef

define Package/luci-app-gvpn/conffiles
/etc/config/gvpn
endef

$(eval $(call BuildPackage,luci-app-gvpn))
