'use strict';
'require baseclass';
'require ui';

/**
 * luci-theme-FluentDesign menu module.
 *
 * DOM contract (same as the reference themes, relied upon by LuCI core):
 *   #mainmenu    -> sidebar receives the top level <ul class="nav">
 *   #modemenu    -> top mode breadcrumb
 *   #tabmenu     -> deep navigation tabs
 *   .showSide    -> mobile sidebar toggle button
 *   .darkMask    -> click-to-dismiss scrim
 *
 * All motion is capped at 200ms per the Fluent Design motion rule and
 * collapses to instant transitions under prefers-reduced-motion.
 */

var SlideAnimations = {
	duration: 180,

	getDuration: function() {
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
			return 0;
		return this.duration;
	},

	runningAnimations: new WeakMap(),

	slideDown: function(element, callback) {
		if (!element)
			return;
		this.stop(element);

		var duration = this.getDuration();

		element.style.display = 'block';
		element.style.overflow = 'hidden';
		element.style.height = '0px';
		element.style.transition = 'height ' + duration + 'ms ease-out';
		element.offsetHeight;

		var targetHeight = element.scrollHeight;
		element.style.height = targetHeight + 'px';

		var cleanup = function() {
			element.style.height = '';
			element.style.overflow = '';
			element.style.transition = '';
			this.runningAnimations.delete(element);
			if (typeof callback === 'function')
				callback.call(element);
		}.bind(this);

		var timeoutId = setTimeout(cleanup, duration);
		this.runningAnimations.set(element, { timeoutId: timeoutId, cleanup: cleanup });
	},

	slideUp: function(element, callback) {
		if (!element)
			return;
		this.stop(element);

		var duration = this.getDuration();
		var currentHeight = element.scrollHeight;

		element.style.overflow = 'hidden';
		element.style.height = currentHeight + 'px';
		element.style.transition = 'height ' + duration + 'ms ease-out';
		element.offsetHeight;
		element.style.height = '0px';

		var cleanup = function() {
			element.style.display = 'none';
			element.style.height = '';
			element.style.overflow = '';
			element.style.transition = '';
			this.runningAnimations.delete(element);
			if (typeof callback === 'function')
				callback.call(element);
		}.bind(this);

		var timeoutId = setTimeout(cleanup, duration);
		this.runningAnimations.set(element, { timeoutId: timeoutId, cleanup: cleanup });
	},

	stop: function(element) {
		if (!element)
			return;
		var animationData = this.runningAnimations.get(element);
		if (animationData) {
			clearTimeout(animationData.timeoutId);
			animationData.cleanup();
		}
		element.style.transition = '';
		element.offsetHeight;
	}
};

