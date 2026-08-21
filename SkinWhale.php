<?php

use MediaWiki\Html\Html;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;

if (
	!class_exists( SkinMustache::class ) &&
	class_exists( MediaWiki\Skin\SkinMustache::class )
) {
	class_alias( MediaWiki\Skin\SkinMustache::class, SkinMustache::class );
}

class SkinWhale extends SkinMustache {
	// @codingStandardsIgnoreStart
	/** @var string */
	public $skinname = 'whale';
	/** @var string */
	public $stylename = 'Whale';
	/** @var string */
	public $template = 'skin';
	// @codingStandardsIgnoreEnd

	private const DEFAULT_THEME_COLORS = [
		'light' => [ 'primary' => '#0B67D1', 'secondary' => '#0958D9' ],
		'dark' => [ 'primary' => '#4096FF', 'secondary' => '#1677FF' ],
	];
	private const LEGACY_DEFAULT_THEME_COLORS = [
		'primary' => '#00BCD4',
		'secondary' => '#FFA500',
	];

	private const THEME_PALETTES = [
		'han-river-blue' => [
			'light' => [ 'primary' => '#336699', 'secondary' => '#003366' ],
			'dark' => [ 'primary' => '#99CCFF', 'secondary' => '#6699FF' ],
		],
		'hanbat-forest' => [
			'light' => [ 'primary' => '#006633', 'secondary' => '#336633' ],
			'dark' => [ 'primary' => '#99CC99', 'secondary' => '#66CC66' ],
		],
		'milk-vetch-purple' => [
			'light' => [ 'primary' => '#663399', 'secondary' => '#993366' ],
			'dark' => [ 'primary' => '#CCCCFF', 'secondary' => '#CC99FF' ],
		],
		'clay-roof' => [
			'light' => [ 'primary' => '#993300', 'secondary' => '#666633' ],
			'dark' => [ 'primary' => '#FFCC99', 'secondary' => '#CCCC99' ],
		],
		'jeju-teal' => [
			'light' => [ 'primary' => '#006666', 'secondary' => '#336666' ],
			'dark' => [ 'primary' => '#99CCCC', 'secondary' => '#66CCCC' ],
		],
		'camellia-red' => [
			'light' => [ 'primary' => '#993333', 'secondary' => '#663333' ],
			'dark' => [ 'primary' => '#FF9999', 'secondary' => '#CC9999' ],
		],
		'ginkgo-gold' => [
			'light' => [ 'primary' => '#666600', 'secondary' => '#663300' ],
			'dark' => [ 'primary' => '#FFCC33', 'secondary' => '#CCCC66' ],
		],
	];
	private const LAYOUT_WIDTHS = [
		'1000px',
		'1100px',
		'1200px',
		'1300px',
		'1500px',
		'1600px',
	];
	private const WHALE_AD_POSITIONS = [
		'header' => [
			'class' => 'header-ads',
			'option' => 'whale-ads-header',
			'format' => 'horizontal',
			'fullWidthResponsive' => 'false',
		],
		'right' => [
			'class' => 'right-ads',
			'option' => 'whale-ads-right',
			'format' => 'auto',
			'fullWidthResponsive' => 'true',
		],
		'belowarticle' => [
			'class' => 'belowarticle-ads',
			'option' => 'whale-ads-belowarticle',
			'format' => 'auto',
			'fullWidthResponsive' => 'true',
		],
		'bottom' => [
			'class' => 'bottom-ads',
			'option' => 'whale-ads-bottom',
			'format' => 'auto',
			'fullWidthResponsive' => 'true',
		],
	];

