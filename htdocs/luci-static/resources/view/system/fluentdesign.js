/**
 * luci-theme-FluentDesign - theme settings view
 *
 * Reads/writes /etc/config/fluentdesign (UCI config "fluentdesign",
 * one section of type "global") through the standard form.Map flow,
 * so Save / Save & Apply / Reset and ACL handling are provided by the
 * LuCI view base class.
 *
 * Permission: rpcd ACL group "luci-theme-fluentdesign" (read+write uci).
 *
 * NOTE: everything used by the view MUST be declared before the
 * `return view.extend({ ... })` statement - it is the factory's return
 * value, so any code below it never executes.
 */

'use strict';
'require view';
'require form';
'require uci';

/* ==========================================================================
 * Constants & helpers
 * ========================================================================== */

var CONF = 'fluentdesign';

var CSS_VIEW_ID = 'fd-settings-view-css';
var CSS_DARK_MANAGED_ID = 'fd-dark-managed';

var HEX_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

var PRESETS_LIGHT = [ '#0078d4', '#038387', '#107c10', '#5c2d91', '#ca5010', '#e81123', '#323130' ];
var PRESETS_DARK  = [ '#2899f5', '#4cc2ff', '#6bb700', '#c58af9', '#fce100', '#ff5263', '#c8c6c4' ];

function notifyChange(node) {
	node.dispatchEvent(new CustomEvent('widget-change', { bubbles: true }));
}

function isReadonly(opt) {
	return (opt.readonly != null) ? opt.readonly : opt.map.readonly;
}

function normalizeHex(v) {
	v = String(v == null ? '' : v).trim();
	if (!HEX_RE.test(v))
		return null;
	if (v.length === 4)
		v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
	return v.toLowerCase();
}

function makeHexValidator() {
	return function(section_id, value) {
		return HEX_RE.test(value) ? true : _('请输入 #RGB 或 #RRGGBB 格式的颜色值');
	};
}

/* ==========================================================================
 * Custom widgets
 * ========================================================================== */

/* ---- segmented appearance selector ---- */

function modeIcon(name) {
	var svg = E('svg', {
		'viewBox': '0 0 20 20',
		'fill': 'none',
		'aria-hidden': 'true'
	});

	if (name === 'sun') {
		svg.appendChild(E('circle', {
			'cx': 10, 'cy': 10, 'r': 3.4,
			'stroke': 'currentColor', 'stroke-width': 1.4
		}));
		svg.appendChild(E('path', {
			'd': 'M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7L14 6M6 14l-1.3 1.3',
			'stroke': 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round'
		}));
	} else if (name === 'moon') {
		svg.appendChild(E('path', {
			'd': 'M15.6 11.4A6 6 0 0 1 8.6 4.4a6 6 0 1 0 7 7z',
			'stroke': 'currentColor', 'stroke-width': 1.4, 'stroke-linejoin': 'round'
		}));
	} else {
		svg.appendChild(E('rect', {
			'x': 2.5, 'y': 4, 'width': 15, 'height': 10, 'rx': 1.5,
			'stroke': 'currentColor', 'stroke-width': 1.4
		}));
		svg.appendChild(E('path', {
			'd': 'M7 17h6M10 14.2V17',
			'stroke': 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round'
		}));
	}

	return svg;
}

var ModeSegmented = form.Value.extend({
	__name__: 'FluentDesign.ModeSegmented',

	choices: [
		[ 'normal', _('跟随系统'), 'monitor' ],
		[ 'light',  _('浅色'),     'sun' ],
		[ 'dark',   _('深色'),     'moon' ]
	],

	renderWidget: function(section_id, option_index, cfgvalue) {
		var current = (cfgvalue != null) ? cfgvalue : this.default;
		var ro = isReadonly(this);
		var root = E('div', {
			'id': this.cbid(section_id),
			'class': 'fd-segmented',
			'role': 'radiogroup',
			'aria-label': _('配色模式'),
			'data-value': current
		});

		this.choices.forEach(function(choice) {
			var value = choice[0], label = choice[1], icon = choice[2];
			var active = (value === current);

			var btn = E('button', {
				'type': 'button',
				'role': 'radio',
				'class': active ? 'active' : null,
				'aria-checked': active ? 'true' : 'false',
				'disabled': ro || null
			}, [ modeIcon(icon), E('span', {}, label) ]);

			btn.addEventListener('click', function() {
				root.setAttribute('data-value', value);
				root.querySelectorAll('button').forEach(function(b) {
					var on = (b === btn);
					b.classList.toggle('active', on);
					b.setAttribute('aria-checked', on ? 'true' : 'false');
				});
				notifyChange(root);
			});

			root.appendChild(btn);
		});

		return root;
	},

	formvalue: function(section_id) {
		return document.getElementById(this.cbid(section_id)).getAttribute('data-value');
	}
});

