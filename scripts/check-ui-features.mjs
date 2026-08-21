import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const read = (path) =>
	readFileSync(resolve(path), 'utf8').replace(/\r\n/g, '\n');
const readLessWithImports = (path, seen = new Set()) => {
	const absolutePath = resolve(path);
	if (seen.has(absolutePath)) {
		return '';
	}

	seen.add(absolutePath);

	return readFileSync(absolutePath, 'utf8').replace(
		/@import\s+"([^"]+)";/g,
		(_match, importPath) =>
			readLessWithImports(resolve(dirname(absolutePath), importPath), seen),
	);
};
const assertIncludes = (source, needle, label) => {
	if (!source.includes(needle)) {
		throw new Error(`${label} should include ${needle}`);
	}
};
const assertNotIncludes = (source, needle, label) => {
	if (source.includes(needle)) {
		throw new Error(`${label} should not include ${needle}`);
	}
};
const getRuleBlock = (source, selector, label) => {
	const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const block = source.match(
		new RegExp(`${escapedSelector}\\s*\\{(?<block>[\\s\\S]*?)\\n[\\t ]*\\}`),
	)?.groups?.block;
	if (!block) {
		throw new Error(`${label} should define ${selector}`);
	}
	return block;
};

const skin = JSON.parse(read('skin.json'));
if (skin.config.WhaleEnableMobileFloatingToc !== true) {
	throw new Error(
		'Mobile floating TOC should be enabled by default in config.',
	);
}

if (skin.DefaultUserOptions['whale-layout-mobile-toc'] !== true) {
	throw new Error(
		'Mobile floating TOC should be enabled by default for users.',
	);
}

if (skin.config.WhaleAvatarStyle !== 'identicon') {
	throw new Error('DiceBear avatar style should default to identicon.');
}

if (skin.Hooks.BeforePageDisplay !== 'WhaleHooks::onBeforePageDisplay') {
	throw new Error('Whale client modules should load from BeforePageDisplay.');
}

if (
	typeof skin.config.WhaleAvatarOptions !== 'object' ||
	skin.config.WhaleAvatarOptions === null ||
	Array.isArray(skin.config.WhaleAvatarOptions)
) {
	throw new Error('DiceBear avatar options should default to an object.');
}

const removedAvatarConfigKeys = [
	['WhaleAvatar', 'Endpoint'].join(''),
	['WhaleUse', 'Grav', 'atar'].join(''),
];
if (removedAvatarConfigKeys.some((key) => key in skin.config)) {
	throw new Error('Avatar config should not depend on external avatar APIs.');
}

if (skin.AutoloadClasses.WhaleAvatar !== 'WhaleAvatar.php') {
	throw new Error(
		'WhaleAvatar should be registered for MediaWiki autoloading.',
	);
}

for (const locale of ['en', 'ja', 'ko', 'zh-hans', 'zh-hant']) {
	const messages = JSON.parse(read(`i18n/${locale}.json`));
	for (const key of [
		'whale-pref-layout-mobile-toc',
		'whale-pref-layout-mobile-toc-help',
		'whale-reference-title',
		'whale-reference-title-numbered',
		'whale-reference-jump',
		'whale-code-copy',
		'whale-code-copied',
		'whale-code-copy-failed',
	]) {
		if (!messages[key]) {
			throw new Error(`${locale} should define ${key}.`);
		}
	}
}

const indexButton = read('js/index-button.js');
const articleDecorator = read('WhaleArticleDecorator.php');
assertIncludes(indexButton, 'whale:toggleFloatingToc', 'Floating TOC script');
assertIncludes(indexButton, 'MOBILE_SWIPE_DISTANCE_PX', 'Floating TOC script');
assertIncludes(indexButton, 'MOBILE_EDGE_SWIPE_PX = 64', 'Floating TOC script');
assertIncludes(
	indexButton,
	"event.pointerType === 'mouse'",
	'Floating TOC script',
);
assertIncludes(
	indexButton,
	'getFloatingTocItemsFromHeadings',
	'Floating TOC script',
);
assertIncludes(
	articleDecorator,
	'decorateHeadingNumbers',
	'Section numbers should be rendered server-side',
);
assertIncludes(
	articleDecorator,
	'whale-heading-number',
	'Section numbers should be rendered server-side',
);
assertIncludes(
	articleDecorator,
	'decorateHeadingAnchors',
	'Heading copy anchors should be rendered server-side',
);
assertIncludes(
	articleDecorator,
	'whale-heading-anchor',
	'Heading copy anchors should be rendered server-side',
);
if (indexButton.includes('removeHeadingNumbers')) {
	throw new Error(
		'Floating TOC script should not recreate SSR heading numbers.',
	);
}
if (indexButton.includes('whale-floating-toc-toolbar-hover')) {
	throw new Error(
		'Floating TOC script should not keep legacy toolbar hover state.',
	);
}
assertIncludes(
	indexButton,
	"item.classList.toggle('is-active'",
	'Floating TOC active dot state',
);

const layout = read('js/layout.js');
const delayScrolling = read('js/delay-scrolling.js');
const referenceModal = read('js/reference-modal.js');
const codeCopy = read('js/code-copy.js');
assertIncludes(layout, 'whale:toggleFloatingToc', 'Layout scroll TOC handler');
assertIncludes(layout, 'container?.classList.toggle', 'Section folding state');
assertIncludes(layout, 'folding?.classList.toggle', 'Folding block state');
assertIncludes(layout, 'initContentSkeleton', 'Content skeleton state');
assertIncludes(layout, 'handleDirectToggle', 'Mobile direct section toggle');
assertIncludes(layout, 'getHeadingToggle', 'Heading click section toggle');
assertIncludes(
	layout,
	'--whale-modal-scrollbar-offset',
	'Modal scrollbar compensation',
);
assertIncludes(layout, 'whale:closeModal', 'Programmatic modal close');
assertIncludes(
	layout,
	'[data-whale-modal-autofocus]',
	'Explicit modal focus target',
);
assertNotIncludes(
	delayScrolling,
	'.reference > a',
	'Legacy reference scroll interception',
);
assertIncludes(referenceModal, '.reference, .mw-ref', 'Reference link support');
assertIncludes(
	referenceModal,
	'.reference-text, .mw-reference-text',
	'Reference content support',
);
assertIncludes(
	referenceModal,
	'restoreFocus: false',
	'Reference list jump focus behavior',
);
assertIncludes(codeCopy, 'whale.copyText', 'Code block copy action');
assertIncludes(
	codeCopy,
	"mw.hook?.('wikipage.content')",
	'Dynamic code blocks',
);
assertIncludes(
	codeCopy,
	"pre.dataset.whaleCodeCopyReady = 'true'",
	'Idempotent code block controls',
);