	/**
	 * Page initialize.
	 *
	 * @param OutputPage $out OutputPage
	 */
	public function initPage( OutputPage $out ): void {
		// @codingStandardsIgnoreLine
		global $wgSitename, $wgXAccount, $wgLanguageCode, $wgWhaleNaverVerification, $wgLogo, $wgWhaleEnableLiveRC;

		$user = $this->getUser();
		$services = MediaWikiServices::getInstance();
		$userOptionsLookup = $services->getUserOptionsLookup();
		/* uncomment if needs to use UserGroupManager
		$userGroupManager = $services->getUserGroupManager();
		$userGroups = $userGroupManager->getUserGroups( $user );
		*/

		$optionTheme = $userOptionsLookup->getOption( $user, 'whale-theme' );

		$themeColors = $this->resolveThemeColors( $optionTheme );
		$mainColor = $themeColors['light']['primary'];
		$secondColor = $themeColors['light']['secondary'];
		$darkMainColor = $themeColors['dark']['primary'];
		$darkSecondColor = $themeColors['dark']['secondary'];
		$mainContrastColor = $this->getContrastColor( $mainColor );
		$secondContrastColor = $this->getContrastColor( $secondColor );
		$darkMainContrastColor = $this->getContrastColor( $darkMainColor );
		$darkSecondContrastColor = $this->getContrastColor( $darkSecondColor );
		$ogLogo = $GLOBALS['wgWhaleOgLogo'] ?? $wgLogo;
		if ( !is_string( $ogLogo ) || !preg_match( '/^((?:(?:http(?:s)?)?:)?\/\/(?:.{4,}))$/i', $ogLogo ) ) {
			$server = $GLOBALS['wgServer'] ?? '';
			$logoPath = $GLOBALS['wgLogo'] ?? '';
			$ogLogo = ( is_string( $server ) ? $server : '' ) . ( is_string( $logoPath ) ? $logoPath : '' );
		}

		$skin = $this->getSkin();

		parent::initPage( $out );

		if (
			!class_exists( ArticleMetaDescription::class ) ||
			!class_exists( Description2::class )
		) {
			// The validator complains if there's more than one description,
			// so output this here only if none of the aforementioned SEO
			// extensions aren't installed
			$out->addMeta( 'description', strip_tags(
				preg_replace( '/<table[^>]*>([\s\S]*?)<\/table[^>]*>/', '', $out->mBodytext ) ?? '',
				'<br>'
			) );
		}
		$title = $skin->getTitle();
		$out->addMeta(
			'keywords',
			( is_string( $wgSitename ) ? $wgSitename : '' ) . ',' .
				( $title ? $title->getPrefixedText() : '' )
		);

		/*
		 * OpenGraph logo image ($wgWhaleOgLogo, falling back to $wgLogo).
		 * Skip when an OpenGraph extension already emits og:image so the
		 * page does not carry duplicate tags.
		 */
		$hasOpenGraphExtension = class_exists( 'OpenGraphMeta' ) ||
			class_exists( 'MediaWiki\\Extension\\OpenGraphMeta\\Hooks' ) ||
			class_exists( 'MediaWiki\\Extension\\WikiSEO\\WikiSEO' );
		if ( $ogLogo !== '' && !$hasOpenGraphExtension ) {
			$out->addMeta( 'og:image', $ogLogo );
		}

		/* Naver webmaster verification */
		if ( is_string( $wgWhaleNaverVerification ) && $wgWhaleNaverVerification !== '' ) {
			$out->addMeta( 'naver-site-verification', $wgWhaleNaverVerification );
		}

		/* iOS and mobile browser web-app metadata */
		$out->addMeta( 'apple-mobile-web-app-capable', 'Yes' );
		$out->addMeta( 'apple-mobile-web-app-status-bar-style', 'black-translucent' );
		$out->addMeta( 'mobile-web-app-capable', 'Yes' );

		/* Mobile browser theme color */
		$out->addMeta( 'color-scheme', 'light dark' );
		$out->addMeta( 'theme-color', $mainColor );
		$out->addMeta( 'msapplication-navbutton-color', $mainColor );
		$addHeadItem = [ $out, 'addHeadItem' ];
		if ( is_callable( $addHeadItem ) ) {
			$addHeadItem( 'whale-local-storage-fallback', $this->renderLocalStorageFallbackScript() );
		}

		/* Twitter card */
		$out->addMeta( 'twitter:card', 'summary' );
		if ( is_string( $wgXAccount ) && $wgXAccount !== '' ) {
			$out->addMeta( 'twitter:site', "@$wgXAccount" );
			$out->addMeta( 'twitter:creator', "@$wgXAccount" );
		}

		// @codingStandardsIgnoreStart
		$out->addInlineStyle(
			".Whale {
			--whale-main-color: $mainColor;
			--whale-second-color: $secondColor;
			--whale-main-contrast-color: $mainContrastColor;
			--whale-second-contrast-color: $secondContrastColor;
		}

		body.whale-dark .Whale {
			--whale-main-color: $darkMainColor;
			--whale-second-color: $darkSecondColor;
			--whale-main-contrast-color: $darkMainContrastColor;
			--whale-second-contrast-color: $darkSecondContrastColor;
		}

		@media (prefers-color-scheme: dark) {
			body.whale-auto-dark .Whale {
				--whale-main-color: $darkMainColor;
				--whale-second-color: $darkSecondColor;
				--whale-main-contrast-color: $darkMainContrastColor;
				--whale-second-contrast-color: $darkSecondContrastColor;
			}

			body.whale-auto-dark.Whale {
				--whale-main-color: $darkMainColor;
				--whale-second-color: $darkSecondColor;
				--whale-main-contrast-color: $darkMainContrastColor;
				--whale-second-contrast-color: $darkSecondContrastColor;
			}
		}

		body.whale-dark.Whale {
			--whale-main-color: $darkMainColor;
			--whale-second-color: $darkSecondColor;
			--whale-main-contrast-color: $darkMainContrastColor;
			--whale-second-contrast-color: $darkSecondContrastColor;
		}"
		);