/* ---- color value: picker + hex input + preset swatches ---- */

var ColorValue = form.Value.extend({
	__name__: 'FluentDesign.ColorValue',

	presets: null,

	renderWidget: function(section_id, option_index, cfgvalue) {
		var current = normalizeHex(cfgvalue != null ? cfgvalue : this.default) || '#0078d4';
		var ro = isReadonly(this);

		var root = E('div', {
			'id': this.cbid(section_id),
			'class': 'fd-color',
			'data-value': current
		});

		var picker = E('input', {
			'type': 'color',
			'value': current,
			'disabled': ro || null,
			'aria-label': _('打开取色器')
		});
		var swatch = E('label', {
			'class': 'fd-swatch',
			'title': _('打开取色器'),
			'style': '--swatch:%s'.format(current)
		}, [ picker ]);

		var hexInput = E('input', {
			'type': 'text',
			'class': 'fd-hex-input',
			'maxlength': 7,
			'spellcheck': 'false',
			'autocomplete': 'off',
			'value': current.toUpperCase(),
			'aria-invalid': 'false',
			'disabled': ro || null
		});
		var hexError = E('span', { 'class': 'fd-hex-error' }, _('请输入 #RGB 或 #RRGGBB 格式'));
		var hexBox = E('div', { 'class': 'fd-hex' }, [ hexInput, hexError ]);

		function commit(v) {
			v = normalizeHex(v);
			if (!v)
				return false;
			root.setAttribute('data-value', v);
			swatch.style.setProperty('--swatch', v);
			picker.value = v;
			hexInput.value = v.toUpperCase();
			hexInput.setAttribute('aria-invalid', 'false');
			presetBox.querySelectorAll('.fd-preset').forEach(function(b) {
				b.setAttribute('aria-pressed', b.dataset.color === v ? 'true' : 'false');
			});
			notifyChange(root);
			return true;
		}

		picker.addEventListener('input', function() {
			commit(picker.value);
		});

		hexInput.addEventListener('input', function() {
			var v = hexInput.value.trim();
			if (v === '')
				return;
			if (HEX_RE.test(v))
				commit(v);
			else
				hexInput.setAttribute('aria-invalid', 'true');
		});

		var presetBox = E('div', {
			'class': 'fd-presets',
			'role': 'group',
			'aria-label': _('预设颜色')
		});

		(this.presets || []).forEach(function(color) {
			var b = E('button', {
				'type': 'button',
				'class': 'fd-preset',
				'style': '--c:%s'.format(color),
				'data-color': color,
				'title': color,
				'aria-label': _('预设色 %s').format(color),
				'aria-pressed': (color === current) ? 'true' : 'false',
				'disabled': ro || null
			});
			b.addEventListener('click', function() {
				commit(color);
			});
			presetBox.appendChild(b);
		});

		root.appendChild(swatch);
		root.appendChild(hexBox);
		root.appendChild(presetBox);

		return root;
	},

	formvalue: function(section_id) {
		return document.getElementById(this.cbid(section_id)).getAttribute('data-value');
	}
});

/* ---- numeric slider ---- */