const liveRecent = read('js/live-recent.js');
assertIncludes(
	liveRecent,
	'live-recent-no-data-text',
	'Live recent empty state',
);
assertIncludes(
	liveRecent,
	'live-recent-no-data-visual',
	'Decorative live recent empty state',
);
assertIncludes(
	liveRecent,
	'SKELETON_ROW_LIMIT = 3',
	'Bounded live recent skeleton height',
);

const skinPhp = read('SkinWhale.php');
assertIncludes(
	skinPhp,
	'LEGACY_DEFAULT_THEME_COLORS',
	'Legacy default palette migration',
);
assertIncludes(
	skinPhp,
	"'primary' => '#00BCD4'",
	'Legacy primary palette migration',
);
assertIncludes(
	skinPhp,
	"'secondary' => '#FFA500'",
	'Legacy secondary palette migration',
);
assertIncludes(
	skinPhp,
	'$usesLegacyDefaultPalette',
	'Legacy palette detection',
);
assertIncludes(
	skinPhp,
	'$this->getContrastColor( $mainColor )',
	'Dynamic primary action contrast',
);
assertIncludes(
	skinPhp,
	'--whale-main-contrast-color: $mainContrastColor',
	'Light primary action contrast token',
);
assertIncludes(
	skinPhp,
	'--whale-main-contrast-color: $darkMainContrastColor',
	'Dark primary action contrast token',
);
assertIncludes(
	skinPhp,
	"addMeta( 'color-scheme', 'light dark' )",
	'Color scheme meta',
);
if (skinPhp.includes("addMeta( 'viewport'")) {
	throw new Error('Whale should rely on MediaWiki viewport metadata.');
}
if (skinPhp.includes('maximum-scale=1')) {
	throw new Error('Viewport meta should not disable user zoom.');
}
assertIncludes(
	skinPhp,
	'disableRocketLoaderForScripts( (string)$scriptsHtml )',
	'Rocket Loader bypass for MediaWiki scripts',
);
assertIncludes(
	skinPhp,
	"method_exists( $scriptsHtml, '__toString' )",
	'Rocket Loader bypass for MediaWiki script fragments',
);
assertIncludes(
	skinPhp,
	`'<script data-cfasync="false"'`,
	'Rocket Loader bypass attribute',
);
assertIncludes(
	read('js/recovery.js'),
	'scripts.forEach((script) => {',
	'Race-free ResourceLoader recovery',
);