		// layout settings
		$WhaleUserWidthSettings = $this->normalizeLayoutWidth(
			$userOptionsLookup->getOption( $user, 'whale-layout-width' )
		);
		$WhaleUserSidebarSettings = $userOptionsLookup->getOption( $user, 'whale-layout-sidebar' );
		$WhaleUserNavbarSettings = $userOptionsLookup->getOption( $user, 'whale-layout-navfix' );
		$WhaleUsercontrolbarSettings = $userOptionsLookup->getOption( $user, 'whale-layout-controlbar' );

		if ( isset( $WhaleUserNavbarSettings ) && $WhaleUserNavbarSettings ) {
			$out->addInlineStyle(
				".Whale .whale-nav-wrapper.whale-navbar-fixed {
					position: absolute;
				}"
			);
		}

		if ( isset( $WhaleUserSidebarSettings ) && $WhaleUserSidebarSettings ) {
			$out->addInlineStyle(
				".Whale .content-wrapper .whale-content {
					margin-right: 0;
				}"
			);
		}

		if ( $WhaleUserWidthSettings !== null ) {
			$out->addInlineStyle(
				".Whale .content-wrapper {
					max-width: $WhaleUserWidthSettings;
				}

				.Whale .whale-nav-wrapper .whale-navbar {
					max-width: $WhaleUserWidthSettings;
				}"
			);
		}

		if ( isset( $WhaleUsercontrolbarSettings ) && $WhaleUsercontrolbarSettings ) {
			$out->addInlineStyle(
				".Whale #whale-bottombtn {
					display: none;
				}"
			);
		}

		// @codingStandardsIgnoreEnd
		$this->setupCss( $out );
	}

	/**
	 * @return array<int,string>
	 */
	public function getWhaleClientModules(): array {
		global $wgWhaleEnableLiveRC;
		$modules = [
			'skins.whale.layoutjs'
		];
		$title = $this->getTitle();
		$action = $this->getRequest()->getVal( 'action', 'view' );
		if ( $action === 'view' && $title && $title->getNamespace() !== NS_SPECIAL ) {
			$modules[] = 'skins.whale.articlejs';
		}
		if ( $this->getWhaleAdClient() !== '' ) {
			$modules[] = 'skins.whale.ads';
		}

		$hasSidebar = $this->shouldRenderSidebar();
		if (
			( $wgWhaleEnableLiveRC ?? true ) !== false &&
			(
				( $hasSidebar && $this->shouldRenderLiveRecent() ) ||
				$this->shouldRenderMobileLiveRecent( $hasSidebar )
			)
		) {
			$modules[] = 'skins.whale.liverc';
		}

		if ( $this->getUser()->isAnon() ) {
			$modules[] = 'skins.whale.loginjs';
		}

		if ( $this->isWhaleFeatureEnabled( 'WhaleEnableHeadingAnchors', 'whale-heading-anchors' ) ) {
			$modules[] = 'skins.whale.headingAnchors';
		}

		if (
			$this->isWhaleFeatureEnabled( 'WhaleEnableResponsiveTables', 'whale-responsive-tables' ) ||
			$this->isWhaleFeatureEnabled( 'WhaleEnableSortableTables', 'whale-sortable-tables' )
		) {
			$modules[] = 'skins.whale.tables';
		}

		if ( $this->isWhaleFeatureEnabled( 'WhaleEnableShortUrls', 'whale-short-url' ) ) {
			$modules[] = 'skins.whale.shortUrl';
		}

		if ( ( $GLOBALS['wgWhaleEnableAnonThemeToggle'] ?? true ) !== false ) {
			$modules[] = 'skins.whale.themeToggle';
		}

		if ( $this->isWhaleFeatureEnabled( 'WhaleEnableImageLazyLoad', 'whale-lazy-images' ) ) {
			$modules[] = 'skins.whale.lazyImages';
		}

		return array_values( array_unique( $modules ) );
	}

	/**
	 * Get template data for Mustache rendering.
	 *
	 * @return array<string,mixed>
	 */
	public function getTemplateData(): array {
		global $wgWhaleEnableLiveRC, $wgWhaleMobileReplaceAd;

		$data = parent::getTemplateData();
		$renderer = new WhaleRenderer( $this );
		$request = $this->getRequest();
		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		$adClient = $this->getWhaleAdClient();
		$hasSidebar = $this->shouldRenderSidebar();
		$hasLiveRecent = $wgWhaleEnableLiveRC && $this->shouldRenderLiveRecent();
		$hasDesktopLiveRecent = $hasLiveRecent && $hasSidebar;
		$hasMobileLiveRecent = $wgWhaleEnableLiveRC && $this->shouldRenderMobileLiveRecent( $hasSidebar );
		$siteNoticeHtml = $request->getCookie( 'disable-notice' )
			? ''
			: $this->getVisibleSiteNoticeHtml( $data['html-site-notice'] ?? '' );
		$categoryBlur = $userOptionsLookup->getOption( $this->getUser(), 'whale-content-category-blur' );

		$categoriesHtml = $data['html-categories'] ?? '';
		$data['html-title'] = $this->getOutput()->getPageTitle();
		$data['html-categories'] = is_string( $categoriesHtml ) ? WhaleHooks::decorateCategoryHtml(
			$categoriesHtml,
			$categoryBlur !== false
		) : $categoriesHtml;
		$data['data-whale-not-found'] = $this->getNotFoundPageData();
		$data['has-whale-not-found'] = !empty( $data['data-whale-not-found']['has-not-found'] );
		$data['data-whale-nav'] = $renderer->getNavData();
		$data['data-whale-theme-toggle'] = $data['data-whale-nav']['theme-toggle'] ?? false;
		$data['has-whale-site-notice'] = $siteNoticeHtml !== '';
		$data['html-whale-site-notice'] = $siteNoticeHtml;
		$data['data-whale-content-tools'] = $renderer->getContentToolsData();
		$data['has-whale-sidebar'] = $hasSidebar;
		$data['has-whale-section-tools'] = $this->shouldRenderSectionTools();
		$data['has-whale-live-recent'] = $hasDesktopLiveRecent;
		$data['has-whale-mobile-live-recent'] = $hasMobileLiveRecent;
		$data['data-whale-live-recent'] = $hasDesktopLiveRecent ? $renderer->getLiveRecentData() : [];
		$data['data-whale-mobile-live-recent'] = $hasMobileLiveRecent ? $renderer->getLiveRecentData( 'mobile' ) : [];
		$data['html-whale-right-ad'] = $hasSidebar ? $this->getAdHtml( 'right' ) : '';
		$data['html-whale-header-ad'] = $this->getAdHtml( 'header' );
		$data['html-whale-belowarticle-ad'] = $this->getAdHtml( 'belowarticle' );
		$data['html-whale-bottom-ad'] = $this->getAdHtml( 'bottom' );
		$data['has-whale-mobile-ad'] =
			( $wgWhaleMobileReplaceAd ?? false ) &&
			$this->getWhaleAdData( 'right' ) !== [];
		$shortUrlData = $renderer->getShortUrlData();
		$footerData = $renderer->getFooterData();
		$footerData['short-url'] = $shortUrlData;
		$footerData['has-short-url'] = !empty( $shortUrlData['has-short-url'] );
		$footerData['short-url-button-label'] = $shortUrlData['button-label'] ?? '';
		$data['data-whale-footer'] = $footerData;
		$data['data-whale-short-url'] = $shortUrlData;
		$data['data-whale-external-link-warning'] = $renderer->getExternalLinkWarningData();
		$data['data-whale-reference-modal'] = $renderer->getReferenceModalData();
		$data['data-whale-login-modal'] = $renderer->getLoginModalData();
		$data['data-whale-user-contribution-graph'] = $renderer->getUserContributionGraphData();
		$data['has-whale-user-contribution-graph'] =
			!empty( $data['data-whale-user-contribution-graph']['has-user-contribution-graph'] );
		$data['html-whale-scroll-up-icon'] = $renderer->getIcon( 'angle-up' );
		$data['html-whale-scroll-down-icon'] = $renderer->getIcon( 'angle-down' );
		$data['html-whale-scroll-toc-icon'] = $renderer->getIcon( 'list' );
		$data['html-whale-tools-icon'] = $renderer->getIcon( 'wrench' );
		$data['whale-tools-label'] = $this->msg( 'whale-tools' )->text();
		$data['whale-close-label'] = $this->msg( 'close' )->text();
		$data['whale-scroll-up-label'] = $this->msg( 'whale-scroll-up' )->text();
		$data['whale-scroll-down-label'] = $this->msg( 'whale-scroll-down' )->text();
		$data['whale-scroll-toc-label'] = $this->msg( 'whale-scroll-toc' )->text();
		$data['html-whale-adsense-script'] = $adClient !== ''
			? $this->renderAdsenseScript( $adClient )
			: '';
		$data['html-whale-debughtml'] =
			( $GLOBALS['wgShowDebug'] ?? false ) && class_exists( MWDebug::class )
				? MWDebug::getHTMLDebugLog()
				: '';
		$scriptsHtml = $data['html-scripts'] ?? '';
		if ( is_string( $scriptsHtml ) || ( is_object( $scriptsHtml ) && method_exists( $scriptsHtml, '__toString' ) ) ) {
			$data['html-scripts'] = $this->disableRocketLoaderForScripts( (string)$scriptsHtml );
		}
		$data['html-whale-rocket-loader-recovery'] = $this->renderRocketLoaderRecoveryScript();
		return $data;
	}

	private function disableRocketLoaderForScripts( string $html ): string {
		return preg_replace(
			'/<script\b(?![^>]*\bdata-cfasync\s*=)/i',
			'<script data-cfasync="false"',
			$html
		) ?? $html;
	}

	private function getVisibleSiteNoticeHtml( mixed $siteNoticeHtml ): string {
		if ( !is_string( $siteNoticeHtml ) ) {
			return '';
		}

		$siteNoticeHtml = trim( $siteNoticeHtml );
		if ( $siteNoticeHtml === '' ) {
			return '';
		}

		$withoutComments = preg_replace( '/<!--.*?-->/s', '', $siteNoticeHtml ) ?? '';
		$visibleText = trim(
			str_replace(
				"\xc2\xa0",
				' ',
				html_entity_decode( strip_tags( $withoutComments ), ENT_QUOTES | ENT_HTML5, 'UTF-8' )
			)
		);
		$hasVisibleMedia = preg_match( '/<(?:img|picture|svg|video|iframe|object|embed)\b/i', $withoutComments ) === 1;

		return $visibleText !== '' || $hasVisibleMedia ? $siteNoticeHtml : '';
	}

	private function normalizeLayoutWidth( mixed $width ): ?string {
		if ( $width === null || $width === false || $width === '' ) {
			return null;
		}

		return is_string( $width ) && in_array( $width, self::LAYOUT_WIDTHS, true )
			? $width
			: null;
	}

	/**
	 * @return array<string,mixed>
	 */
	private function getNotFoundPageData(): array {
		$title = $this->getTitle();
		$request = $this->getRequest();

		if (
			!$title ||
			$title->exists() ||
			$title->getNamespace() === NS_SPECIAL ||
			$request->getVal( 'action', 'view' ) !== 'view' ||
			$request->getCheck( 'oldid' )
		) {
			return [ 'has-not-found' => false ];
		}

		$pageName = $title->getPrefixedText();
		$searchUrl = SpecialPage::getTitleFor( 'Search' )->getLocalURL( [
			'search' => $pageName,
		] );
		$mainPage = Title::newMainPage();

		return [
			'has-not-found' => true,
			'html-icon' => ( new WhaleRenderer( $this ) )->getIcon( 'question' ),
			'title' => $this->msg( 'whale-not-found-title', $pageName )->text(),
			'description' => $this->msg( 'whale-not-found-description' )->text(),
			'html-actions' => implode( '', [
				Html::element( 'a', [
					'class' => 'whale-btn whale-btn-primary whale-not-found-action',
					'href' => $title->getLocalURL( [ 'action' => 'edit' ] ),
				], $this->msg( 'whale-not-found-create' )->text() ),
				Html::element( 'a', [
					'class' => 'whale-btn whale-btn-secondary whale-not-found-action',
					'href' => $searchUrl,
				], $this->msg( 'search' )->text() ),
				Html::element( 'a', [
					'class' => 'whale-btn whale-btn-secondary whale-not-found-action',
					'href' => $mainPage->getLocalURL(),
				], $this->msg( 'mainpage' )->text() ),
			] ),
		];
	}

	private function shouldRenderSidebar(): bool {
		$request = $this->getRequest();
		$title = $this->getTitle();

		if (
			!$title ||
			$title->getNamespace() === NS_SPECIAL ||
			$request->getCheck( 'handheld' ) ||
			$request->getVal( 'useformat' ) === 'mobile' ||
			$request->getCheck( 'mobileaction' )
		) {
			return false;
		}

		$viewportWidth = $request->getHeader( 'Sec-CH-Viewport-Width' );
		if ( is_string( $viewportWidth ) && ctype_digit( $viewportWidth ) ) {
			return (int)$viewportWidth >= 992;
		}

		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		return !$userOptionsLookup->getOption( $this->getUser(), 'whale-layout-sidebar' );
	}

	private function shouldRenderSectionTools(): bool {
		$title = $this->getTitle();
		if ( !$title || $title->getNamespace() === NS_SPECIAL ) {
			return false;
		}

		return $this->getRequest()->getVal( 'action', 'view' ) === 'view';
	}

	private function shouldRenderLiveRecent(): bool {
		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		return !$userOptionsLookup->getOption( $this->getUser(), 'whale-layout-sidebar' );
	}

	private function shouldRenderMobileLiveRecent( bool $hasSidebar ): bool {
		if ( !$this->shouldRenderLiveRecent() ) {
			return false;
		}

		$title = $this->getTitle();
		if ( !$hasSidebar && $title && $title->getNamespace() === NS_SPECIAL ) {
			return false;
		}

		return true;
	}

	private function isWhaleFeatureEnabled( string $configKey, string $optionKey ): bool {
		$configValue = $GLOBALS['wg' . $configKey] ?? true;
		if ( $configValue === false ) {
			return false;
		}

		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		return $userOptionsLookup->getOption( $this->getUser(), $optionKey, true ) !== false;
	}

	private function getAdHtml( string $position ): string {
		if ( $this->isAdHiddenByUser( $position ) ) {
			return '';
		}

		$adData = $this->getWhaleAdData( $position );
		return $adData === [] ? '' : $this->renderAdHtml( $adData );
	}

	private function isAdHiddenByUser( string $position ): bool {
		global $wgWhaleAdSetting, $wgWhaleAdGroup;

		if (
			!is_array( $wgWhaleAdSetting ?? null ) ||
			!isset( self::WHALE_AD_POSITIONS[$position] )
		) {
			return false;
		}

		if ( ( $wgWhaleAdGroup ?? null ) === 'differ' ) {
			$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
			$optionKey = self::WHALE_AD_POSITIONS[$position]['option'];
			if ( $userOptionsLookup->getOption( $this->getUser(), $optionKey ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @return array<string,mixed>
	 */
	private function getWhaleAdData( string $position ): array {
		if ( !isset( self::WHALE_AD_POSITIONS[$position] ) ) {
			return [];
		}

		$adSettings = $this->getWhaleAdSettings();
		$positionSetting = $adSettings[$position] ?? null;
		$positionConfig = $this->normalizeAdConfig( $positionSetting );
		$client = $this->getWhaleAdClient( $positionConfig );
		$slot = $this->normalizeAdValue( $positionConfig['slot'] ?? '' );

		if (
			$client === '' ||
			$slot === '' ||
			!preg_match( '/^\d+$/', $slot )
		) {
			return [];
		}

		$defaults = self::WHALE_AD_POSITIONS[$position];
		$adData = [
			'class' => $defaults['class'],
			'client' => $client,
			'slot' => $slot,
			'format' => $this->normalizeAdValue( $positionConfig['format'] ?? $defaults['format'] ),
			'full-width-responsive' => $this->normalizeAdBoolean(
				$positionConfig['fullWidthResponsive'] ??
				$positionConfig['full-width-responsive'] ??
				$defaults['fullWidthResponsive']
			),
			'layout' => $this->normalizeAdValue( $positionConfig['layout'] ?? '' ),
			'layout-key' => $this->normalizeAdValue(
				$positionConfig['layoutKey'] ??
				$positionConfig['layout-key'] ??
				''
			),
		];

		if ( $adData['format'] === '' ) {
			$adData['format'] = $defaults['format'];
		}

		return $adData;
	}

	/**
	 * @param array<string,mixed>|null $positionConfig
	 */
	private function getWhaleAdClient( ?array $positionConfig = null ): string {
		$adSettings = $this->getWhaleAdSettings();
		$client = $this->normalizeAdValue(
			$positionConfig['client'] ??
			$adSettings['client'] ??
			''
		);

		return preg_match( '/^ca-pub-\d+$/', $client ) ? $client : '';
	}

	/**
	 * @return array<string,mixed>
	 */
	private function getWhaleAdSettings(): array {
		global $wgWhaleAdSetting;

		return $this->normalizeAdConfig( $wgWhaleAdSetting ?? null );
	}

	/**
	 * @return array<string,mixed>
	 */
	private function normalizeAdConfig( mixed $config ): array {
		if ( !is_array( $config ) ) {
			return [ 'slot' => $config ];
		}

		$normalized = [];
		foreach ( $config as $key => $value ) {
			if ( is_string( $key ) ) {
				$normalized[$key] = $value;
			}
		}

		return $normalized;
	}

	private function normalizeAdValue( mixed $value ): string {
		if ( is_string( $value ) || is_int( $value ) || is_float( $value ) ) {
			return trim( (string)$value );
		}

		return '';
	}

	private function normalizeAdBoolean( mixed $value ): string {
		if ( is_bool( $value ) ) {
			return $value ? 'true' : 'false';
		}

		$normalized = strtolower( $this->normalizeAdValue( $value ) );
		return in_array( $normalized, [ '1', 'true', 'yes', 'on' ], true ) ? 'true' : 'false';
	}

	/**
	 * @param array<string,mixed> $adData
	 */
	private function renderAdHtml( array $adData ): string {
		$insAttributes = [
			'class' => 'adsbygoogle',
			'data-full-width-responsive' => $adData['full-width-responsive'] ?? 'true',
			'data-ad-client' => $adData['client'] ?? '',
			'data-ad-slot' => $adData['slot'] ?? '',
			'data-ad-format' => $adData['format'] ?? 'auto',
		];

		if ( ( $adData['layout'] ?? '' ) !== '' ) {
			$insAttributes['data-ad-layout'] = $adData['layout'];
		}

		if ( ( $adData['layout-key'] ?? '' ) !== '' ) {
			$insAttributes['data-ad-layout-key'] = $adData['layout-key'];
		}

		return Html::rawElement(
			'div',
			[ 'class' => $adData['class'] ?? '' ],
			Html::rawElement( 'ins', $insAttributes, '' )
		);
	}

	private function renderAdsenseScript( string $client ): string {
		return Html::element( 'script', [
			'async' => true,
			'src' => 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' .
				rawurlencode( $client ),
			'crossorigin' => 'anonymous',
		], '' );
	}

	private function renderLocalStorageFallbackScript(): string {
		return Html::rawElement( 'script', [ 'data-cfasync' => 'false' ], <<<'JS'
(function () {
	var storage;
	var isStorageUsable = function () {
		try {
			var key = '__whale_storage_test__';
			window.localStorage.setItem(key, key);
			window.localStorage.removeItem(key);
			return true;
		} catch (error) {
			return false;
		}
	};

	if ('localStorage' in window && isStorageUsable()) {
		return;
	}

	storage = {};
	try {
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: {
				get length() {
					return Object.keys(storage).length;
				},
				clear: function () {
					storage = {};
				},
				getItem: function (key) {
					key = String(key);
					return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
				},
				key: function (index) {
					return Object.keys(storage)[index] || null;
				},
				removeItem: function (key) {
					delete storage[String(key)];
				},
				setItem: function (key, value) {
					storage[String(key)] = String(value);
				}
			}
		});
	} catch (error) {}
}());
JS
		);
	}

	private function renderRocketLoaderRecoveryScript(): string {
		global $wgScriptPath;

		$scriptPath = is_string( $wgScriptPath ?? null ) ? rtrim( $wgScriptPath, '/' ) : '';
		return Html::element( 'script', [
			'data-cfasync' => 'false',
			'data-whale-recovery' => 'true',
			'src' => $scriptPath . '/skins/Whale/js/recovery.js?v=resource-loader-runtime-marker',
		], '' );
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getWhaleFooterData(): array {
		return $this->getComponent( 'footer' )->getTemplateData();
	}

	/**
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	public function getWhaleFooterIcons(): array {
		return $this->getFooterIcons();
	}

	/**
	 * @param array<string,mixed> $icon
	 */
	public function makeWhaleFooterIcon( array $icon ): string {
		return $this->makeFooterIcon( $icon );
	}

	/**
	 * @return array<string,array<string,mixed>>
	 */
	public function getWhalePersonalTools(): array {
		return $this->getStructuredPersonalTools();
	}

	/**
	 * @param string $key Item key
	 * @param array<string,mixed> $item
	 */
	public function makeWhaleListItem( string $key, array $item ): string {
		return $this->makeListItem( $key, $item );
	}

	/**
	 * @return array{light:array{primary:string,secondary:string},dark:array{primary:string,secondary:string}}
	 */
	private function resolveThemeColors( mixed $userTheme ): array {
		$userThemeSlug = is_string( $userTheme ) && isset( self::THEME_PALETTES[$userTheme] )
			? $userTheme
			: null;
		$siteThemeSlug = isset( $GLOBALS['wgWhaleTheme'] ) && is_string( $GLOBALS['wgWhaleTheme'] )
			? strtolower( $GLOBALS['wgWhaleTheme'] )
			: null;
		$themeSlug = $userThemeSlug ?? $siteThemeSlug;
		$hasTheme = $themeSlug !== null && isset( self::THEME_PALETTES[$themeSlug] );
		$colors = $hasTheme ? self::THEME_PALETTES[$themeSlug] : self::DEFAULT_THEME_COLORS;
		$primary = $userThemeSlug === null
			? $this->normalizeOptionalCssColor( $GLOBALS['wgWhalePrimaryColor'] ?? null )
			: null;
		$secondary = $userThemeSlug === null
			? $this->normalizeOptionalCssColor( $GLOBALS['wgWhaleSecondaryColor'] ?? null )
			: null;
		$configPrimary = $userThemeSlug === null
			? $this->normalizeOptionalCssColor( $GLOBALS['wgWhaleMainColor'] ?? null )
			: null;
		$configSecondary = $userThemeSlug === null
			? $this->normalizeOptionalCssColor( $GLOBALS['wgWhaleSecondColor'] ?? null )
			: null;
		$usesLegacyDefaultPalette = $primary === null && $secondary === null &&
			$configPrimary === self::LEGACY_DEFAULT_THEME_COLORS['primary'] &&
			$configSecondary === self::LEGACY_DEFAULT_THEME_COLORS['secondary'];

		if ( $usesLegacyDefaultPalette ) {
			$configPrimary = null;
			$configSecondary = null;
		}

		if ( $primary === null && ( !$hasTheme || $configPrimary !== self::DEFAULT_THEME_COLORS['light']['primary'] ) ) {
			$primary = $configPrimary;
		}

		if ( $secondary === null ) {
			$secondary = $configSecondary;
		}

		$hasPrimaryOverride = $primary !== null;
		$lightPrimary = $primary ?? $colors['light']['primary'];
		$darkPrimary = $primary ?? $colors['dark']['primary'];

		return [
			'light' => [
				'primary' => $lightPrimary,
				'secondary' => $secondary ?? ( $hasPrimaryOverride ? $this->deriveSecondaryColor(
					$lightPrimary,
					$colors['light']['secondary']
				) : $colors['light']['secondary'] ),
			],
			'dark' => [
				'primary' => $darkPrimary,
				'secondary' => $secondary ?? ( $hasPrimaryOverride ? $this->deriveSecondaryColor(
					$darkPrimary,
					$colors['dark']['secondary']
				) : $colors['dark']['secondary'] ),
			],
		];
	}

	private function normalizeOptionalCssColor( mixed $color ): ?string {
		return is_string( $color ) && preg_match( '/^#[0-9a-f]{6}$/i', $color )
			? strtoupper( $color )
			: null;
	}

	private function deriveSecondaryColor( string $primary, string $fallback ): string {
		$value = hexdec( substr( $primary, 1 ) ) - hexdec( '1A1415' );
		if ( !is_int( $value ) || $value < 0 ) {
			return $fallback;
		}

		return sprintf( '#%06X', $value );
	}

	private function getContrastColor( string $background ): string {
		$luminance = 0.0;
		$weights = [ 0.2126, 0.7152, 0.0722 ];

		foreach ( $weights as $index => $weight ) {
			$component = hexdec( substr( $background, 1 + ( $index * 2 ), 2 ) ) / 255;
			$linearComponent = $component <= 0.04045
				? $component / 12.92
				: ( ( $component + 0.055 ) / 1.055 ) ** 2.4;
			$luminance += $linearComponent * $weight;
		}

		$blackContrast = ( $luminance + 0.05 ) / 0.05;
		$whiteContrast = 1.05 / ( $luminance + 0.05 );

		return $whiteContrast >= $blackContrast ? '#FFFFFF' : '#000000';
	}

	/**
	 * Setup skin CSS.
	 *
	 * @param OutputPage $out OutputPage
	 */
	public function setupCss( OutputPage $out ): void {
		$out->addModuleStyles( [ 'skins.whale.styles' ] );
	}
}