return baseclass.extend({
	__init__: function() {
		ui.menu.load().then(L.bind(this.render, this));
	},

	render: function(tree) {
		var node = tree;

		this.renderModeMenu(node);

		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
			}
			if (node)
				this.renderTabMenu(node, L.env.dispatchpath.slice(0, 3).join('/'));
		}

		var sidebarToggle = document.querySelector('.showSide');
		var darkMask = document.querySelector('.darkMask');

		if (sidebarToggle)
			sidebarToggle.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));
		if (darkMask)
			darkMask.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

		document.addEventListener('keydown', function(ev) {
			if (ev.key === 'Escape' && sidebarToggle && sidebarToggle.classList.contains('active')) {
				sidebarToggle.click();
				sidebarToggle.focus();
			}
		});
	},

	handleMenuExpand: function(ev) {
		var target = ev.target;
		var slideMenu = target.nextElementSibling;
		var shouldCollapse = false;

		var activeMenus = document.querySelectorAll('.main .main-left .nav > li > ul.active');
		activeMenus.forEach(function(ul) {
			SlideAnimations.stop(ul);
			ul.classList.remove('active');
			ul.previousElementSibling.classList.remove('active');
			SlideAnimations.slideUp(ul);
			if (ul === slideMenu)
				shouldCollapse = true;
		});

		if (!slideMenu)
			return;

		if (!shouldCollapse) {
			slideMenu.classList.add('active');
			target.classList.add('active');
			SlideAnimations.slideDown(slideMenu);
			target.blur();
		}

		ev.preventDefault();
		ev.stopPropagation();
	},

	renderMainMenu: function(tree, url, level) {
		var currentLevel = (level || 0) + 1;
		var menuContainer = E('ul', { 'class': level ? 'slide-menu' : 'nav' });
		var children = ui.menu.getChildren(tree);

		if (children.length === 0 || currentLevel > 2)
			return E([]);

		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var isActive = (
				(L.env.dispatchpath[currentLevel] === child.name) &&
				(L.env.dispatchpath[currentLevel - 1] === tree.name)
			);

			var submenu = this.renderMainMenu(child, url + '/' + child.name, currentLevel);
			var hasChildren = submenu.children.length > 0;

			var slideClass = hasChildren ? 'slide' : null;
			// The .menu/.food classes carry the leading mask icon and the
			// chevron via CSS descendant selectors, so they are top-level
			// only: on submenu links the absolutely positioned ::before
			// would overlap the first character.
			var linkClasses = [];
			if (currentLevel === 1)
				linkClasses.push(hasChildren ? 'menu' : 'food');
			if (isActive) {
				menuContainer.classList.add('active');
				if (slideClass)
					slideClass += ' active';
				linkClasses.push('active');
			}
			var menuClass = linkClasses.length ? linkClasses.join(' ') : null;

			var anchorAttrs = {
				'href': L.url(url, child.name),
				'click': (currentLevel === 1) ? ui.createHandlerFn(this, 'handleMenuExpand') : null,
				'class': menuClass,
				'data-title': child.title.replace(/ /g, '_')
			};
			// Icons are keyed by the stable dispatcher node name, not the
			// translated title, so localized builds get correct icons.
			if (currentLevel === 1 && child.name)
				anchorAttrs['data-nav'] = String(child.name).toLowerCase();

			menuContainer.appendChild(E('li', { 'class': slideClass }, [
				E('a', anchorAttrs, [_(child.title)]),
				submenu
			]));
		}

		if (currentLevel === 1) {
			var mainMenuElement = document.querySelector('#mainmenu');
			if (mainMenuElement) {
				mainMenuElement.appendChild(menuContainer);
				mainMenuElement.style.display = '';
			}
		}

		return menuContainer;
	},

	renderModeMenu: function(tree) {
		var menu = document.querySelector('#modemenu');
		var children = ui.menu.getChildren(tree);

		for (var i = 0; i < children.length; i++) {
			var isActive = (L.env.requestpath.length ? children[i].name == L.env.requestpath[0] : i == 0);
			if (i > 0)
				menu.appendChild(E([], ['\u00a0|\u00a0']));
			menu.appendChild(E('li', {}, [
				E('a', {
					'href': L.url(children[i].name),
					'class': isActive ? 'active' : null
				}, [_(children[i].title)])
			]));
			if (isActive)
				this.renderMainMenu(children[i], children[i].name);
		}
		if (menu.children.length > 1)
			menu.style.display = '';
	},

	renderTabMenu: function(tree, url, level) {
		var container = document.querySelector('#tabmenu');
		var currentLevel = (level || 0) + 1;
		var tabContainer = E('ul', { 'class': 'tabs' });
		var children = ui.menu.getChildren(tree);
		var activeNode = null;

		if (children.length === 0)
			return E([]);

		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var isActive = (L.env.dispatchpath[currentLevel + 2] === child.name);
			var activeClass = isActive ? ' active' : '';

			tabContainer.appendChild(E('li', {
				'class': 'tabmenu-item-%s%s'.format(child.name, activeClass)
			}, [
				E('a', { 'href': L.url(url, child.name) }, [_(child.title)])
			]));

			if (isActive)
				activeNode = child;
		}

		if (container) {
			container.appendChild(tabContainer);
			container.style.display = '';

			if (activeNode)
				this.renderTabMenu(activeNode, url + '/' + activeNode.name, currentLevel);
		}

		return tabContainer;
	},

	handleSidebarToggle: function() {
		var showSideButton = document.querySelector('.showSide');
		var sidebar = document.querySelector('#mainmenu');
		var darkMask = document.querySelector('.darkMask');
		var scrollbarArea = document.querySelector('.main-right');

		if (!showSideButton || !sidebar || !darkMask || !scrollbarArea)
			return;

		if (showSideButton.classList.contains('active')) {
			showSideButton.classList.remove('active');
			showSideButton.setAttribute('aria-expanded', 'false');
			sidebar.classList.remove('active');
			scrollbarArea.classList.remove('active');
			darkMask.classList.remove('active');
		} else {
			showSideButton.classList.add('active');
			showSideButton.setAttribute('aria-expanded', 'true');
			sidebar.classList.add('active');
			scrollbarArea.classList.add('active');
			darkMask.classList.add('active');
		}
	}
});