const styles = readLessWithImports('less/default.less');
const wikiStyles = read('less/wiki.less');
const tableStyles = read('less/wiki-table.less');
const mediaWikiStyles = read('less/only-mw.less');
const buttonStyles = read('less/whale/buttons.less');
const dropdownStyles = read('less/whale/dropdown.less');
const contentStyles = read('less/whale/content.less');
const responsiveStyles = read('less/whale/integrations-responsive.less');
const printStyles = read('less/print.less');
const bottomToolsStyles = read('less/whale/bottom-tools.less');
const liveRecentStyles = read('less/whale/live-recent.less');
const editorStyles = read('less/wikiedittor-whale.less');
assertNotIncludes(
	mediaWikiStyles,
	'.whale-content-main button:not(.whale-btn)',
	'Native article control styling should not override component buttons',
);
assertIncludes(
	mediaWikiStyles,
	':not(.oo-ui-buttonElement-button):not([class*="cdx-"]):not([class*="ve-ui-"]):not(.mw-ui-button)',
	'Native article controls should preserve editor component styling',
);
assertIncludes(
	mediaWikiStyles,
	':not(.mw-ui-button):not(:disabled):hover',
	'Native article control hover state should exclude disabled controls',
);
assertIncludes(
	mediaWikiStyles,
	'opacity: 0.65',
	'Native article control disabled affordance',
);
const liveRecentHeaderBlock = getRuleBlock(
	liveRecentStyles,
	'.Whale .content-wrapper .live-recent-tab',
	'Live recent tabs',
);
assertIncludes(
	liveRecentHeaderBlock,
	'min-height: 2.75rem',
	'Comfortable live recent tabs',
);
assertIncludes(
	liveRecentHeaderBlock,
	'border-bottom: 0',
	'Attached live recent tabs',
);
assertIncludes(liveRecentStyles, '[hidden]', 'Inactive live recent tab panel');
assertIncludes(
	read('templates/LiveRecent.mustache'),
	'role="tablist"',
	'Accessible live recent tabs',
);
assertNotIncludes(
	read('WhaleRenderer.php').slice(
		read('WhaleRenderer.php').indexOf("'html-more-link'"),
		read('WhaleRenderer.php').indexOf("'html-more-link'") + 500,
	),
	'whale-sr-only',
	'Visible live recent more label',
);
assertIncludes(
	liveRecentStyles,
	'live-recent-no-data-visual',
	'Decorative live recent empty state styles',
);
assertIncludes(
	liveRecentStyles,
	'border-bottom: 0',
	'Undivided live recent empty state',
);
assertIncludes(styles, 'color-scheme: light dark', 'Stylesheet');
assertIncludes(styles, 'body.whale-dark,', 'Stylesheet');
assertIncludes(
	styles,
	'.Whale .whale-reading-progress',
	'Reading progress indicator',
);
const readingProgressBlock = styles.match(
	/\.Whale \.whale-reading-progress\s*\{(?<block>[\s\S]*?)\n\}/,
)?.groups?.block;
if (!readingProgressBlock || /display:\s*none/.test(readingProgressBlock)) {
	throw new Error('Reading progress indicator should remain visible.');
}
assertIncludes(readingProgressBlock, 'bottom: 0', 'Bottom progress fallback');
assertIncludes(
	readingProgressBlock,
	'bottom: env(safe-area-inset-bottom)',
	'Bottom progress safe area',
);
assertIncludes(readingProgressBlock, 'right: 0', 'Progress inline fallback');
assertIncludes(
	readingProgressBlock,
	'right: env(safe-area-inset-right)',
	'Progress right safe area',
);
assertIncludes(readingProgressBlock, 'left: 0', 'Progress inline fallback');
assertIncludes(
	readingProgressBlock,
	'left: env(safe-area-inset-left)',
	'Progress left safe area',
);
assertIncludes(readingProgressBlock, 'z-index: 998', 'Progress UI stack order');
assertIncludes(
	readingProgressBlock,
	'height: 4px',
	'Reading progress indicator',
);
assertIncludes(
	readingProgressBlock,
	'pointer-events: none',
	'Non-blocking reading progress',
);
assertIncludes(
	readingProgressBlock,
	'transform: scaleX(0)',
	'Reading progress indicator',
);
assertIncludes(
	readingProgressBlock,
	'transform-origin: left center',
	'Reading progress indicator',
);
assertNotIncludes(readingProgressBlock, 'top: 0', 'Top progress placement');
const rtlProgressBlock = getRuleBlock(
	styles,
	'.Whale[dir="rtl"] .whale-reading-progress',
	'RTL reading progress',
);
assertIncludes(
	rtlProgressBlock,
	'transform-origin: right center',
	'RTL reading progress direction',
);
assertIncludes(
	printStyles,
	'.whale-reading-progress',
	'Printed progress suppression',
);
assertIncludes(styles, '.whale-floating-toc.is-mobile', 'Stylesheet');
const rootHtmlBlock = getRuleBlock(styles, 'html', 'Root viewport styles');
assertIncludes(rootHtmlBlock, 'font-size: 15px', 'Liberty root font size');
assertIncludes(
	rootHtmlBlock,
	'scrollbar-gutter: stable',
	'Stable root scrollbar gutter',
);
const noSidebarWrapperBlock = getRuleBlock(
	styles,
	'.Whale .content-wrapper.whale-content-wrapper-no-sidebar',
	'No-sidebar wrapper',
);
assertIncludes(
	noSidebarWrapperBlock,
	'grid-template-columns: minmax(0, 1fr)',
	'Centered no-sidebar grid',
);
assertNotIncludes(
	styles,
	'.whale-content-no-sidebar {',
	'Redundant no-sidebar grid placement override',
);
assertNotIncludes(
	styles,
	'grid-column: 1 / -1',
	'Minifier-sensitive no-sidebar grid shorthand',
);
assertIncludes(
	layout,
	'hasStableScrollbarGutter',
	'Stable gutter modal compensation',
);
assertIncludes(
	styles,
	'padding-right: var(--whale-modal-scrollbar-offset, 0)',
	'Modal scrollbar compensation',
);
assertIncludes(
	styles,
	'body.whale-scroll-buttons-vertical.whale-floating-toc-enabled #whale-bottombtn',
	'Fixed desktop scroll toolbar position',
);
assertIncludes(
	bottomToolsStyles,
	'#whale-bottombtn .whale-bottom-tools',
	'Bottom utility menu',
);
if (
	/@media screen and \(min-width: 1024px\)\s*\{[\s\S]*?#whale-bottombtn \.whale-bottom-tools\s*\{[\s\S]*?display:\s*none/.test(
		bottomToolsStyles,
	)
) {
	throw new Error('Bottom utility menu should remain available on desktop.');
}
assertIncludes(
	styles,
	'right: 1.5rem',
	'Fixed desktop scroll toolbar position',
);
assertIncludes(
	styles,
	'body.whale-floating-toc-hover .whale-floating-toc a',
	'Desktop floating TOC hover labels',
);
assertIncludes(
	styles,
	'body.whale-floating-toc-hover .whale-floating-toc a.is-active',
	'Desktop floating TOC active label should wait for hover',
);
assertIncludes(
	styles,
	'pointer-events: none',
	'Desktop floating TOC dot-only default',
);
assertIncludes(
	styles,
	'.whale-floating-toc li.is-active::after',
	'Desktop floating TOC active dot',
);
assertIncludes(
	styles,
	'border-right: 1.5px solid currentColor',
	'Section collapse toggle style',
);
assertIncludes(
	styles,
	'.whale-section-heading .mw-editsection',
	'Section edit link alignment',
);
assertIncludes(
	styles,
	'border-bottom: 1px solid var(--whale-border-color)',
	'Section heading divider',
);
assertIncludes(
	styles,
	'box-shadow: none',
	'Section heading should avoid double divider lines',
);
assertIncludes(styles, 'margin-bottom: 1.25rem', 'Collapsed section spacing');
assertIncludes(
	styles,
	'background-color: transparent',
	'Section toggle should read as a heading affordance',
);
const sectionHeadingBlock = getRuleBlock(
	styles,
	'.Whale .content-wrapper .whale-content .whale-content-main .whale-section-heading',
	'Section heading',
);
assertIncludes(
	sectionHeadingBlock,
	'cursor: default',
	'Section heading pointer restraint',
);
const sectionToggleBlock = styles.match(
	/\.whale-section-toggle\s*\{(?<block>[\s\S]*?)\n\}/,
)?.groups?.block;
if (!sectionToggleBlock) {
	throw new Error('Section toggle block should exist.');
}
if (/border-radius:\s*999px;/.test(sectionToggleBlock)) {
	throw new Error('Section toggles should not render as legacy round pills.');
}
assertIncludes(
	sectionToggleBlock,
	'cursor: pointer',
	'Clickable section toggle',
);
assertIncludes(
	mediaWikiStyles,
	'min-width: 18rem',
	'Article TOC compact document box',
);
assertIncludes(
	mediaWikiStyles,
	'border: 1px solid var(--whale-border-color)',
	'Article TOC compact document box',
);
assertIncludes(
	mediaWikiStyles,
	'.toc .toctogglelabel::before',
	'Article TOC collapse chevron',
);
assertIncludes(
	mediaWikiStyles,
	'border-right: 1.5px solid currentColor',
	'Article TOC collapse chevron',
);
assertIncludes(
	mediaWikiStyles,
	'.toc .toctogglecheckbox:checked ~ ul',
	'Article TOC collapse state',
);
assertIncludes(mediaWikiStyles, 'display: none', 'Article TOC collapse state');
const tocLinkBlock = getRuleBlock(
	mediaWikiStyles,
	'.Whale .content-wrapper .whale-content .whale-content-main .toc a',
	'Article TOC link',
);
assertIncludes(
	tocLinkBlock,
	'color: var(--whale-link-color)',
	'Article TOC link color token',
);
assertIncludes(
	mediaWikiStyles,
	'.mw-heading h2.whale-section-heading',
	'MediaWiki heading rule should not override section toggles',
);
assertIncludes(
	mediaWikiStyles,
	'display: flex',
	'MediaWiki heading rule should preserve section toggle layout',
);
assertIncludes(
	mediaWikiStyles,
	'box-shadow: none',
	'MediaWiki heading rule should avoid decorative double dividers',
);
assertIncludes(
	styles,
	'whale-content-skeleton-loading',
	'Content skeleton style',
);
assertIncludes(
	styles,
	'.whale-heading-anchor-alert',
	'Heading link copy alert',
);
const rawLessCssFunction = styles
	.split('\n')
	.find((line) => /\b(?:min|max|clamp)\(/.test(line) && !line.includes('~"'));
if (rawLessCssFunction) {
	throw new Error(
		'CSS min/max/clamp functions in LESS should be escaped for MediaWiki less.php.',
	);
}
const multiPositionGradientStop = styles
	.split('\n')
	.find((line) =>
		/linear-gradient\([^;]*\b\d+(?:px|rem|em|%)\s+\d+(?:px|rem|em|%)\b/.test(
			line,
		),
	);
if (multiPositionGradientStop) {
	throw new Error(
		'LESS gradients should avoid multi-position color stops for MediaWiki less.php compatibility.',
	);
}
assertIncludes(styles, '~"min(82vw, 22rem)"', 'Mobile TOC CSS min escape');
assertIncludes(styles, 'gap: 0', 'Attached short URL input group');
assertIncludes(
	styles,
	'.Whale .whale-login-modal .whale-login-links',
	'Login modal link alignment',
);
assertIncludes(styles, 'display: flex', 'Login modal link alignment');
assertIncludes(styles, 'height: 2.75rem', 'Login modal control sizing');
const sharedButtonBlock = getRuleBlock(
	buttonStyles,
	'.whale-btn',
	'Shared button',
);
assertIncludes(
	sharedButtonBlock,
	'min-height: var(--whale-control-height-sm)',
	'Shared button control height',
);
const dropdownItemBlock = getRuleBlock(
	dropdownStyles,
	'.whale-dropdown-item',
	'Dropdown item',
);
assertIncludes(
	dropdownItemBlock,
	'min-height: 2.5rem',
	'Comfortable dropdown target height',
);
assertIncludes(
	styles,
	'.Whale .content-wrapper .whale-content .whale-content-main p a:hover',
	'Content link hover underline',
);
assertIncludes(wikiStyles, 'a,\na:visited', 'Visited document link color');
assertIncludes(
	styles,
	'color: var(--whale-link-color)',
	'Document link color token',
);
assertIncludes(
	wikiStyles,
	'a.new,\na.new:visited',
	'Missing document link color',
);
assertIncludes(
	styles,
	'color: var(--whale-danger-color)',
	'Missing document link color token',
);
assertIncludes(
	styles,
	'.whale-content-main p a:visited',
	'Content visited document link color',
);
assertIncludes(
	styles,
	'.whale-content-main p a.new:visited',
	'Content visited missing document link color',
);
if (
	/whale-content-main p a,\s*[\s\S]*?whale-content-main dd a\s*\{\s*text-decoration:\s*underline;/.test(
		styles,
	)
) {
	throw new Error('Content links should not be underlined before hover/focus.');
}

const shortUrlTemplate = read('templates/ShortUrlModal.mustache');
if (shortUrlTemplate.includes('whale-short-url-code')) {
	throw new Error('Short URL modal should not render the internal code pill.');
}
assertIncludes(
	shortUrlTemplate,
	'whale-btn-primary whale-short-url-copy',
	'Primary short URL copy action',
);
assertIncludes(
	shortUrlTemplate,
	'whale-modal-dialog whale-modal-compact',
	'Compact short URL dialog',
);
assertIncludes(
	shortUrlTemplate,
	'data-whale-modal-autofocus',
	'Short URL initial selection target',
);
const loginTemplate = read('templates/LoginModal.mustache');
assertIncludes(
	loginTemplate,
	'class="whale-form-label"',
	'Visible login labels',
);
assertIncludes(loginTemplate, '{{name-label}}', 'Visible login name label');
assertIncludes(
	loginTemplate,
	'whale-btn-primary whale-btn-block',
	'Primary login action',
);
assertIncludes(loginTemplate, 'whale-login-subtitle', 'Login modal context');
assertIncludes(
	loginTemplate,
	'whale-login-password-toggle',
	'Password visibility control',
);
assertIncludes(
	loginTemplate,
	'data-whale-modal-autofocus',
	'Login modal initial focus',
);

const headingAnchors = read('js/heading-anchors.js');
assertIncludes(headingAnchors, 'showCopyAlert', 'Heading anchor copy feedback');
assertIncludes(
	headingAnchors,
	'bindHeadingAnchor',
	'Heading anchor event binding',
);
assertIncludes(
	headingAnchors,
	"alert.setAttribute('role', 'status')",
	'Heading anchor copy feedback',
);

const searchTemplate = read('templates/SearchBox.mustache');
assertIncludes(searchTemplate, 'aria-label="{{go-label}}"', 'Search form');
assertIncludes(searchTemplate, 'aria-label="{{search-label}}"', 'Search form');
assertIncludes(searchTemplate, 'aria-keyshortcuts="/"', 'Search shortcut');
assertIncludes(layout, "event.key !== '/'", 'Search shortcut');
assertIncludes(
	layout,
	"'input, textarea, select, [contenteditable]'",
	'Search shortcut',
);
const searchSubmitBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper .whale-navbar .whale-search-form #mw-searchButton',
	'Primary search action',
);
assertIncludes(
	searchSubmitBlock,
	'background-color: var(--whale-main-color)',
	'Primary search action',
);
assertIncludes(
	searchSubmitBlock,
	'color: var(--whale-main-contrast-color)',
	'Primary search action contrast',
);
assertIncludes(
	buttonStyles,
	'color: var(--whale-main-contrast-color)',
	'Primary button contrast token',
);
assertIncludes(
	buttonStyles,
	'color: var(--whale-second-contrast-color)',
	'Primary button hover contrast token',
);

const mobileContentToolsBlock = getRuleBlock(
	responsiveStyles,
	'.Whale .content-wrapper .whale-content .whale-content-header .content-tools',
	'Responsive article tools',
);
assertIncludes(
	mobileContentToolsBlock,
	'overflow: visible',
	'Responsive article tool dropdown visibility',
);
assertNotIncludes(
	mobileContentToolsBlock,
	'overflow-x: auto',
	'Responsive article tool dropdown clipping',
);
const mobileContentToolGroupBlock = getRuleBlock(
	responsiveStyles,
	'.Whale .content-wrapper .whale-content .whale-content-header .content-tools .whale-btn-group',
	'Responsive article tool group',
);
assertIncludes(
	mobileContentToolGroupBlock,
	'flex-wrap: wrap',
	'Responsive article tool wrapping',
);

const navTemplate = read('templates/Nav.mustache');
assertNotIncludes(navTemplate, 'width="258" height="64"', 'Navbar logo ratio');
const navbarWrapperBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper',
	'Navbar surface',
);
assertIncludes(
	navbarWrapperBlock,
	'background-color: var(--whale-main-color)',
	'Liberty navbar surface',
);
assertIncludes(
	navbarWrapperBlock,
	'border-bottom: 1px solid var(--whale-second-color)',
	'Liberty navbar divider',
);
const navbarLogoBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper .whale-navbar .whale-navbar-brand-logo',
	'Navbar logo',
);
const navbarBrandBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper .whale-navbar .whale-navbar-brand',
	'Navbar brand',
);
assertIncludes(
	navbarBrandBlock,
	'margin-inline-end: 0.65rem',
	'Navbar logo and menu spacing',
);
assertIncludes(
	navbarLogoBlock,
	'max-height: var(--whale-logo-target-height)',
	'Navbar logo size',
);
assertIncludes(
	navbarLogoBlock,
	'height: var(--whale-logo-target-height)',
	'Navbar logo scaling',
);
assertIncludes(
	navbarLogoBlock,
	'object-fit: contain',
	'Navbar logo containment',
);
assertIncludes(
	navbarLogoBlock,
	'object-position: left center',
	'Navbar logo alignment',
);
assertIncludes(layout, 'normalizeBrandLogo', 'Transparent logo normalization');
assertIncludes(layout, 'getImageData', 'Transparent logo alpha bounds');
assertIncludes(
	styles,
	'.whale-navbar-brand.whale-navbar-brand-normalized',
	'Normalized navbar logo frame',
);
assertIncludes(
	navTemplate,
	'whale-navbar-notifications',
	'Navbar notification placement',
);
assertIncludes(
	navTemplate,
	'{{>SearchBox}}',
	'Navbar search should precede right-side tools',
);
assertIncludes(
	styles,
	'.whale-navbar-notifications',
	'Navbar notification placement',
);
assertIncludes(styles, 'order: 29', 'Navbar notification placement');
const navbarLinkBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper .whale-navbar .whale-navbar-menu .whale-navbar-item .whale-navbar-link',
	'Navbar link',
);
assertIncludes(
	navbarLinkBlock,
	'height: var(--whale-nav-height)',
	'Liberty navbar link height',
);
assertIncludes(navbarLinkBlock, 'color: #fff', 'Liberty navbar link contrast');
assertIncludes(navbarLinkBlock, 'font-weight: 500', 'Navbar menu weight');
assertIncludes(styles, '.whale-icon-random', 'Navbar random icon sizing');
assertIncludes(styles, 'width: 2.75rem', 'Mobile navbar icon target sizing');
assertIncludes(
	mediaWikiStyles,
	'background-color: var(--whale-surface-muted-color)',
	'MediaWiki utility surfaces',
);
assertIncludes(
	mediaWikiStyles,
	'border: 1px solid var(--whale-border-color)',
	'MediaWiki thumbnail treatment',
);
assertIncludes(
	mediaWikiStyles,
	'.whale-content-main .mw-parser-output',
	'Article reading typography',
);
assertNotIncludes(
	mediaWikiStyles,
	'\nselect,\ninput:not(',
	'Generic MediaWiki form styles should stay inside article content',
);
const parserOutputBlock = getRuleBlock(
	mediaWikiStyles,
	'.Whale .content-wrapper .whale-content .whale-content-main .mw-parser-output',
	'Article parser output',
);
assertIncludes(
	parserOutputBlock,
	'font-size: inherit',
	'Article font scale inheritance',
);
assertIncludes(
	parserOutputBlock,
	'line-height: inherit',
	'Article reading rhythm',
);
assertIncludes(
	mediaWikiStyles,
	'.whale-content-main blockquote',
	'Article quotation treatment',
);
assertIncludes(
	mediaWikiStyles,
	'[style*="border-left"]',
	'Main-page inline band neutralization',
);
assertIncludes(
	mediaWikiStyles,
	'> div[style*="text-align"] > p > span[style*="color"]',
	'Main-page inline text color neutralization',
);
assertNotIncludes(
	mediaWikiStyles,
	'[style*="text-align: center"]',
	'Minifier-safe main-page selector',
);
assertIncludes(
	mediaWikiStyles,
	'color: var(--whale-content-muted-color) !important',
	'Main-page secondary text contrast',
);
assertIncludes(
	mediaWikiStyles,
	'> div[style*="text-align"] > p > span[style*="font-weight"]',
	'Main-page emphasized text targeting',
);
assertIncludes(
	mediaWikiStyles,
	'color: var(--whale-text-color) !important',
	'Main-page emphasized text contrast',
);
assertIncludes(
	mediaWikiStyles,
	'body.page-Main_Page.Whale',
	'MediaWiki main-page body scope',
);
assertIncludes(
	mediaWikiStyles,
	'> div:last-child > div > div',
	'Main-page information panel targeting',
);
assertIncludes(
	mediaWikiStyles,
	'border-radius: var(--whale-radius-sm) !important',
	'Main-page information panel corners',
);
assertIncludes(
	mediaWikiStyles,
	'background-color: var(--whale-surface-elevated-color) !important',
	'Main-page information panel surface',
);
assertIncludes(
	mediaWikiStyles,
	'box-shadow: none !important',
	'Main-page nested surface elevation restraint',
);
assertIncludes(mediaWikiStyles, '.whale-section-body', 'Main-page card body');
assertIncludes(
	mediaWikiStyles,
	'background-color: var(--whale-surface-muted-color) !important',
	'Main-page card header surface',
);
assertIncludes(
	mediaWikiStyles,
	'background-color: var(--whale-code-background)',
	'Article code treatment',
);
assertIncludes(
	styles,
	'--whale-canvas-color: #f5f5f5',
	'Liberty page canvas token',
);
assertIncludes(styles, '--whale-surface-color: #fff', 'Document surface token');
assertIncludes(
	styles,
	'--whale-surface-muted-color: #f5f8fa',
	'Elevated surface token',
);
assertIncludes(styles, '--whale-table-background', 'Table color tokens');
assertIncludes(
	styles,
	'--whale-notice-text-color: #15466b',
	'Notice text token',
);
assertIncludes(
	styles,
	'background-color: var(--whale-notice-background-color)',
	'Notice theme background color',
);
assertIncludes(
	styles,
	'color: var(--whale-notice-text-color)',
	'Notice theme text color',
);
const noticeBlock = getRuleBlock(
	contentStyles,
	'.Whale .content-wrapper .whale-content .whale-content-header .whale-notice',
	'Article notice',
);
assertIncludes(noticeBlock, 'margin: 1rem', 'Liberty notice spacing');
assertIncludes(
	noticeBlock,
	'border-radius: var(--whale-radius-sm)',
	'Notice component corners',
);
assertIncludes(
	styles,
	'--whale-notice-text-color: #bae0ff',
	'Dark notice text contrast',
);
assertIncludes(styles, '--whale-table-header-background', 'Table color tokens');
assertIncludes(styles, '--whale-table-border-color', 'Table color tokens');
assertIncludes(
	tableStyles,
	'background: var(--whale-table-background)',
	'Table light/dark surface token',
);
assertIncludes(
	tableStyles,
	'background-color: var(--whale-table-header-background)',
	'Table header surface token',
);
assertIncludes(
	tableStyles,
	'border: 1px solid var(--whale-table-border-color)',
	'Table border token',
);
assertIncludes(
	styles,
	'body.whale-dark .Whale .content-wrapper .whale-content .whale-content-main table.wikitable tr > td',
	'Dark table cell override',
);
assertIncludes(
	styles,
	'body.whale-auto-dark .Whale .content-wrapper .whale-content .whale-content-main table.wikitable tr > td',
	'Auto dark table cell override',
);
assertIncludes(
	styles,
	'--whale-radius: 0.35rem',
	'Liberty surface corner radius',
);
assertIncludes(
	styles,
	'--whale-radius-sm: 0.35rem',
	'Shared control corner radius',
);
assertIncludes(
	styles,
	'--whale-layout-width: 1200px',
	'Liberty desktop layout width',
);
assertIncludes(
	styles,
	'--whale-sidebar-width: 240px',
	'Liberty sidebar width token',
);
assertIncludes(styles, '--whale-layout-gap: 16px', 'Desktop layout gap');
assertIncludes(
	styles,
	'--whale-nav-height: 2.8rem',
	'Liberty navigation height',
);
assertIncludes(styles, '--whale-reading-size: 1rem', 'Readable article size');
assertIncludes(
	styles,
	'--whale-reading-leading: 1.6',
	'Readable article leading',
);
assertIncludes(styles, '--whale-link-color: #0275d8', 'Light link color token');
assertIncludes(styles, '--whale-link-color: #69b1ff', 'Dark link color token');
assertIncludes(
	styles,
	'max-width: var(--whale-layout-width)',
	'Centered desktop frame width',
);
assertNotIncludes(styles, 'gradient(', 'Gradient-free interface treatment');
assertIncludes(
	styles,
	'background-color: var(--whale-canvas-color)',
	'Document canvas color',
);
assertIncludes(
	styles,
	'--whale-border-color: #e1e8ed',
	'Liberty interface border',
);
assertIncludes(
	styles,
	'--whale-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)',
	'Subtle surface elevation',
);
assertIncludes(
	styles,
	'box-shadow: var(--whale-shadow-md)',
	'Floating layer elevation',
);
if (/box-shadow:/.test(navbarLinkBlock)) {
	throw new Error('Navbar links should not use decorative bottom shadows.');
}
const scrollButtonBlock = styles.match(
	/#whale-bottombtn \.scroll-button\s*\{(?<block>[\s\S]*?)\n\}/,
)?.groups?.block;
if (!scrollButtonBlock) {
	throw new Error('Scroll button block should exist.');
}
assertIncludes(scrollButtonBlock, 'box-shadow: none', 'Flat scroll buttons');
assertIncludes(
	scrollButtonBlock,
	'width: 2.75rem',
	'Accessible scroll toolbar',
);
assertIncludes(
	scrollButtonBlock,
	'border-radius: var(--whale-radius-sm)',
	'Scroll toolbar control corners',
);
assertIncludes(
	bottomToolsStyles,
	'border: 1px solid var(--whale-border-strong-color)',
	'Floating scroll toolbar frame',
);
assertIncludes(
	bottomToolsStyles,
	'background: var(--whale-surface-elevated-color)',
	'Floating scroll toolbar surface',
);
assertIncludes(
	bottomToolsStyles,
	'padding: 0.25rem',
	'Floating scroll toolbar spacing',
);
assertIncludes(
	bottomToolsStyles,
	'border-radius: var(--whale-radius-sm)',
	'Bottom tool menu item corners',
);
assertNotIncludes(
	bottomToolsStyles,
	'.whale-bottom-tools-menu::after',
	'Decorative bottom tools menu pointer',
);

