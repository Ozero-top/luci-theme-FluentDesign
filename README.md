# luci-theme-FluentDesign

A [Microsoft Fluent Design](https://fluent2.microsoft.design/) language theme
for [OpenWrt LuCI](https://github.com/openwrt/luci), developed against the
current ucode-template LuCI stack (OpenWrt 24.10 / SNAPSHOT and newer).

- Accent `#0078d4`, 4–8 px rounding, soft layered shadows
- Selective acrylic (app header, mobile drawer, login card)
- 150/200 ms motion, `scale(0.97)` press, 2 px offset focus ring
- Light **and** dark scheme (follows system or forced via UCI)
- Personalization: accent color, dark accent, global font scale, acrylic
  blur/opacity, color mode
- Random local image/video login backgrounds (no network fetch)
- Fully responsive: desktop sidebar -> mobile acrylic drawer
- Same DOM contract as the stock themes, so every LuCI module keeps working

## Directory layout

```
luci-theme-FluentDesign/
├── Makefile                              # OpenWrt package definition (+luci-base)
├── ucode/template/themes/fluentdesign/   # ucode templates (.ut)
│   ├── head_meta.ut
│   ├── header.ut / footer.ut             # admin shell (containers paired)
│   ├── header_login.ut / footer_login.ut
│   ├── out_header_login.ut
│   └── sysauth.ut                        # login page
├── htdocs/luci-static/
│   ├── fluentdesign/                     # theme media root
│   │   ├── css/cascade.css               # light + layout + components
│   │   ├── css/dark.css                  # dark scheme overrides
│   │   ├── icon/  (favicon.svg, apple-touch.svg, arrow.svg, manifest.json)
│   │   ├── img/   (logo.svg, login-bg.svg)
│   │   └── background/                   # put custom login backgrounds here
│   └── resources/menu-fluentdesign.js    # menu renderer (shared resources path)
└── root/etc/uci-defaults/30_luci-theme-FluentDesign
```

Runtime mapping (performed by `luci.mk`):

| Source                              | Installed on target                         |
|-------------------------------------|---------------------------------------------|
| `ucode/**`                          | `/usr/share/ucode/luci/template/themes/fluentdesign/` |
| `htdocs/luci-static/fluentdesign/`  | `/www/luci-static/fluentdesign/`            |
| `htdocs/luci-static/resources/`     | `/www/luci-static/resources/`               |
| `root/etc/uci-defaults/...`         | `/etc/uci-defaults/` (run once on install)  |

## Requirements

- OpenWrt with the ucode LuCI stack (22.03 through 25.12 / SNAPSHOT)
- `luci-base` (declared as the only package dependency)

## Compatibility

**OpenWrt / LuCI server stack** — the theme uses the ucode template
LuCI (the same stack as the stock 22.03+ themes), the standard
`luci-base` dispatcher, rpcd ACL JSON and `menu.d` registration:

| Stack | Status |
|--------|--------|
| OpenWrt 25.12.x (apk; latest stable, verified on 25.12.5) | Supported |
| OpenWrt 24.10.x (opkg; verified up to 24.10.x) | Supported |
| OpenWrt 23.05, 22.03 | Supported |
| ImmortalWrt on the matching baselines (22.03 / 23.05 / 24.10) | Supported |
| OpenWrt 21.02 and older (Lua `.htm` template LuCI) | Not supported |

> Note: there is no OpenWrt "25.10" release — after 24.10 the next
> stable branch is 25.12 (25.12.0 released 2026-03-18). No fork or
> special build is needed for it: the settings view was tested against
> the openwrt-25.12 LuCI core (all automated checks pass) and the
> ucode template / `luci.mk` packaging contracts are unchanged.


**Web server** — transparent, because the theme sits on the LuCI
rendering layer and ships only static assets plus ucode templates:

- **uhttpd** (default): works out of the box.
- **nginx**: works with the standard `luci-nginx` / uwsgi setup.
  No theme-side configuration is needed — all URLs are built via
  `media` / `resource` / `dispatcher.build_url()`, nothing hardcodes
  `/cgi-bin/luci`, and `/luci-static` is served as plain static files
  by both servers.

**LuCI pages and third-party apps** — every official module and
third-party application that targets the standard LuCI layout renders
inside the theme: the header/footer keep the stock DOM contract
(`#mainmenu`, `#modemenu`, `#tabmenu`, `#maincontent > .container`,
`.showSide`, `.darkMask`), and the settings page uses only public
`form` / `uci` / `ui` APIs.

**Browsers** — modern engines (Chrome/Edge 111+, Firefox 113+,
Safari 16.2+) get the full experience including live-derived
hover/active accent colors and dynamic viewport sizing. Older
engines degrade gracefully via `@supports` / static-value fallbacks
(default Fluent accent, `100vh`, control default rounding); all
functions, settings and navigation keep working.

## Install

### Option A — build into firmware / via feed

1. Put the package directory under `package/luci-theme-fluentdesign` in your
   buildroot (or symlink it from a custom feed).
2. Select it in `make menuconfig` -> *LuCI* -> *Themes* ->
   **luci-theme-FluentDesign**.
3. Build:

   ```sh
   make package/luci-theme-fluentdesign/compile V=s
   ```

   The resulting `.ipk` is under `bin/packages/.../luci/`.

### Option B — install the .ipk on a running router

```sh
opkg update
opkg install luci-theme-fluentdesign_*.ipk
# apk-based snapshots:
# apk add --allow-untrusted luci-theme-fluentdesign_*.apk
```

The `uci-defaults` script registers the theme and activates it on a fresh
install. On package upgrade it never overrides the user's current theme.

### Option C — deploy files directly (development / quick test)

```sh
# templates
mkdir -p /usr/share/ucode/luci/template/themes/fluentdesign
cp -a ucode/template/themes/fluentdesign/*.ut \
      /usr/share/ucode/luci/template/themes/fluentdesign/

# media
mkdir -p /www/luci-static/fluentdesign
cp -a htdocs/luci-static/fluentdesign/* /www/luci-static/fluentdesign/
cp -a htdocs/luci-static/resources/menu-fluentdesign.js \
      /www/luci-static/resources/

# register + enable
uci set luci.themes.FluentDesign=/luci-static/fluentdesign
uci set luci.main.mediaurlbase=/luci-static/fluentdesign
uci commit luci
```

> Do **not** change `luci.main.resourcebase`. Core scripts (`cbi.js`,
> `luci.js`) are served from `/luci-static/resources` independently of the
> selected theme.

### Enable / switch

- Web UI: **System -> System -> Language and Style -> Design** ->
  *FluentDesign*, then refresh.
- CLI:

  ```sh
  uci set luci.main.mediaurlbase=/luci-static/fluentdesign
  uci commit luci
  /etc/init.d/rpcd reload
  ```

## Personalization

Create `/etc/config/fluentdesign` (every option is optional and validated;
invalid values are ignored and the Fluent defaults are used):

```sh
uci set fluentdesign.@global[0].mode='normal'        # normal | light | dark
uci set fluentdesign.@global[0].primary='#0078d4'   # light-scheme accent
uci set fluentdesign.@global[0].dark_primary='#2899f5'
uci set fluentdesign.@global[0].font_size='1'       # 0.8 - 1.3 global scale
uci set fluentdesign.@global[0].blur='30'           # 0 - 100 px acrylic blur
uci set fluentdesign.@global[0].acrylic_opacity='0.7' # 0 - 1 surface opacity
uci commit fluentdesign
```

- `mode=normal` follows the OS/browser `prefers-color-scheme`;
  `light`/`dark` force a scheme.
- `font_size` multiplies the root rem size (whole UI scales).
- Colors accept `#rgb` or `#rrggbb` only; invalid input is discarded to
  prevent stylesheet injection.

### Custom login background

Place image/video files into
`/www/luci-static/fluentdesign/background/` (supported: jpg/jpeg/png/gif/webp
and mp4/webm). One is chosen at random per visit; videos honor
`prefers-reduced-motion` and start muted with a mute toggle. There is no
online wallpaper download, so no `wget`/`rpcd` dependency is required.

## Uninstall

```sh
opkg remove luci-theme-fluentdesign
# switch back to a stock theme first if it was active:
uci set luci.main.mediaurlbase=/luci-static/bootstrap
uci commit luci
```

## Versioning

| Version | Date       | Notes                          |
|---------|------------|--------------------------------|
| 1.1.1   | 2026-10-08 | Browser CSS fallbacks & compat matrix |
| 1.1.0   | 2026-10-08 | Theme settings page (UCI)      |
| 1.0.0   | 2026-10-08 | Initial Fluent Design release  |

Semantic versioning is used; UCI option compatibility is preserved within a
major version.

## License

Apache License 2.0
