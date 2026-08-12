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
		new RegExp(`${escapedSelector}\\s*\\{(?<block>[\\s\\S]*?)\\n\\}`),
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

const recovery = read('js/recovery.js');
assertIncludes(
	recovery,
	'live-recent-no-data-visual',
	'Recovery live recent empty state',
);
assertIncludes(
	recovery,
	'live-recent-no-data-paper',
	'Recovery live recent empty state',
);
assertIncludes(
	recovery,
	'live-recent-no-data-bubble',
	'Recovery live recent empty state',
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

const styles = readLessWithImports('less/default.less');
const wikiStyles = read('less/wiki.less');
const tableStyles = read('less/wiki-table.less');
const mediaWikiStyles = read('less/only-mw.less');
const bottomToolsStyles = read('less/whale/bottom-tools.less');
assertIncludes(styles, 'color-scheme: light dark', 'Stylesheet');
assertIncludes(styles, 'body.whale-dark,', 'Stylesheet');
assertIncludes(
	styles,
	'.Whale .whale-reading-progress',
	'Reading progress indicator',
);
assertIncludes(styles, 'height: 3px', 'Reading progress indicator');
assertIncludes(styles, 'transform: scaleX(0)', 'Reading progress indicator');
assertIncludes(
	styles,
	'transform-origin: left center',
	'Reading progress indicator',
);
const readingProgressBlock = styles.match(
	/\.Whale \.whale-reading-progress\s*\{(?<block>[\s\S]*?)\n\}/,
)?.groups?.block;
if (!readingProgressBlock || /display:\s*none/.test(readingProgressBlock)) {
	throw new Error('Reading progress indicator should remain visible.');
}
assertIncludes(styles, '.whale-floating-toc.is-mobile', 'Stylesheet');
assertIncludes(styles, '.whale-content-no-sidebar', 'No-sidebar layout');
assertIncludes(styles, 'scrollbar-gutter: stable', 'Stylesheet');
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
	'border-right: 2px solid currentColor',
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
assertIncludes(styles, 'cursor: pointer', 'Clickable section heading');
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
assertIncludes(mediaWikiStyles, 'color: #0066d9', 'Article TOC link color');
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
assertIncludes(styles, 'gap: 0.65rem', 'Short URL copy row spacing');
assertIncludes(
	styles,
	'.Whale .whale-login-modal .whale-login-links',
	'Login modal link alignment',
);
assertIncludes(styles, 'display: grid', 'Login modal link alignment');
assertIncludes(styles, 'height: 2.75rem', 'Login modal button sizing');
assertIncludes(
	styles,
	'.Whale .content-wrapper .whale-content .whale-content-main p a:hover',
	'Content link hover underline',
);
assertIncludes(wikiStyles, 'a,\na:visited', 'Visited document link color');
assertIncludes(styles, 'color: #0066d9', 'Document link color');
assertIncludes(
	wikiStyles,
	'a.new,\na.new:visited',
	'Missing document link color',
);
assertIncludes(styles, 'color: #b32424', 'Missing document link color');
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

const navTemplate = read('templates/Nav.mustache');
assertIncludes(navTemplate, 'width="258" height="64"', 'Navbar logo');
const navbarWrapperBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper',
	'Navbar surface',
);
assertIncludes(
	navbarWrapperBlock,
	'background-color: var(--whale-surface-color)',
	'Navbar neutral surface',
);
assertIncludes(
	navbarWrapperBlock,
	'border-bottom: 1px solid var(--whale-border-color)',
	'Navbar divider',
);
const navbarLogoBlock = getRuleBlock(
	styles,
	'.Whale .whale-nav-wrapper .whale-navbar .whale-navbar-brand-logo',
	'Navbar logo',
);
assertIncludes(navbarLogoBlock, 'height: 2rem', 'Navbar logo size');
assertIncludes(navbarLogoBlock, 'min-width: 2rem', 'Navbar logo size');
assertIncludes(styles, 'margin: 0 0.8rem 0 0', 'Navbar brand spacing');
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
assertIncludes(navbarLinkBlock, 'height: 32px', 'Navbar link height clamp');
assertIncludes(
	navbarLinkBlock,
	'border-radius: var(--whale-radius-sm)',
	'Navbar restrained corner radius',
);
assertIncludes(navbarLinkBlock, 'font-weight: 500', 'Navbar menu weight');
assertIncludes(styles, '.whale-icon-random', 'Navbar random icon sizing');
assertIncludes(styles, 'width: 2.4rem', 'Mobile navbar icon target sizing');
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
assertIncludes(mediaWikiStyles, 'line-height: 1.65', 'Article reading rhythm');
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
	'background-color: var(--whale-code-background)',
	'Article code treatment',
);
assertIncludes(styles, '--whale-table-background', 'Table color tokens');
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
assertIncludes(styles, '--whale-radius: 4px', 'Shared surface corner radius');
assertIncludes(
	styles,
	'--whale-radius-sm: 2px',
	'Shared control corner radius',
);
assertIncludes(styles, '--whale-layout-width: 1280px', 'Desktop layout width');
assertIncludes(styles, '--whale-sidebar-width: 260px', 'Sidebar width token');
assertIncludes(styles, '--whale-layout-gap: 14px', 'Desktop layout gap');
assertIncludes(
	styles,
	'max-width: var(--whale-layout-width)',
	'Centered desktop frame width',
);
assertNotIncludes(styles, 'gradient(', 'Gradient-free interface treatment');
assertIncludes(styles, 'background-color: #f1f2f3', 'Document canvas color');
assertIncludes(styles, '--whale-border-color: #d5d8dc', 'Interface border');
assertIncludes(styles, '--whale-shadow-sm: none', 'Flat surface treatment');
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
assertIncludes(
	skinTemplate,
	'whale-content-heading',
	'Compact article heading layout',
);
assertIncludes(
	styles,
	'.whale-content-title-group',
	'Compact article heading layout',
);
assertIncludes(
	styles,
	'justify-content: space-between',
	'Article heading and tools alignment',
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
assertIncludes(styles, '~"min(60vh, 30rem)"', 'Reference modal scroll limit');
assertIncludes(styles, '.whale-code-copy', 'Code block copy control');
assertIncludes(styles, 'padding-top: 3rem', 'Code block copy control spacing');
if (
	!skin.ResourceModules['skins.whale.layoutjs'].scripts.includes(
		'js/code-copy.js',
	)
) {
	throw new Error('Layout resources should load code block copy controls.');
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