for (const legacyEditorColor of [
	'#0275d8',
	'#5bc0de',
	'#f0ad4e',
	'#f5f8fa',
	'#e1e8ed',
]) {
	assertNotIncludes(
		editorStyles,
		legacyEditorColor,
		'Editor component token consistency',
	);
}
assertIncludes(
	editorStyles,
	'background-color: var(--whale-control-background)',
	'Editor summary field surface',
);
assertIncludes(
	editorStyles,
	'background-color: var(--whale-main-color)',
	'Editor primary save action',
);
assertIncludes(
	editorStyles,
	'background-color: var(--whale-surface-elevated-color)',
	'Editor secondary action surface',
);

const rendererPhp = read('WhaleRenderer.php');
const navbarParserPhp = read('WhaleNavbarParser.php');
assertIncludes(rendererPhp, 'img/whale_footer_img.png', 'Footer badge image');
assertIncludes(rendererPhp, 'whale-footer-brand-img', 'Footer badge image');
assertIncludes(rendererPhp, "'width' => '78'", 'Footer badge image');
assertIncludes(rendererPhp, "'height' => '31'", 'Footer badge image');
assertIncludes(navbarParserPhp, 'parseSimpleNavbar', 'Simple navbar parser');
assertIncludes(
	rendererPhp,
	"'has-notifications'",
	'Navbar notification placement',
);
assertIncludes(
	rendererPhp,
	'whale-dropdown-subitem',
	'Navbar third-level menus should be scoped to their parent row',
);
assertIncludes(styles, '.whale-dropdown-menu::before', 'Dropdown hover bridge');
assertIncludes(
	styles,
	'.whale-dropdown-submenu::before',
	'Dropdown submenu hover bridge',
);
assertIncludes(
	rendererPhp,
	'$title->getLatestRevID()',
	'Navbar content cache key',
);
assertIncludes(
	rendererPhp,
	'getRevisionLookup()->getRevisionByTitle( $title )',
	'MediaWiki revision service for short URLs',
);
assertIncludes(
	rendererPhp,
	'WhaleAvatar::createDataUri',
	'Login avatar rendering',
);
assertIncludes(
	rendererPhp,
	'wgWhaleNavbarParentLinks',
	'Navbar parent link toggle config',
);
assertIncludes(
	rendererPhp,
	"Html::rawElement( $isToggleButton ? 'button' : 'a'",
	'Navbar parent items with children should render as inert toggles by default',
);
assertIncludes(rendererPhp, 'profile-img-fallback', 'Login avatar fallback');
assertIncludes(rendererPhp, "'cog' => 'settings'", 'Lucide settings alias');
assertIncludes(rendererPhp, "'random' => 'shuffle'", 'Lucide shuffle alias');
assertIncludes(rendererPhp, "'data-lucide'", 'Lucide icon identity');
assertIncludes(rendererPhp, "'viewBox' => '0 0 24 24'", 'Lucide view box');
if (rendererPhp.includes('$solidIcons')) {
	throw new Error('Navbar icons should not mix solid icon geometry.');
}
const removedAvatarRenderers = [
	['w', 'Avatar'].join(''),
	['Grav', 'atar'].join(''),
];
if (removedAvatarRenderers.some((needle) => rendererPhp.includes(needle))) {
	throw new Error('Login avatar rendering should use server-side DiceBear.');
}
const removedFooterImage = ['designed', 'by', 'libre.png'].join('');
if (rendererPhp.includes(removedFooterImage)) {
	throw new Error('Footer badge should not use the legacy footer image.');
}
const removedFooterClass = ['designed', 'by', 'libre'].join('');
if (
	rendererPhp.includes(removedFooterClass) ||
	styles.includes(removedFooterClass)
) {
	throw new Error('Footer badge should not keep legacy footer classes.');
}