var SliderValue = form.Value.extend({
	__name__: 'FluentDesign.SliderValue',

	min: 0,
	max: 100,
	step: 1,
	fmt: null,

	renderWidget: function(section_id, option_index, cfgvalue) {
		var v = parseFloat(cfgvalue != null ? cfgvalue : this.default);
		var ro = isReadonly(this);

		if (isNaN(v))
			v = this.min;
		v = Math.min(this.max, Math.max(this.min, v));

		var fill = ((v - this.min) / (this.max - this.min) * 100) + '%';
		var label = E('span', { 'class': 'fd-slider-value' },
			this.fmt ? this.fmt(v) : String(v));

		var range = E('input', {
			'type': 'range',
			'min': String(this.min),
			'max': String(this.max),
			'step': String(this.step),
			'value': String(v),
			'disabled': ro || null,
			'aria-label': this.title || '',
			'style': '--fill:%s'.format(fill)
		});

		var root = E('div', {
			'id': this.cbid(section_id),
			'class': 'fd-slider',
			'data-value': String(v)
		}, [ range, label ]);

		range.addEventListener('input', function() {
			var n = parseFloat(range.value);
			root.setAttribute('data-value', String(n));
			range.style.setProperty('--fill',
				((n - this.min) / (this.max - this.min) * 100) + '%');
			label.textContent = this.fmt ? this.fmt(n) : String(n);
			notifyChange(root);
		}.bind(this));

		return root;
	},

	formvalue: function(section_id) {
		return document.getElementById(this.cbid(section_id)).getAttribute('data-value');
	}
});

/* ---- read-only background info panel ---- */

function renderBackgroundInfo(section_id, option_index, cfgvalue) {
	return E([], [
		E('div', { 'class': 'fd-bgpath' }, [
			E('svg', {
				'width': 15, 'height': 15, 'viewBox': '0 0 20 20', 'fill': 'none',
				'aria-hidden': 'true'
			}, [
				E('path', {
					'd': 'M3 6.5A1.5 1.5 0 0 1 4.5 5h2.4l1.2 1.6h6.4A1.5 1.5 0 0 1 16 8.1v5.4a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 13.5z',
					'stroke': 'currentColor', 'stroke-width': 1.4, 'stroke-linejoin': 'round'
				})
			]),
			E('span', {}, '/www/luci-static/fluentdesign/background/')
		]),
		E('div', { 'class': 'fd-legend' }, [
			E('span', {}, [
				_('图片：'),
				E('code', {}, 'jpg'), ' ',
				E('code', {}, 'jpeg'), ' ',
				E('code', {}, 'png'), ' ',
				E('code', {}, 'gif'), ' ',
				E('code', {}, 'webp')
			]),
			E('span', {}, [
				_('视频：'),
				E('code', {}, 'mp4'), ' ',
				E('code', {}, 'webm')
			])
		]),
		E('p', { 'class': 'fd-bgnote' },
			_('通过 SCP / SFTP 上传到此目录，子目录与其他类型文件会被忽略。视频默认静音播放（可在登录页手动开声），并遵循系统「减少动态效果」设置自动暂停。'))
	]);
}

/* ==========================================================================
 * View
 * ========================================================================== */

