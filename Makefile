#
# Copyright (C) 2026 FluentDesign Theme Contributors
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=FluentDesign Theme - Microsoft Fluent Design language for LuCI
LUCI_DEPENDS:=+luci-base
PKG_VERSION:=1.1.2
PKG_RELEASE:=1

# Keep modern CSS (backdrop-filter, custom properties, :has()) untouched.
CONFIG_LUCI_CSSTIDY:=

define Package/luci-theme-FluentDesign/conffiles
/etc/config/fluentdesign
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