assertIncludes(
	skinPhp,
	'WHALE_AD_POSITIONS',
	'Centralized AdSense position config',
);
assertIncludes(
	skinPhp,
	'pagead/js/adsbygoogle.js?client=',
	'Modern AdSense loader',
);
assertIncludes(
	skinPhp,
	"'crossorigin' => 'anonymous'",
	'Modern AdSense loader',
);
assertIncludes(skinPhp, 'normalizeAdBoolean', 'AdSense slot normalization');
const removedAdsenseLoader = ['src="//', 'pagead2.googlesyndication.com'].join(
	'',
);
if (skinPhp.includes(removedAdsenseLoader)) {
	throw new Error(
		'AdSense loader should not use protocol-relative legacy URLs.',
	);
}

const avatarPhp = read('WhaleAvatar.php');
assertIncludes(
	avatarPhp,
	"private const DEFAULT_STYLE = 'identicon'",
	'DiceBear PHP avatar default',
);
assertIncludes(
	avatarPhp,
	"getInstallPath( 'dicebear/styles' )",
	'DiceBear PHP avatar',
);
assertIncludes(
	avatarPhp,
	'new Avatar( $style, $avatarOptions )',
	'DiceBear PHP avatar',
);

const externalLinkTemplate = read('templates/ExternalLinkModal.mustache');
assertIncludes(
	externalLinkTemplate,
	'href="#" data-whale-external-continue',
	'External link modal continue link',
);
if (
	externalLinkTemplate.indexOf('whale-modal-title') >
	externalLinkTemplate.indexOf('whale-modal-close')
) {
	throw new Error(
		'External link modal close button should sit after the title.',
	);
}