return view.extend({

	/* live-preview state */
	previewSid: null,
	darkMQ: window.matchMedia('(prefers-color-scheme: dark)'),
	mqBound: false,
	originalSheet: null,

	/* ----- UCI loading ----- */

	load: function() {
		return uci.load(CONF).then(function() {
			/* Make sure the singleton global section exists so that
			 * TypedSection renders even on a hand-deleted config file. */
			if (uci.sections(CONF, 'global').length === 0)
				uci.add(CONF, 'global');
		}.bind(this));
	},

	/* ----- rendering ----- */

	render: function() {
		this.ensureAssets();
		this.bindMq();

		var self = this;
		var m = new form.Map(CONF,
			_('FluentDesign 主题设置'),
			_('个性化 FluentDesign 主题界面。更改在当前页面即时预览，点击「保存并应用」后写入路由器配置。'));

		/* Card 1: appearance mode */
		var s1 = m.section(form.TypedSection, 'global',
			_('外观模式'),
			_('选择界面的明暗配色。「跟随系统」会根据浏览器或操作系统的外观偏好自动切换。'));
		s1.anonymous = true;
		s1.addremove = false;

		var oMode = s1.option(ModeSegmented, 'mode',
			_('配色模式'),
			_('normal：跟随系统；light：始终浅色；dark：始终深色'));
		oMode.default = 'normal';
		oMode.onchange = function(ev, section_id) { self.syncPreview(section_id); };

		/* Card 2: accent colors */
		var s2 = m.section(form.TypedSection, 'global',
			_('个性化颜色'),
			_('设置按钮、链接、选中态等强调色。悬停、按下与浅色底色由主题根据强调色自动派生。'));
		s2.anonymous = true;
		s2.addremove = false;

		var oPrimary = s2.option(ColorValue, 'primary',
			_('浅色模式强调色'),
			_('仅接受 #RGB 或 #RRGGBB 格式，默认 #0078D4'));
		oPrimary.default = '#0078d4';
		oPrimary.presets = PRESETS_LIGHT;
		oPrimary.validate = makeHexValidator();
		oPrimary.onchange = function(ev, section_id) { self.syncPreview(section_id); };

		var oDarkPrimary = s2.option(ColorValue, 'dark_primary',
			_('深色模式强调色'),
			_('暗色表面上使用的强调色，默认 #2899F5'));
		oDarkPrimary.default = '#2899f5';
		oDarkPrimary.presets = PRESETS_DARK;
		oDarkPrimary.validate = makeHexValidator();
		oDarkPrimary.onchange = function(ev, section_id) { self.syncPreview(section_id); };

		/* Card 3: typography & acrylic */
		var s3 = m.section(form.TypedSection, 'global',
			_('显示与材质'),
			_('全局字号按比例缩放整个界面；亚克力参数作用于顶栏、侧栏（含桌面与移动端）与登录卡片。'));
		s3.anonymous = true;
		s3.addremove = false;

		var oFont = s3.option(SliderValue, 'font_size',
			_('全局字号'),
			_('范围 0.8 – 1.3，默认 1.0'));
		oFont.default = '1';
		oFont.min = 0.8; oFont.max = 1.3; oFont.step = 0.05;
		oFont.fmt = function(v) { return Math.round(v * 100) + '%'; };
		oFont.onchange = function(ev, section_id) { self.syncPreview(section_id); };

		var oBlur = s3.option(SliderValue, 'blur',
			_('亚克力模糊'),
			_('范围 0 – 100 像素，默认 30'));
		oBlur.default = '30';
		oBlur.min = 0; oBlur.max = 100; oBlur.step = 1;
		oBlur.fmt = function(v) { return Math.round(v) + ' px'; };
		oBlur.onchange = function(ev, section_id) { self.syncPreview(section_id); };

		var oOpacity = s3.option(SliderValue, 'acrylic_opacity',
			_('亚克力不透明度'),
			_('范围 0 – 1，默认 0.7'));
		oOpacity.default = '0.7';
		oOpacity.min = 0; oOpacity.max = 1; oOpacity.step = 0.02;
		oOpacity.fmt = function(v) { return Math.round(v * 100) + '%'; };
		oOpacity.onchange = function(ev, section_id) { self.syncPreview(section_id); };

		/* Card 4: login background info (no fs listing - needs file ACL) */
		var s4 = m.section(form.TypedSection, 'global',
			_('登录背景'),
			_('将图片或视频放入以下目录，登录页每次访问随机选取其一；目录为空时使用内置 Fluent 蓝色渐变背景。'));
		s4.anonymous = true;
		s4.addremove = false;

		var oBg = s4.option(form.DummyValue, 'background_info', _('背景目录'));
		oBg.renderWidget = renderBackgroundInfo;

		return m.render().then(function(node) {
			self.watchTeardown(node);
			return node;
		});
	},

	/* ----- assets & live preview ----- */

	ensureAssets: function() {
		if (!document.getElementById(CSS_VIEW_ID)) {
			document.head.appendChild(E('link', {
				'id': CSS_VIEW_ID,
				'rel': 'stylesheet',
				'href': L.resource('view/system/fluentdesign.css')
			}));
		}

		var sheet = this.findDarkSheet();
		if (!sheet) {
			/* UCI mode == "light": header.ut omits dark.css entirely;
			 * inject a managed copy so dark preview still works. */
			var cascade = this.findCascadeSheet();
			var href = cascade
				? cascade.getAttribute('href').replace(/cascade\.css(\?.*)?$/, 'dark.css')
				: '/luci-static/fluentdesign/css/dark.css';

			sheet = E('link', {
				'id': CSS_DARK_MANAGED_ID,
				'rel': 'stylesheet',
				'href': href,
				'media': 'all'
			});
			sheet.disabled = true;
			document.head.appendChild(sheet);
			this.originalSheet = { node: sheet, managed: true };
		} else if (!this.originalSheet) {
			this.originalSheet = {
				node: sheet,
				managed: false,
				media: sheet.media || '',
				disabled: !!sheet.disabled
			};
		}
	},

	findDarkSheet: function() {
		var links = document.querySelectorAll('link[rel="stylesheet"]');
		for (var i = 0; i < links.length; i++)
			if (/\/fluentdesign\/css\/dark\.css(\?.*)?$/.test(links[i].getAttribute('href') || ''))
				return links[i];
		return null;
	},

	findCascadeSheet: function() {
		var links = document.querySelectorAll('link[rel="stylesheet"]');
		for (var i = 0; i < links.length; i++)
			if (/\/fluentdesign\/css\/cascade\.css(\?.*)?$/.test(links[i].getAttribute('href') || ''))
				return links[i];
		return null;
	},

	syncPreview: function(sid) {
		this.previewSid = sid;

		var mode = this.readValue(sid, 'mode') || 'normal';
		var sheet = this.findDarkSheet();

		if (sheet) {
			if (mode === 'light') {
				sheet.disabled = true;
				sheet.media = 'all';
			} else if (mode === 'dark') {
				sheet.disabled = false;
				sheet.media = 'all';
			} else {
				sheet.disabled = false;
				sheet.media = '(prefers-color-scheme: dark)';
			}
		}

		var dark = (mode === 'dark') || (mode === 'normal' && this.darkMQ.matches);
		var accent = this.readValue(sid, dark ? 'dark_primary' : 'primary')
			|| (dark ? '#2899f5' : '#0078d4');
		var fontScale = this.readValue(sid, 'font_size');
		var blur = this.readValue(sid, 'blur');
		var opacity = this.readValue(sid, 'acrylic_opacity');

		var rootStyle = document.documentElement.style;
		rootStyle.setProperty('--primary', accent);
		if (fontScale !== null)
			rootStyle.setProperty('--font-scale', fontScale);
		if (blur !== null)
			rootStyle.setProperty('--acrylic-blur', blur + 'px');
		if (opacity !== null)
			rootStyle.setProperty('--acrylic-opacity', opacity);
	},

	readValue: function(sid, option) {
		var node = document.getElementById('cbid.%s.%s.%s'.format(CONF, sid, option));
		return node ? node.getAttribute('data-value') : null;
	},

	bindMq: function() {
		if (this.mqBound)
			return;
		this.mqBound = true;
		var self = this;
		var onChange = function() {
			if (self.previewSid)
				self.syncPreview(self.previewSid);
		};
		if (this.darkMQ.addEventListener)
			this.darkMQ.addEventListener('change', onChange);
		else if (this.darkMQ.addListener)
			this.darkMQ.addListener(onChange);
	},

	/* Restore everything the preview touched when navigating away.
	 * The view base has no unload hook, so observe the rendered node. */
	watchTeardown: function(sentinel) {
		var self = this;
		var view = document.getElementById('view');
		if (!view || !sentinel || !sentinel.nodeType)
			return;

		var observer = new MutationObserver(function() {
			if (!document.body.contains(sentinel)) {
				observer.disconnect();
				self.teardownPreview();
			}
		});
		observer.observe(view, { childList: true, subtree: true });
	},

	teardownPreview: function() {
		var rootStyle = document.documentElement.style;
		rootStyle.removeProperty('--primary');
		rootStyle.removeProperty('--font-scale');
		rootStyle.removeProperty('--acrylic-blur');
		rootStyle.removeProperty('--acrylic-opacity');

		var managed = document.getElementById(CSS_DARK_MANAGED_ID);
		if (managed)
			managed.parentNode.removeChild(managed);
		else if (this.originalSheet && !this.originalSheet.managed) {
			this.originalSheet.node.media = this.originalSheet.media;
			this.originalSheet.node.disabled = this.originalSheet.disabled;
		}
		this.originalSheet = null;
		this.previewSid = null;

		var viewCss = document.getElementById(CSS_VIEW_ID);
		if (viewCss)
			viewCss.parentNode.removeChild(viewCss);
	}
});
