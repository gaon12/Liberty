<?php // @codingStandardsIgnoreLine

use MediaWiki\Content\Content;
use MediaWiki\Content\TextContent;
use MediaWiki\Html\Html;
use MediaWiki\Linker\Linker;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Title\Title;

if ( !class_exists( Html::class ) ) {
	class_alias( \Html::class, Html::class );
}

if ( !class_exists( Linker::class ) ) {
	class_alias( \Linker::class, Linker::class );
}

class WhaleRenderer {
	private SkinWhale $skin;

	public function __construct( SkinWhale $skin ) {
		$this->skin = $skin;
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getNavData(): array {
		global $wgSitename;

		$notifications = $this->getNotificationItems();

		return [
			'brand-href' => Title::newMainPage()->getLocalURL(),
			'brand-logo' => $this->getNavBarLogoUrl(),
			'brand-alt' => is_string( $wgSitename ?? null ) ? $wgSitename : 'Whale',
			'items' => array_merge( $this->getDefaultNavItems(), $this->getPortalItems( $this->parseNavbar() ) ),
			'theme-toggle' => $this->getThemeToggleData(),
			'data-login' => $this->getLoginData(),
			'has-notifications' => count( $notifications ) > 0,
			'notifications' => $notifications,
			'data-search' => $this->getSearchData(),
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getSearchData(): array {
		$skin = $this->skin;
		$request = $skin->getRequest();

		return [
			'action' => $skin->getConfig()->get( 'Script' ),
			'title-value' => SpecialPage::getTitleFor( 'Search' )->getPrefixedDBkey(),
			'placeholder' => $skin->msg( 'searchsuggest-search' )->text(),
			'input-title' => Linker::titleAttrib( 'search' ),
			'accesskey' => Linker::accesskey( 'search' ),
			'value' => $request->getText( 'search' ),
			'go-label' => $skin->msg( 'go' )->text(),
			'search-label' => $skin->msg( 'searchbutton' )->text(),
			'html-eye-icon' => $this->renderIcon( 'eye' ),
			'html-search-icon' => $this->renderIcon( 'search' ),
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getLoginData(): array {
		global $wgWhaleAvatarOptions, $wgWhaleAvatarStyle;

		$skin = $this->skin;
		$user = $skin->getUser();
		$linkRenderer = MediaWikiServices::getInstance()->getLinkRenderer();
		$isRegistered = $user->isRegistered();
		$data = [
			'is-registered' => $isRegistered,
			'html-sign-in-icon' => $this->renderIcon( 'sign-in' ),
			'html-sign-out-icon' => $this->renderIcon( 'sign-out' ),
			'login-title' => $skin->msg( 'whale-login' )->text(),
		];

		if ( !$isRegistered ) {
			return $data;
		}

		$personalTools = $skin->getWhalePersonalTools();
		$avatar = Html::rawElement( 'span', [
			'class' => 'profile-img profile-img-fallback',
			'aria-hidden' => 'true',
		], $this->renderIcon( 'user' ) );
		if ( class_exists( WhaleAvatar::class ) ) {
			$avatarStyle = is_string( $wgWhaleAvatarStyle ?? null ) ? $wgWhaleAvatarStyle : 'identicon';
			$avatarSrc = WhaleAvatar::createDataUri(
				WhaleAvatar::getSeedForUser( $user ),
				$avatarStyle,
				$this->getAvatarOptions( $wgWhaleAvatarOptions ?? [] )
			);

			if ( $avatarSrc !== null ) {
				$avatar = Html::element( 'img', [
					'class' => 'profile-img',
					'src' => $avatarSrc,
					'alt' => '',
					'width' => '64',
					'height' => '64',
					'decoding' => 'async',
				] );
			}
		}

		$links = [
			[
				'html' => $linkRenderer->makeKnownLink(
					Title::makeTitle( NS_USER, $user->getName() ),
					$user->getName(),
					[
						'id' => 'pt-userpage',
						'class' => 'whale-dropdown-item',
						'title' => Linker::titleAttrib( 'pt-userpage', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'pt-userpage' ),
					]
				),
			],
			[ 'is-divider' => true ],
		];

		if ( class_exists( 'EchoEvent' ) ) {
			$notiCount = 0;
			if (
				isset( $personalTools['notifications-alert'] ) &&
				isset( $personalTools['notifications-notice'] )
			) {
				$notiCount =
					self::getFirstLinkCounter( $personalTools['notifications-alert'] ) +
					self::getFirstLinkCounter( $personalTools['notifications-notice'] );
			}
			$links[] = [
				'html' => $linkRenderer->makeKnownLink(
					new TitleValue( NS_SPECIAL, 'Notifications' ),
					$skin->msg( 'notifications' )->plain() . ( $notiCount ? " ($notiCount)" : '' ),
					[
						'class' => 'whale-dropdown-item',
						'title' => $skin->msg( 'tooltip-pt-notifications-notice' )->text(),
					]
				),
			];
		}

		$links[] = [
			'html' => $linkRenderer->makeKnownLink(
				SpecialPage::getTitleFor( 'Contributions', $user->getName() ),
				$skin->msg( 'mycontris' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => Linker::titleAttrib( 'pt-mycontris', 'withaccess' ),
					'accesskey' => Linker::accesskey( 'pt-mycontris' ),
				]
			),
		];
		$links[] = [
			'html' => $linkRenderer->makeKnownLink(
				Title::makeTitle( NS_USER_TALK, $user->getName() ),
				$skin->msg( 'mytalk' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => Linker::titleAttrib( 'pt-mytalk', 'withaccess' ),
					'accesskey' => Linker::accesskey( 'pt-mytalk' ),
				]
			),
		];
		$links[] = [
			'html' => $linkRenderer->makeKnownLink(
				SpecialPage::getTitleFor( 'Watchlist' ),
				$skin->msg( 'watchlist' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => Linker::titleAttrib( 'pt-watchlist', 'withaccess' ),
					'accesskey' => Linker::accesskey( 'pt-watchlist' ),
				]
			),
		];
		$links[] = [ 'is-divider' => true ];
		$links[] = [
			'html' => $linkRenderer->makeKnownLink(
				SpecialPage::getTitleFor( 'Preferences' ),
				$skin->msg( 'preferences' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => Linker::titleAttrib( 'pt-preferences', 'withaccess' ),
					'accesskey' => Linker::accesskey( 'pt-preferences' ),
				]
			),
		];

		$logoutHrefValue = self::getFirstLinkField( $personalTools['logout'] ?? null, 'href' );
		$logoutHref = is_string( $logoutHrefValue ) ? $logoutHrefValue : '';
		$logoutTitle = Linker::titleAttrib( 'pt-logout', 'withaccess' );

		$data += [
			'html-avatar' => $avatar,
			'user-name' => $user->getName(),
			'links' => $links,
			'logout-href' => $logoutHref,
			'logout-title' => $logoutTitle,
			'logout-label' => $skin->msg( 'logout' )->text(),
		];

		return $data;
	}

	/**
	 * @param mixed $options
	 * @return array<string,mixed>
	 */
	private function getAvatarOptions( $options ): array {
		if ( !is_array( $options ) ) {
			return [];
		}

		$avatarOptions = [];
		foreach ( $options as $name => $value ) {
			if ( is_string( $name ) ) {
				$avatarOptions[$name] = $value;
			}
		}

		return $avatarOptions;
	}

	/**
	 * @return array<string,mixed>|false
	 */
	public function getThemeToggleData() {
		if ( ( $GLOBALS['wgWhaleEnableAnonThemeToggle'] ?? true ) === false ) {
			return false;
		}

		$mode = $this->skin->getRequest()->getCookie( 'whale-dark-mode' );
		$isDark = $mode === 'dark';

		return [
			'label' => $this->skin->msg( $isDark ? 'whale-theme-toggle-light' : 'whale-theme-toggle-dark' )->text(),
			'aria-pressed' => $isDark ? 'true' : 'false',
			'html-moon-icon' => $this->renderIcon( 'moon' ),
			'html-sun-icon' => $this->renderIcon( 'sun' ),
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getContentToolsData(): array {
		$skin = $this->skin;
		$user = $skin->getUser();
		$services = MediaWikiServices::getInstance();
		$title = $skin->getTitle();
		$action = $skin->getRequest()->getVal( 'action', 'view' );

		if ( !$title || $title->getNamespace() === NS_SPECIAL ) {
			return [ 'has-content-tools' => false ];
		}

		$linkRenderer = $services->getLinkRenderer();
		$permissionManager = $services->getPermissionManager();
		$watchlistManager = $services->getWatchlistManager();
		$revid = $skin->getRequest()->getText( 'oldid' );
		$editable = $permissionManager->quickUserCan( 'edit', $user, $title );
		$watched = $watchlistManager->isWatchedIgnoringRights( $user, $skin->getRelevantTitle() ) ? 'unwatch' : 'watch';
		$companionTitle = $title->isTalkPage() ? $title->getSubjectPage() : $title->getTalkPage();
		$buttons = [];
		if ( $action === 'view' ) {
			$buttons[] = [
				'html' => $linkRenderer->makeKnownLink(
					$title,
					new HtmlArmor( $this->renderIcon( 'star' ) . Html::element(
						'span',
						[ 'class' => 'whale-sr-only' ],
						$skin->msg( $watched )->text()
					) ),
					[
						'class' => 'whale-btn whale-btn-secondary tools-btn tools-watch',
						'id' => 'ca-' . $watched,
						'title' => Linker::titleAttrib( 'ca-' . $watched, 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-' . $watched ),
					],
					[ 'action' => $watched ]
				),
			];
		}

		if ( $action !== 'edit' ) {
			$buttons[] = [
				'html' => $linkRenderer->makeKnownLink(
					$title,
					new HtmlArmor( $this->renderIcon( $editable ? 'edit' : 'lock' ) . ' ' . $skin->msg( 'edit' )->escaped() ),
					[
						'class' => 'whale-btn whale-btn-primary tools-btn tools-edit',
						'id' => 'ca-edit',
						'title' => Linker::titleAttrib( 'ca-edit', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-edit' ),
					],
					$revid ? [ 'action' => 'edit', 'oldid' => $revid ] : [ 'action' => 'edit' ]
				),
			];
		}

		if ( $action === 'edit' || $action === 'history' ) {
			$buttons[] = [
				'html' => $linkRenderer->makeKnownLink(
					$title,
					$skin->msg( 'article' )->plain(),
					[
						'class' => 'whale-btn whale-btn-secondary tools-btn',
						'title' => Linker::titleAttrib( 'ca-nstab-main', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-nstab-main' ),
					]
				),
			];
		}

		if ( $action !== 'edit' ) {
			$isTalk = $title->isTalkPage() && $action !== 'history';
			$buttons[] = [
				'html' => $linkRenderer->makeKnownLink(
					$companionTitle,
					$skin->msg( $isTalk ? 'nstab-main' : 'talk' )->plain(),
					[
						'class' => 'whale-btn whale-btn-secondary tools-btn',
						'title' => Linker::titleAttrib( $isTalk ? 'ca-nstab-main' : 'ca-talk', 'withaccess' ),
						'accesskey' => Linker::accesskey( $isTalk ? 'ca-nstab-main' : 'ca-talk' ),
					]
				),
			];
		}

		if ( $action !== 'history' ) {
			$buttons[] = [
				'html' => $linkRenderer->makeKnownLink(
					$title,
					$skin->msg( 'history' )->plain(),
					[
						'class' => 'whale-btn whale-btn-secondary tools-btn',
						'title' => Linker::titleAttrib( 'ca-history', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-history' ),
					],
					[ 'action' => 'history' ]
				),
			];
		}

		$dropdownItems = [];
		if ( $title->inNamespaces( NS_USER, NS_USER_TALK ) ) {
			$dropdownItems[] = [
				'html' => $linkRenderer->makeKnownLink(
					SpecialPage::getTitleFor( 'Contributions', $title->getText() ),
					$skin->msg( 'contributions' )->escaped(),
					[
						'class' => 'whale-dropdown-item',
						'title' => Linker::titleAttrib( 't-contributions', 'withaccess' ),
						'accesskey' => Linker::accesskey( 't-contributions' ),
					]
				),
			];
		}

		$dropdownItems[] = [
			'html' => $linkRenderer->makeKnownLink(
				$title,
				$skin->msg( 'whale-purge' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => $skin->msg( 'whale-tooltip-purge' )->plain() . ' [alt+shift+p]',
					'accesskey' => 'p',
				],
				[ 'action' => 'purge' ]
			),
		];
		$dropdownItems[] = [
			'html' => $linkRenderer->makeKnownLink(
				SpecialPage::getTitleFor( 'Whatlinkshere', $title->getPrefixedDBkey() ),
				$skin->msg( 'whatlinkshere' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => Linker::titleAttrib( 't-whatlinkshere', 'withaccess' ),
					'accesskey' => Linker::accesskey( 't-whatlinkshere' ),
				]
			),
		];
		$dropdownItems[] = [
			'html' => $linkRenderer->makeKnownLink(
				$title,
				$skin->msg( 'whale-info' )->plain(),
				[
					'class' => 'whale-dropdown-item',
					'title' => $skin->msg( 'whale-tooltip-info' )->plain(),
				],
				[ 'action' => 'info' ]
			),
		];

		if ( $permissionManager->quickUserCan( 'move', $user, $title ) && $title->exists() ) {
			$dropdownItems[] = [
				'html' => $linkRenderer->makeKnownLink(
					SpecialPage::getTitleFor( 'Movepage', $title->getPrefixedDBkey() ),
					$skin->msg( 'move' )->plain(),
					[
						'class' => 'whale-dropdown-item',
						'title' => Linker::titleAttrib( 'ca-move', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-move' ),
					]
				),
			];
		}

		if ( $permissionManager->quickUserCan( 'protect', $user, $title ) ) {
			$protectionMsg = $this->isProtectedTitle( $title ) ? 'unprotect' : 'protect';
			$dropdownItems[] = [ 'is-divider' => true ];
			$dropdownItems[] = [
				'html' => $linkRenderer->makeKnownLink(
					$title,
					$skin->msg( $protectionMsg )->plain(),
					[
						'class' => 'whale-dropdown-item',
						'title' => Linker::titleAttrib( 'ca-' . $protectionMsg, 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-' . $protectionMsg ),
					],
					[ 'action' => 'protect' ]
				),
			];
		}

		if ( $permissionManager->quickUserCan( 'delete', $user, $title ) && $title->exists() ) {
			$dropdownItems[] = [ 'is-divider' => true ];
			$dropdownItems[] = [
				'html' => $linkRenderer->makeKnownLink(
					$title,
					$skin->msg( 'delete' )->plain(),
					[
						'class' => 'whale-dropdown-item',
						'title' => Linker::titleAttrib( 'ca-delete', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'ca-delete' ),
					],
					[ 'action' => 'delete' ]
				),
			];
		}

		return [
			'has-content-tools' => true,
			'buttons' => $buttons,
			'show-share' => $action === 'view',
			'share-label' => $skin->msg( 'whale-share' )->text(),
			'html-share-icon' => $this->renderIcon( 'share-square' ),
			'more-label' => $skin->msg( 'more' )->text(),
			'dropdown-items' => $dropdownItems,
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getLiveRecentData( string $mode = 'desktop' ): array {
		global $wgWhaleEnableLiveRC,
			$wgWhaleMaxRecent,
			$wgWhaleLiveRecentFixedHeight,
			$wgWhaleLiveRCRefreshInterval,
			$wgWhaleLiveRCArticleNamespaces,
			$wgWhaleLiveRCTalkNamespaces;

		if ( !$wgWhaleEnableLiveRC ) {
			return [ 'has-live-recent' => false ];
		}

		$skin = $this->skin;
		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		$fixedHeight = ( $wgWhaleLiveRecentFixedHeight ?? true ) !== false &&
			$userOptionsLookup->getOption( $skin->getUser(), 'whale-live-recent-fixed-height' ) !== false;
		$refreshRaw = $wgWhaleLiveRCRefreshInterval ?? 60;
		$refreshInterval = max( 10, is_numeric( $refreshRaw ) ? (int)$refreshRaw : 60 );
		$isMobile = $mode === 'mobile';
		$articleNamespaces = $this->normalizeRecentChangeNamespaces(
			$wgWhaleLiveRCArticleNamespaces ?? null,
			[ 0, 4, 10, 12, 14 ]
		);
		$talkNamespaces = $this->normalizeRecentChangeNamespaces(
			$wgWhaleLiveRCTalkNamespaces ?? null,
			[ 1, 3, 5, 7, 9, 11, 13, 15 ]
		);
		$feeds = [
			$this->getLiveRecentFeedData(
				$mode . '-live-recent-article-list',
				$skin->msg( 'recentchanges' )->text(),
				'sync',
				implode( '|', $articleNamespaces )
			),
		];

		if ( !$isMobile ) {
			$feeds[] = $this->getLiveRecentFeedData(
				$mode . '-live-recent-talk-list',
				$skin->msg( 'whale-recent-discussions' )->text(),
				'comments',
				implode( '|', $talkNamespaces )
			);
		}

		$maxRecent = is_numeric( $wgWhaleMaxRecent ?? null ) ? (int)$wgWhaleMaxRecent : 10;

		return [
			'has-live-recent' => true,
			'classes' => 'live-recent' . ( $fixedHeight ? ' live-recent-fixed-height' : '' ),
			'mode' => $mode,
			'limit' => $maxRecent,
			'refresh-ms' => $refreshInterval * 1000,
			'style' => '--whale-live-recent-limit: ' . $maxRecent .
				'; --whale-live-recent-refresh: ' . $refreshInterval . 's;',
			'feeds' => $feeds,
		];
	}

	/**
	 * @param mixed $namespaces
	 * @param array<int,int> $fallback
	 * @return array<int,int>
	 */
	private function normalizeRecentChangeNamespaces( mixed $namespaces, array $fallback ): array {
		if ( !is_array( $namespaces ) ) {
			return $fallback;
		}

		$normalized = array_values( array_unique( $this->normalizeIntegerList( $namespaces ) ) );
		return count( $normalized ) > 0 ? $normalized : $fallback;
	}

	/**
	 * @param array<mixed> $items
	 * @return array<int,int>
	 */
	private function normalizeIntegerList( array $items ): array {
		$normalized = [];
		foreach ( $items as $item ) {
			if ( is_int( $item ) || is_float( $item ) || is_string( $item ) || is_bool( $item ) ) {
				$normalized[] = (int)$item;
			}
		}

		return $normalized;
	}

	/**
	 * @return array<string,string>
	 */
	private function getLiveRecentFeedData(
		string $listId,
		string $heading,
		string $icon,
		string $namespaces
	): array {
		$linkRenderer = MediaWikiServices::getInstance()->getLinkRenderer();

		return [
			'list-id' => $listId,
			'heading' => $heading,
			'namespaces' => $namespaces,
			'html-icon' => $this->renderIcon( $icon ),
			'html-more-link' => $linkRenderer->makeKnownLink(
				SpecialPage::getTitleFor( 'Recentchanges' ),
				new HtmlArmor( '<span class="whale-sr-only">' .
					$this->skin->msg( 'whale-view-more' )->escaped() .
					'</span>' . $this->renderIcon( 'angle-right' ) ),
				[ 'class' => 'live-recent-more' ]
			),
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getFooterData(): array {
		$footerData = $this->skin->getWhaleFooterData();
		$categories = [];

		foreach ( $footerData as $category => $categoryData ) {
			$links = is_array( $categoryData ) ? ( $categoryData['array-items'] ?? [] ) : [];
			if ( !is_array( $links ) || !$links ) {
				continue;
			}
			$categoryName = preg_replace( '/^data-/', '', $category );
			if ( $categoryName === 'icons' ) {
				continue;
			}

			$items = [];
			foreach ( $links as $link ) {
				if ( !is_array( $link ) ) {
					continue;
				}
				$rawName = $link['name'] ?? null;
				$name = is_string( $rawName ) ? $rawName : '';
				$rawHtml = $link['html'] ?? '';
				$items[] = [
					'class' => 'footer-' . $categoryName . '-' . Sanitizer::escapeClass( $name ),
					'html' => is_string( $rawHtml ) ? $rawHtml : '',
				];
			}

			$categories[] = [
				'class' => 'footer-' . Sanitizer::escapeClass( $categoryName ?? '' ),
				'items' => $items,
			];
		}

		$iconBlocks = [];
		foreach ( $this->skin->getWhaleFooterIcons() as $blockName => $footerIcons ) {
			$html = '';
			foreach ( $footerIcons as $icon ) {
				$html .= $this->skin->makeWhaleFooterIcon( $icon );
			}
			$iconBlocks[] = [
				'class' => 'footer-' . Sanitizer::escapeClass( $blockName ) . 'ico',
				'html' => $html,
			];
		}

		$stylePath = $this->skin->getConfig()->get( 'StylePath' );
		$stylePath = is_string( $stylePath ) ? $stylePath : '';

		$iconBlocks[] = [
			'class' => 'whale-footer-brand',
			'html' => Html::rawElement( 'a', [ 'href' => 'https://github.com/gaon12/Whale' ], Html::element( 'img', [
				'src' => $stylePath . '/Whale/img/whale_footer_img.png',
				'class' => 'whale-footer-brand-img',
				'alt' => 'Designed by Whale',
				'width' => '78',
				'height' => '31',
				'decoding' => 'async',
			] ) ),
		];

		return [
			'categories' => $categories,
			'icon-blocks' => $iconBlocks,
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getShortUrlData(): array {
		global $wgWhaleEnableShortUrls;

		$skin = $this->skin;
		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		$title = $skin->getTitle();
		$enabled = ( $wgWhaleEnableShortUrls ?? true ) !== false &&
			$userOptionsLookup->getOption( $skin->getUser(), 'whale-short-url', true ) !== false;

		if ( !$enabled || !$title || $title->getNamespace() === NS_SPECIAL ) {
			return [ 'has-short-url' => false ];
		}

		$revisionId = $this->getLatestRevisionId( $title );
		if ( $revisionId <= 0 ) {
			return [ 'has-short-url' => false ];
		}

		$code = WhaleShortUrl::encode( $revisionId );
		$url = WhaleShortUrl::buildUrl( $code );

		return [
			'has-short-url' => true,
			'url' => $url,
			'html-icon' => $this->renderIcon( 'link' ),
			'button-label' => $skin->msg( 'whale-short-url-button' )->text(),
			'modal-title' => $skin->msg( 'whale-short-url-title' )->text(),
			'description' => $skin->msg( 'whale-short-url-description' )->text(),
			'copy-label' => $skin->msg( 'whale-short-url-copy' )->text(),
			'close-label' => $skin->msg( 'close' )->text(),
		];
	}

	/**
	 * @return array<string,string|bool>
	 */
	public function getExternalLinkWarningData(): array {
		$skin = $this->skin;

		return [
			'enabled' => true,
			'title' => $skin->msg( 'whale-external-link-title' )->text(),
			'description' => $skin->msg( 'whale-external-link-description' )->text(),
			'cancel-label' => $skin->msg( 'cancel' )->text(),
			'continue-label' => $skin->msg( 'whale-external-link-continue' )->text(),
			'show-decoded-label' => $skin->msg( 'whale-external-link-show-decoded' )->text(),
			'show-original-label' => $skin->msg( 'whale-external-link-show-original' )->text(),
			'close-label' => $skin->msg( 'close' )->text(),
		];
	}

	/**
	 * @return array<string,string>
	 */
	public function getReferenceModalData(): array {
		$skin = $this->skin;

		return [
			'title' => $skin->msg( 'whale-reference-title' )->text(),
			'jump-label' => $skin->msg( 'whale-reference-jump' )->text(),
			'close-label' => $skin->msg( 'close' )->text(),
		];
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getLoginModalData(): array {
		$skin = $this->skin;
		return [
			'show-login-modal' => $skin->getUser()->isAnon(),
			'title' => $skin->msg( 'whale-login' )->text(),
			'alert-label' => $skin->msg( 'error' )->text(),
			'name-label' => $skin->msg( 'userlogin-yourname' )->text(),
			'name-placeholder' => $skin->msg( 'userlogin-yourname-ph' )->text(),
			'password-label' => $skin->msg( 'userlogin-yourpassword' )->text(),
			'password-placeholder' => $skin->msg( 'userlogin-yourpassword-ph' )->text(),
			'remember-label' => $skin->msg( 'whale-remember' )->text(),
			'login-label' => $skin->msg( 'whale-login-btn' )->text(),
			'join-html' => MediaWikiServices::getInstance()->getLinkRenderer()->makeKnownLink(
				SpecialPage::getTitleFor( 'Userlogin' ),
				$skin->msg( 'userlogin-joinproject' ),
				[ 'class' => 'whale-login-join' ],
				[ 'type' => 'signup' ]
			),
			'forgot-html' => MediaWikiServices::getInstance()->getLinkRenderer()->makeKnownLink(
				SpecialPage::getTitleFor( 'PasswordReset' ),
				$skin->msg( 'whale-forgot-pw' )->plain(),
				[ 'class' => 'whale-login-help' ]
			),
			'alternate-html' => MediaWikiServices::getInstance()->getLinkRenderer()->makeKnownLink(
				SpecialPage::getTitleFor( 'Userlogin' ),
				$skin->msg( 'whale-login-alter' )->plain(),
				[ 'class' => 'whale-login-help' ]
			),
			'close-label' => $skin->msg( 'close' )->text(),
		];
	}

	public function getIcon( string $icon ): string {
		return $this->renderIcon( $icon );
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getUserContributionGraphData(): array {
		global $wgWhaleEnableUserContributionGraph,
			$wgWhaleContributionGraphDays,
			$wgWhaleContributionGraphNamespaces,
			$wgWhaleContributionGraphCacheTTL,
			$wgWhaleContributionGraphLevels;

		$skin = $this->skin;
		$userOptionsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		$title = $skin->getTitle();
		$enabled = ( $wgWhaleEnableUserContributionGraph ?? true ) !== false &&
			$userOptionsLookup->getOption( $skin->getUser(), 'whale-user-contribution-graph', true ) !== false;

		if (
			!$enabled ||
			!$title ||
			$title->getNamespace() !== NS_USER ||
			strpos( $title->getDBkey(), '/' ) !== false
		) {
			return [ 'has-user-contribution-graph' => false ];
		}

		$daysRaw = $wgWhaleContributionGraphDays ?? 365;
		$days = max( 7, min( 730, is_numeric( $daysRaw ) ? (int)$daysRaw : 365 ) );
		$levels = is_array( $wgWhaleContributionGraphLevels ?? null )
			? array_values( array_filter( $this->normalizeIntegerList( $wgWhaleContributionGraphLevels ), static function ( int $level ) {
				return $level > 0;
			} ) )
			: [ 1, 3, 6, 10 ];
		sort( $levels );
		if ( count( $levels ) === 0 ) {
			$levels = [ 1, 3, 6, 10 ];
		}

		$namespaces = is_array( $wgWhaleContributionGraphNamespaces ?? null )
			? array_values( array_unique( $this->normalizeIntegerList( $wgWhaleContributionGraphNamespaces ) ) )
			: null;
		$ttlRaw = $wgWhaleContributionGraphCacheTTL ?? 3600;
		$ttl = max( 60, is_numeric( $ttlRaw ) ? (int)$ttlRaw : 3600 );
		$userName = $title->getText();
		$graph = new WhaleContributionGraph( $this->skin );
		$counts = $graph->getCounts( $userName, $days, $namespaces, $ttl );
		$graphData = $graph->buildGraph( $counts, $days, $levels );
		$total = array_sum( $counts );

		return [
			'has-user-contribution-graph' => true,
			'title' => $skin->msg( 'whale-contrib-graph-title', $userName )->text(),
			'summary' => $skin->msg( 'whale-contrib-graph-summary', $skin->getLanguage()->formatNum( $total ), $skin->getLanguage()->formatNum( $days ) )->text(),
			'weeks' => $graphData['weeks'],
			'legend' => $graphData['legend'],
		];
	}

	private function getNavBarLogoUrl(): string {
		global $wgResourceBasePath, $wgWhaleNavBarLogoImage;

		if ( is_string( $wgWhaleNavBarLogoImage ?? null ) && trim( $wgWhaleNavBarLogoImage ) !== '' ) {
			return $wgWhaleNavBarLogoImage;
		}

		$resourceBasePath = is_string( $wgResourceBasePath ?? null )
			? rtrim( $wgResourceBasePath, '/' )
			: '';

		return $resourceBasePath . '/skins/Whale/img/logo.png';
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	private function getDefaultNavItems(): array {
		$linkRenderer = MediaWikiServices::getInstance()->getLinkRenderer();
		$skin = $this->skin;

		return [
			[
				'classes' => 'whale-navbar-item',
				'html-link' => $linkRenderer->makeKnownLink(
					new TitleValue( NS_SPECIAL, 'Recentchanges' ),
					new HtmlArmor( $this->renderIcon( 'sync' ) . '<span class="hide-title">' . $skin->msg( 'recentchanges' )->escaped() . '</span>' ),
					[
						'class' => 'whale-navbar-link',
						'title' => Linker::titleAttrib( 'n-recentchanges', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'n-recentchanges' ),
					]
				),
			],
			[
				'classes' => 'whale-navbar-item',
				'html-link' => $linkRenderer->makeKnownLink(
					new TitleValue( NS_SPECIAL, 'Randompage' ),
					new HtmlArmor( $this->renderIcon( 'random' ) . '<span class="hide-title">' . $skin->msg( 'randompage' )->escaped() . '</span>' ),
					[
						'class' => 'whale-navbar-link',
						'title' => Linker::titleAttrib( 'n-randompage', 'withaccess' ),
						'accesskey' => Linker::accesskey( 'n-randompage' ),
					]
				),
			],
		];
	}

	/**
	 * @param array<int,array<string,mixed>> $contents
	 * @return array<int,array<string,mixed>>
	 */
	private function getPortalItems( array $contents ): array {
		$skin = $this->skin;
		$user = $skin->getUser();
		$services = MediaWikiServices::getInstance();
		$userGroups = $services->getUserGroupManager()->getUserGroups( $user );
		$userRights = $services->getPermissionManager()->getUserPermissions( $user );
		$items = [];

		foreach ( $contents as $content ) {
			if ( !$this->canShowPortalItem( $content, $userGroups, $userRights ) ) {
				continue;
			}

			$children = [];
			foreach ( self::normalizePortalItemList( $content['children'] ?? null ) as $child ) {
				if ( !$this->canShowPortalItem( $child, $userGroups, $userRights ) ) {
					continue;
				}

				$subItems = [];
				foreach ( self::normalizePortalItemList( $child['children'] ?? null ) as $sub ) {
					if ( $this->canShowPortalItem( $sub, $userGroups, $userRights ) ) {
						$subItems[] = $this->buildPortalChildItem( $sub );
					}
				}

				$children[] = $this->buildPortalChildItem( $child, $subItems );
			}

			$classes = array_merge(
				[ 'whale-dropdown', 'whale-navbar-item' ],
				self::normalizeClassList( $content['wrapperClasses'] ?? null )
			);
			$linkClasses = array_merge(
				self::normalizeClassList( $content['classes'] ?? null ),
				[ 'whale-navbar-link' ]
			);
			$hasChildren = count( $children ) > 0;
			if ( $hasChildren ) {
				$linkClasses[] = 'whale-dropdown-toggle';
				$linkClasses[] = 'whale-dropdown-toggle-fix';
			}

			$items[] = [
				'classes' => implode( ' ', array_map( [ Sanitizer::class, 'escapeClass' ], $classes ) ),
				'html-link' => $this->buildPortalLink( $content, $linkClasses, $hasChildren ),
				'has-children' => $hasChildren,
				'children' => $children,
			];
		}

		return $items;
	}

	/**
	 * @param array<string,mixed> $item
	 * @param array<int,string> $userGroups
	 * @param array<int,string> $userRights
	 */
	private function canShowPortalItem( array $item, array $userGroups, array $userRights ): bool {
		return !(
			( !empty( $item['right'] ) && !in_array( $item['right'], $userRights ) ) ||
			( !empty( $item['group'] ) && !in_array( $item['group'], $userGroups ) )
		);
	}

	/**
	 * @param array<string,mixed> $item
	 * @param array<int,array<string,mixed>> $children
	 * @return array<string,mixed>
	 */
	private function buildPortalChildItem( array $item, array $children = [] ): array {
		$classes = array_merge( self::normalizeClassList( $item['classes'] ?? null ), [ 'whale-dropdown-item' ] );
		$hasChildren = count( $children ) > 0;
		$wrapperClasses = [ 'whale-dropdown-child' ];
		if ( $hasChildren ) {
			$classes[] = 'whale-dropdown-toggle';
			$classes[] = 'whale-dropdown-toggle-sub';
			$wrapperClasses[] = 'whale-dropdown-subitem';
		}

		return [
			'classes' => implode( ' ', array_map( [ Sanitizer::class, 'escapeClass' ], $wrapperClasses ) ),
			'html-link' => $this->buildPortalLink( $item, $classes, $hasChildren, true ),
			'has-children' => $hasChildren,
			'children' => $children,
		];
	}

	/**
	 * @param array<string,mixed> $item
	 * @param array<int,string> $classes
	 */
	private function buildPortalLink( array $item, array $classes, bool $hasChildren, bool $isChild = false ): string {
		global $wgWhaleNavbarParentLinks;

		$useParentLink = !$isChild && $hasChildren && !empty( $wgWhaleNavbarParentLinks );
		$isToggleButton = $hasChildren && !$useParentLink;
		$attrs = [
			'class' => implode( ' ', array_map( [ Sanitizer::class, 'escapeClass' ], $classes ) ),
			'title' => $item['title'] ?? '',
		];
		if ( !$isToggleButton ) {
			$attrs['href'] = $item['href'] ?? '#';
		}
		if ( !empty( $item['access'] ) ) {
			$attrs['accesskey'] = $item['access'];
		}
		if ( $hasChildren ) {
			if ( !$useParentLink ) {
				$attrs['data-whale-toggle'] = $isChild ? 'submenu' : 'dropdown';
				$attrs['role'] = 'button';
				$attrs['aria-expanded'] = 'false';
			}
			$attrs['aria-haspopup'] = 'true';
		}
		if ( $isToggleButton ) {
			$attrs['type'] = 'button';
		}

		$html = '';
		$icon = $item['icon'] ?? null;
		if ( is_string( $icon ) ) {
			$html .= $this->renderIcon( $icon );
		}
		$text = $item['text'] ?? null;
		if ( is_string( $text ) && $text !== '' ) {
			$html .= Html::element( 'span', [ 'class' => $isChild ? '' : 'hide-title' ], $text );
		}

		return Html::rawElement( $isToggleButton ? 'button' : 'a', $attrs, $html );
	}

	/**
	 * Normalize a parsed navbar 'children' value into a list of items with
	 * string keys, dropping anything that is not an array.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function normalizePortalItemList( mixed $value ): array {
		if ( !is_array( $value ) ) {
			return [];
		}

		$items = [];
		foreach ( $value as $entry ) {
			if ( !is_array( $entry ) ) {
				continue;
			}
			$item = [];
			foreach ( $entry as $key => $entryValue ) {
				$item[(string)$key] = $entryValue;
			}
			$items[] = $item;
		}

		return $items;
	}

	/**
	 * Normalize a parsed navbar class list into non-empty strings.
	 *
	 * @return array<int,string>
	 */
	private static function normalizeClassList( mixed $classes ): array {
		if ( !is_array( $classes ) ) {
			return [];
		}

		$list = [];
		foreach ( $classes as $class ) {
			if ( is_string( $class ) && $class !== '' ) {
				$list[] = $class;
			}
		}

		return $list;
	}

	/**
	 * Safely read a field from the first link of a structured personal tool.
	 */
	private static function getFirstLinkField( mixed $tool, string $field ): mixed {
		if ( !is_array( $tool ) ) {
			return null;
		}
		$links = $tool['links'] ?? null;
		if ( !is_array( $links ) ) {
			return null;
		}
		$first = $links[0] ?? null;
		if ( !is_array( $first ) ) {
			return null;
		}

		return $first[$field] ?? null;
	}

	/**
	 * Read the Echo notification counter from a structured personal tool.
	 */
	private static function getFirstLinkCounter( mixed $tool ): int {
		$data = self::getFirstLinkField( $tool, 'data' );
		if ( !is_array( $data ) ) {
			return 0;
		}
		$counter = $data['counter-num'] ?? null;

		return is_numeric( $counter ) ? (int)$counter : 0;
	}

	/**
	 * @return array<int,array<string,string>>
	 */
	private function getNotificationItems(): array {
		$personalTools = $this->skin->getWhalePersonalTools();
		$items = [];
		foreach ( [ 'notifications-alert', 'notifications-notice' ] as $key ) {
			if (
				isset( $personalTools[$key] ) &&
				self::getFirstLinkCounter( $personalTools[$key] ) > 0
			) {
				$items[] = [ 'html' => $this->skin->makeWhaleListItem( $key, $personalTools[$key] ) ];
			}
		}

		return $items;
	}

	/**
	 * Parse [[MediaWiki:Whale-Navbar]].
	 *
	 * @return array<int,array<string,mixed>>
	 */
	protected function parseNavbar(): array {
		$skin = $this->skin;
		$user = $skin->getUser();
		$userLang = $skin->getLanguage()->getCode();
		$globalData = $this->getCachedContentText( Title::newFromText( 'Whale-Navbar', NS_MEDIAWIKI ) );
		$globalLangData = $this->getCachedContentText( Title::newFromText( 'Whale-Navbar/' . $userLang, NS_MEDIAWIKI ) );
		$userData = $user->isRegistered()
			? $this->getCachedContentText( Title::newFromText( $user->getName() . '/Whale-Navbar', NS_USER ) )
			: '';
		$data = $userData !== '' ? $userData : ( $globalLangData !== '' ? $globalLangData : $globalData );
		if ( trim( $data ) === '' ) {
			return [];
		}

		return ( new WhaleNavbarParser( $this->skin ) )->parse( $data );
	}

	private function getLatestRevisionId( Title $title ): int {
		$db = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnection( DB_REPLICA );
		$row = $db->selectRow(
			'page',
			[ 'page_latest' ],
			[
				'page_namespace' => $title->getNamespace(),
				'page_title' => $title->getDBkey(),
			],
			__METHOD__
		);
		if ( $row ) {
			$latest = $row->page_latest ?? null;
			if ( is_numeric( $latest ) && (int)$latest > 0 ) {
				return (int)$latest;
			}
		}

		$wikiPage = MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $title );

		return $wikiPage->getLatest();
	}

	private function renderIcon( ?string $icon ): string {
		if ( $icon === null || !preg_match( '/^[a-z0-9-]+$/i', $icon ) ) {
			return '';
		}

		$iconPaths = [
			'angle-down' => '<path d="m6 9 6 6 6-6"/>',
			'angle-right' => '<path d="m9 18 6-6-6-6"/>',
			'angle-up' => '<path d="m18 15-6-6-6 6"/>',
			'bell' => '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
			'book' => '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/>',
			'calendar' => '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
			'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
			'cog' => '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
			'comment' => '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
			'comments' => '<path d="M21 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M7 9h10"/><path d="M7 13h6"/>',
			'edit' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
			'envelope' => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
			'external-link' => '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
			'eye' => '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
			'file' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',
			'folder' => '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
			'globe' => '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/>',
			'heart' => '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
			'home' => '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
			'image' => '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
			'info' => '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
			'list' => '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
			'lock' => '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
			'minus' => '<path d="M5 12h14"/>',
			'moon' => '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
			'plus' => '<path d="M12 5v14"/><path d="M5 12h14"/>',
			'question' => '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.3 2c-.8.7-1.4 1.2-1.4 2.5"/><path d="M12 17h.01"/>',
			'link' => '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
			'random' => '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
			'search' => '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
			'share-square' => '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4"/><path d="m8.6 13.5 6.8 4"/>',
			'sign-in' => '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
			'sign-out' => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
			'star' => '<path d="m12 2 3 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.9 3 1.1-6.5-4.7-4.6L9 8z"/>',
			'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
			'sync' => '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
			'tag' => '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><path d="M7.5 7.5h.01"/>',
			'tags' => '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><path d="M7.5 7.5h.01"/><path d="M17 7 21 11"/>',
			'upload' => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8 12 3 7 8"/><path d="M12 3v12"/>',
			'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
			'users' => '<path d="M16 21a6 6 0 0 0-12 0"/><circle cx="10" cy="8" r="4"/><path d="M22 21a5 5 0 0 0-4-4.9"/><path d="M17 4.3a4 4 0 0 1 0 7.4"/>',
			'wrench' => '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>',
		];

		$iconKey = strtolower( $icon );
		if ( !isset( $iconPaths[$iconKey] ) ) {
			return '';
		}

		$lucideNames = [
			'angle-down' => 'chevron-down',
			'angle-right' => 'chevron-right',
			'angle-up' => 'chevron-up',
			'book' => 'book-open',
			'cog' => 'settings',
			'comment' => 'message-circle',
			'comments' => 'messages-square',
			'edit' => 'pencil',
			'envelope' => 'mail',
			'file' => 'file-text',
			'globe' => 'globe-2',
			'home' => 'house',
			'question' => 'circle-help',
			'random' => 'shuffle',
			'share-square' => 'share-2',
			'sign-in' => 'log-in',
			'sign-out' => 'log-out',
			'sync' => 'refresh-cw',
			'user' => 'user-round',
			'users' => 'users-round',
		];
		$lucideName = $lucideNames[$iconKey] ?? $iconKey;
		$classes = [ 'whale-icon', 'lucide', 'lucide-' . $lucideName, 'whale-icon-' . $iconKey ];

		return Html::rawElement( 'svg', [
			'aria-hidden' => 'true',
			'class' => $classes,
			'data-lucide' => $lucideName,
			'focusable' => 'false',
			'viewBox' => '0 0 24 24',
			'xmlns' => 'http://www.w3.org/2000/svg',
		], $iconPaths[$iconKey] );
	}

	private function getContentText( ?Content $content = null ): ?string {
		if ( $content === null ) {
			return '';
		}

		if ( $content instanceof TextContent ) {
			return $content->getText();
		}

		return null;
	}

	private function getCachedContentText( ?Title $title ): string {
		if ( $title === null ) {
			return '';
		}

		$services = MediaWikiServices::getInstance();
		$cache = $services->getMainWANObjectCache();
		$cacheKey = $cache->makeKey(
			'whale',
			'whale-nav-content',
			$title->getNamespace(),
			$title->getDBkey(),
			$title->getLatestRevID()
		);

		return $cache->getWithSetCallback(
			$cacheKey,
			6 * 60 * 60,
			function () use ( $title ) {
				return $this->getContentText( $this->getContentOfTitle( $title ) ) ?: '';
			}
		);
	}

	private function getContentOfTitle( Title $title ): ?Content {
		$wikiPageFactory = MediaWikiServices::getInstance()->getWikiPageFactory();
		$page = $wikiPageFactory->newFromTitle( $title );

		return $page->getContent( RevisionRecord::RAW );
	}

	private function isProtectedTitle( Title $title ): bool {
		return MediaWikiServices::getInstance()->getRestrictionStore()->isProtected( $title );
	}
}