const skinTemplate = read('templates/skin.mustache');
const referenceTemplate = read('templates/ReferenceModal.mustache');
assertIncludes(skinTemplate, 'whale-content-no-sidebar', 'No-sidebar layout');
const bottomToolsTemplateIndex = skinTemplate.indexOf('id="whale-bottombtn"');
const contentSectionEndIndex = skinTemplate.indexOf('</section>');
if (
	bottomToolsTemplateIndex < contentSectionEndIndex ||
	bottomToolsTemplateIndex === -1 ||
	contentSectionEndIndex === -1
) {
	throw new Error(
		'Bottom tools should be mounted after the content section at the root stacking level.',
	);
}
assertIncludes(
	skinPhp,
	'.Whale #whale-bottombtn',
	'Root-level bottom tools visibility setting',
);
assertNotIncludes(
	skinPhp,
	'.Whale .content-wrapper #whale-bottombtn',
	'Obsolete nested bottom tools selector',
);
const bottomToolsFrameBlock = getRuleBlock(
	bottomToolsStyles,
	'#whale-bottombtn',
	'Bottom tools stacking level',
);
const floatingTocFrameBlock = getRuleBlock(
	styles,
	'.whale-floating-toc',
	'Floating table of contents stacking level',
);
assertIncludes(
	bottomToolsFrameBlock,
	'z-index: 1000',
	'Bottom tools stack order',
);
assertIncludes(
	floatingTocFrameBlock,
	'z-index: 999',
	'Floating table of contents stack order',
);
assertIncludes(
	contentStyles,
	'float: right',
	'Liberty article tools alignment',
);
assertNotIncludes(
	skinTemplate,
	'whale-content-heading',
	'Removed redesign heading wrapper',
);
assertNotIncludes(styles, 'min-height: 204px', 'Legacy article header height');
assertIncludes(skinTemplate, '{{>ReferenceModal}}', 'Reference modal partial');
assertIncludes(
	referenceTemplate,
	'aria-modal="true"',
	'Accessible reference modal',
);
assertIncludes(
	referenceTemplate,
	'data-whale-modal-autofocus',
	'Reference modal initial focus',
);
assertIncludes(styles, '.whale-reference-content', 'Reference modal content');
assertIncludes(
	referenceTemplate,
	'class="whale-modal-body whale-reference-body"',
	'Reference modal scroll region',
);
assertIncludes(
	referenceTemplate,
	'tabindex="0" role="document"',
	'Keyboard-scrollable reference content',
);
assertIncludes(styles, '~"min(60vh, 28rem)"', 'Reference modal scroll limit');
assertIncludes(
	styles,
	'~"min(34rem, calc(100% - 2rem))"',
	'Compact reference modal width',
);
assertIncludes(
	referenceTemplate,
	'whale-modal-heading-icon',
	'Reference modal heading icon',
);
assertIncludes(
	styles,
	'overscroll-behavior: contain',
	'Reference modal scroll containment',
);
const referenceHeaderBlock = getRuleBlock(
	styles,
	'.Whale .whale-reference-modal .whale-modal-header',
	'Reference modal header',
);
assertIncludes(
	referenceHeaderBlock,
	'background-color: var(--whale-surface-elevated-color)',
	'Reference modal header surface',
);
const referenceActionsBlock = getRuleBlock(
	styles,
	'.Whale .whale-reference-actions',
	'Reference modal actions',
);
assertIncludes(
	referenceActionsBlock,
	'justify-content: flex-end',
	'Reference modal action alignment',
);
assertIncludes(
	referenceActionsBlock,
	'background-color: var(--whale-surface-elevated-color)',
	'Reference modal action surface',
);
const referenceJumpBlock = getRuleBlock(
	styles,
	'.Whale .whale-reference-jump',
	'Reference modal jump action',
);
assertIncludes(
	referenceJumpBlock,
	'border: 1px solid var(--whale-border-strong-color)',
	'Reference modal button affordance',
);
assertIncludes(
	styles,
	'[data-whale-modal-autofocus]:focus',
	'Reference modal programmatic focus treatment',
);
assertIncludes(
	styles,
	'env(safe-area-inset-bottom)',
	'Reference modal mobile safe area',
);
assertIncludes(
	styles,
	'.whale-reference-modal.is-open',
	'Reference modal mobile open state',
);
assertIncludes(
	styles,
	'overflow: hidden',
	'Reference modal viewport containment',
);
const modalCloseBlock = getRuleBlock(
	styles,
	'.whale-modal-close',
	'Modal close control',
);
assertIncludes(modalCloseBlock, 'width: 2.75rem', 'Modal close target width');
assertIncludes(modalCloseBlock, 'height: 2.75rem', 'Modal close target height');
assertIncludes(styles, '.whale-code-copy', 'Code block copy control');
assertIncludes(styles, '.whale-code-toolbar', 'Code block copy toolbar');
assertIncludes(
	styles,
	'border-bottom: 1px solid var(--whale-border-color)',
	'Code block toolbar divider',
);
assertIncludes(codeCopy, 'createCopyToolbar', 'Code block toolbar structure');
if (
	!skin.ResourceModules['skins.whale.articlejs'].scripts.includes(
		'js/code-copy.js',
	)
) {
	throw new Error('Article resources should load code block copy controls.');
}
assertIncludes(
	skinTemplate,
	'whale-content-wrapper-no-sidebar',
	'No-sidebar layout',
);
assertIncludes(
	skinTemplate,
	'{{#has-whale-section-tools}}',
	'Special-page section tool suppression',
);
assertIncludes(
	skinTemplate,
	'whale-sidebar-column',
	'Desktop sidebar grid placement',
);
assertNotIncludes(
	skinTemplate,
	'whale-sidebar-notice',
	'Duplicate desktop site notice',
);
if (
	skinTemplate.indexOf('class="whale-content') >
	skinTemplate.indexOf('class="whale-sidebar-column')
) {
	throw new Error(
		'Article content should precede the sidebar in document order.',
	);
}
assertIncludes(
	read('templates/Footer.mustache'),
	'whale-footer-links',
	'Compact footer grouping',
);
assertIncludes(rendererPhp, 'tools-watch', 'Visible article watch control');
assertIncludes(
	rendererPhp,
	'whale-btn-primary tools-btn tools-edit',
	'Primary article edit action',
);
assertIncludes(
	read('templates/ContentTools.mustache'),
	'whale-dropdown-item tools-share',
	'Share action should live in the overflow menu',
);

