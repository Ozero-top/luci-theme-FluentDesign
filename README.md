# luci-theme-FluentDesign

[![LuCI 兼容性矩阵](https://github.com/Ozero-top/luci-theme-FluentDesign/actions/workflows/luci-compat.yml/badge.svg?branch=main)](https://github.com/Ozero-top/luci-theme-FluentDesign/actions/workflows/luci-compat.yml)

**简体中文** | [English](README.en.md)

面向 [OpenWrt LuCI](https://github.com/openwrt/luci) 的 [Microsoft Fluent Design](https://fluent2.microsoft.design/)
语言风格主题，基于现行 ucode 模板 LuCI 技术栈（OpenWrt 22.03 至 25.12 / SNAPSHOT）。

- 强调色 `#0078d4`，4–8 px 圆角，柔和的分层阴影
- 选择性亚克力材质（应用顶栏、移动端抽屉、登录卡片）
- 150/200 ms 动效，按压缩放 `scale(0.97)`，2 px 偏移焦点环
- 同时支持浅色与深色外观（跟随系统或通过 UCI 强制指定）
- 个性化设置页：强调色、暗色强调色、全局字号比例、亚克力模糊度/不透明度、外观模式
- 登录背景从本地图片/视频中随机选取（无任何网络下载）
- 完整响应式：桌面侧边栏 -> 移动端亚克力抽屉
- 与官方主题保持相同 DOM 契约，所有 LuCI 模块均可正常使用

## 目录结构

```
luci-theme-FluentDesign/
├── Makefile                                  # OpenWrt 包定义（+luci-base）
├── ucode/template/themes/fluentdesign/       # ucode 模板（.ut）
│   ├── head_meta.ut
│   ├── header.ut / footer.ut                 # 管理界面外壳（容器开闭严格配对）
│   ├── header_login.ut / footer_login.ut
│   ├── out_header_login.ut
│   └── sysauth.ut                            # 登录页
├── htdocs/luci-static/
│   ├── fluentdesign/                         # 主题媒体根目录
│   │   ├── css/cascade.css                   # 浅色 + 布局 + 组件
│   │   ├── css/dark.css                      # 深色模式覆盖
│   │   ├── icon/  (favicon.svg, apple-touch.svg, arrow.svg, manifest.json)
│   │   ├── img/   (logo.svg, login-bg.svg)
│   │   └── background/                       # 自定义登录背景放置目录
│   └── resources/
│       ├── menu-fluentdesign.js              # 菜单渲染器
│       └── view/system/fluentdesign.js(.css) # 主题设置页
├── root/etc/config/fluentdesign              # UCI 默认配置（conffile）
├── root/etc/uci-defaults/30_luci-theme-FluentDesign
├── root/usr/share/luci/menu.d/*.json         # 设置页菜单注册
├── root/usr/share/rpcd/acl.d/*.json          # UCI 读写 ACL
└── tests/                                    # 跨分支浏览器测试 harness
```

`luci.mk` 执行的安装路径映射：

| 源路径                              | 目标设备路径                         |
|-------------------------------------|---------------------------------------------|
| `ucode/**`                          | `/usr/share/ucode/luci/template/themes/fluentdesign/` |
| `htdocs/luci-static/fluentdesign/`  | `/www/luci-static/fluentdesign/`            |
| `htdocs/luci-static/resources/`     | `/www/luci-static/resources/`               |
| `root/etc/config/...`               | `/etc/config/`（conffile，升级时保留用户配置）|
| `root/etc/uci-defaults/...`         | `/etc/uci-defaults/`（安装时执行一次）       |
| `root/usr/share/{luci/menu.d,rpcd/acl.d}/...` | `/usr/share/` 下同名路径           |

## 运行要求

- 使用 ucode LuCI 技术栈的 OpenWrt（22.03 至 25.12 / SNAPSHOT）
- `luci-base`（声明为唯一包依赖）

## 兼容性

**OpenWrt / LuCI 服务端技术栈** —— 本主题使用 ucode 模板 LuCI（与官方
22.03 及之后主题同一技术栈）、标准 `luci-base` dispatcher、rpcd ACL JSON
与 `menu.d` 注册机制：

| 系统 | 状态 |
|--------|--------|
| OpenWrt 25.12.x（apk；最新稳定版，已在 25.12.5 上验证） | 支持 |
| OpenWrt 24.10.x（opkg；已验证至 24.10.x） | 支持 |
| OpenWrt 23.05、22.03 | 支持 |
| 同基线 ImmortalWrt（22.03 / 23.05 / 24.10） | 支持 |
| OpenWrt 21.02 及更早（Lua `.htm` 模板时代的 LuCI） | 不支持 |

> 说明：OpenWrt **不存在 25.10 版本**——24.10 之后的下一个稳定分支是
> 25.12（25.12.0 于 2026-03-18 发布）。无需为其单独开发分支或特殊版本：
> 设置页视图已在 openwrt-25.12 的 LuCI 核心上完成自动化测试（全部通过），
> ucode 模板与 `luci.mk` 打包契约均未发生变化。

兼容性由 CI 持续锁定：每次推送都会用 openwrt-22.03 / 23.05 / 24.10 /
25.12（必须通过）与 master（非阻塞金丝雀）分支的**真实 luci-base 核心**
执行同一套 53 项浏览器断言。

**Web 服务器** —— 完全透明，因为主题位于 LuCI 渲染层，只发布静态资源与
ucode 模板：

- **uhttpd**（默认）：开箱即用。
- **nginx**：在标准 `luci-nginx` / uwsgi 配置下即可工作，无需主题侧任何
  设置——所有 URL 都通过 `media` / `resource` /
  `dispatcher.build_url()` 生成，没有硬编码 `/cgi-bin/luci`；
  `/luci-static` 在两种服务器下都按普通静态目录提供服务。

**LuCI 页面与第三方应用** —— 所有面向标准 LuCI 布局的官方模块和第三方应用
都会在主题内正常渲染：header/footer 保持官方 DOM 契约
（`#mainmenu`、`#modemenu`、`#tabmenu`、`#maincontent > .container`、
`.showSide`、`.darkMask`），设置页仅使用公开的
`form` / `uci` / `ui` API。

**浏览器** —— 现代内核（Chrome/Edge 111+、Firefox 113+、Safari 16.2+）
获得完整体验，包括实时派生的强调色悬停/按下态与动态视口尺寸。更旧的内核
通过 `@supports` / 静态回退值优雅降级（默认 Fluent 蓝、`100vh`、控件默认
圆角）；所有功能、设置与导航均保持可用。

## 安装

### 方式一：编入固件 / 通过 feed 构建

1. 将包目录放入 buildroot 的 `package/luci-theme-fluentdesign`
   （或从自定义 feed 建立软链接）。
2. 在 `make menuconfig` -> *LuCI* -> *Themes* 中选中
   **luci-theme-FluentDesign**。
3. 编译：

   ```sh
   make package/luci-theme-fluentdesign/compile V=s
   ```

   产物 `.ipk`（25.12 等 apk 发行版为 `.apk`）位于
   `bin/packages/.../luci/` 下。

### 方式二：在运行中的路由器上安装软件包

```sh
opkg update
opkg install luci-theme-fluentdesign_*.ipk
# 基于 apk 的发行版（24.10-SNAPSHOT / 25.12）：
# apk add --allow-untrusted luci-theme-fluentdesign_*.apk
```

`uci-defaults` 脚本会注册主题并在全新安装时启用；包升级时绝不会覆盖用户
当前使用的主题。

### 方式三：直接部署文件（开发 / 快速试用）

```sh
# 模板
mkdir -p /usr/share/ucode/luci/template/themes/fluentdesign
cp -a ucode/template/themes/fluentdesign/*.ut \
      /usr/share/ucode/luci/template/themes/fluentdesign/

# 静态资源
mkdir -p /www/luci-static/fluentdesign
cp -a htdocs/luci-static/fluentdesign/* /www/luci-static/fluentdesign/
cp -a htdocs/luci-static/resources/menu-fluentdesign.js \
      /www/luci-static/resources/

# 注册并启用
uci set luci.themes.FluentDesign=/luci-static/fluentdesign
uci set luci.main.mediaurlbase=/luci-static/fluentdesign
uci commit luci
```

> **不要**修改 `luci.main.resourcebase`。核心脚本（`cbi.js`、`luci.js`）
> 独立于所选主题，固定从 `/luci-static/resources` 提供。

### 启用 / 切换主题

- 网页界面：**系统 -> 系统 -> 语言和风格 -> 设计** -> 选择
  *FluentDesign*，然后刷新页面。
- 命令行：

  ```sh
  uci set luci.main.mediaurlbase=/luci-static/fluentdesign
  uci commit luci
  /etc/init.d/rpcd reload
  ```

## 个性化配置

可在主题自带设置页 **系统 -> FluentDesign** 中配置（UCI 文件
`/etc/config/fluentdesign`，section 类型 `global`）。每个选项都是可选的，
且经过校验；非法值会被忽略并回退到 Fluent 默认值：

```sh
uci set fluentdesign.global.mode='normal'          # normal | light | dark
uci set fluentdesign.global.primary='#0078d4'      # 浅色模式强调色
uci set fluentdesign.global.dark_primary='#2899f5'  # 深色模式强调色
uci set fluentdesign.global.font_size='1'          # 全局字号比例 0.8 - 1.3
uci set fluentdesign.global.blur='30'              # 亚克力模糊半径 0 - 100 px
uci set fluentdesign.global.acrylic_opacity='0.7'  # 表面不透明度 0 - 1
uci commit fluentdesign
```

- `mode=normal` 跟随系统/浏览器的 `prefers-color-scheme`；
  `light`/`dark` 强制使用指定外观。
- `font_size` 作为根 rem 的倍数（整个界面等比缩放）。
- 颜色只接受 `#rgb` 或 `#rrggbb` 格式；非法输入会被丢弃，防止样式表注入。

### 自定义登录背景

将图片/视频放入
`/www/luci-static/fluentdesign/background/`（支持 jpg/jpeg/png/gif/webp
以及 mp4/webm）。每次访问随机选取一个；视频遵循
`prefers-reduced-motion`，默认静音播放并提供静音切换按钮。不提供在线壁纸
下载，因此不引入 `wget`/`rpcd` 依赖。

## 开发与测试

`tests/` 包含自包含的浏览器 harness，共 53 项断言（结构、分段/颜色/滑块
控件、十六进制校验、实时预览、深色样式表切换、离开清理、保存页脚）。
它可以针对任意 openwrt/luci 分支的**真实** luci-base 核心 JS 运行：

```sh
bash tests/assemble-site.sh openwrt-25.12 site
python3 tests/serve-harness.py site 8765 &
cd tests && npm install && npx playwright install chromium
node run-browser-tests.mjs http://127.0.0.1:8765/index.html
```

## 卸载

```sh
# 若主题正在使用，先切回官方主题：
uci set luci.main.mediaurlbase=/luci-static/bootstrap
uci commit luci
opkg remove luci-theme-fluentdesign
```

## 版本记录

| 版本 | 日期       | 说明                          |
|---------|------------|--------------------------------|
| 1.1.3   | 2026-10-09 | 导航图标多语言适配与桌面侧栏亚克力 |
| 1.1.2   | 2026-10-09 | 修复侧栏高度链与子菜单图标重叠 |
| 1.1.1   | 2026-10-08 | 旧浏览器 CSS 回退与兼容性矩阵 |
| 1.1.0   | 2026-10-08 | 主题设置页（UCI）             |
| 1.0.0   | 2026-10-08 | Fluent Design 首个正式版本    |

采用语义化版本；同一主版本内保持 UCI 选项兼容。

## 许可证

Apache License 2.0