const hooksPhp = read('WhaleHooks.php');
assertIncludes(
	hooksPhp,
	'public static function onBeforePageDisplay',
	'Client module loader hook',
);
assertIncludes(hooksPhp, 'getWhaleClientModules', 'Client module loader hook');
assertIncludes(hooksPhp, '$out->addModules', 'Client module loader hook');
if ('scripts' in skin.ValidSkinNames.whale.args[0]) {
	throw new Error('Skin defaults should not eagerly load every client module.');
}
assertIncludes(
	skinPhp,
	"'skins.whale.articlejs'",
	'View-page article module boundary',
);
assertNotIncludes(
	skinPhp.slice(0, skinPhp.indexOf('public function getWhaleClientModules')),
	'$out->addModules',
	'Skin initialization should defer client modules to BeforePageDisplay',
);
assertIncludes(
	hooksPhp,
	"$preferences['whale-ads-belowarticle']",
	'Below-article ad preference',
);
const removedBelowArticleAdPreference = [
	'whale-ads',
	String.fromCharCode(109, 111, 114, 101, 97, 114, 116, 105, 99, 108, 101),
].join('-');
if (hooksPhp.includes(`$preferences['${removedBelowArticleAdPreference}']`)) {
	throw new Error('Below-article ad preference should use belowarticle key.');
}
assertIncludes(
	hooksPhp,
	'$wgWhaleEnableSectionCollapse ?? true',
	'Feature preference guards',
);
assertIncludes(
	hooksPhp,
	'shouldRenderSectionNavigation',
	'Special-page section navigation suppression',
);
assertIncludes(
	hooksPhp,
	'normalizeSectionMode',
	'Section collapse default normalization',
);

assertIncludes(skinPhp, 'NS_SPECIAL', 'Special-page sidebar suppression');

if (skin.config.WhaleEnableContentSkeleton !== false) {
	throw new Error('Content skeleton should be disabled by default.');
}

if (skin.DefaultUserOptions['whale-content-skeleton'] !== false) {
	throw new Error('Content skeleton user option should default to off.');
}

const shortUrlPhp = read('SpecialWhaleShortUrl.php');
assertIncludes(
	shortUrlPhp,
	"quickUserCan( 'read'",
	'Short URL permission check',
);
assertIncludes(
	shortUrlPhp,
	'ALLOWED_REDIRECT_STATUSES',
	'Short URL redirect status validation',
);

const readme = read('README.md');
assertIncludes(readme, 'children:', 'Simple navbar docs');
assertIncludes(readme, '- text: Beginner guide', 'Simple navbar docs');
assertIncludes(
	readme,
	'$wgWhaleNavbarParentLinks = true;',
	'Navbar parent link docs',
);
