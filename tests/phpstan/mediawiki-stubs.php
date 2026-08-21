<?php

namespace {

if ( !defined( 'DB_REPLICA' ) ) {
	define( 'DB_REPLICA', 0 );
}

if ( !defined( 'NS_SPECIAL' ) ) {
	define( 'NS_SPECIAL', -1 );
}

if ( !defined( 'NS_USER' ) ) {
	define( 'NS_USER', 2 );
}

if ( !defined( 'NS_USER_TALK' ) ) {
	define( 'NS_USER_TALK', 3 );
}

if ( !defined( 'NS_MEDIAWIKI' ) ) {
	define( 'NS_MEDIAWIKI', 8 );
}

function wfLoadSkin( string $skin ): void {
}

function wfMessage( string $key, mixed ...$params ): Message {
	return new Message();
}

class Message {
	public function text(): string {
		return '';
	}

	public function plain(): string {
		return '';
	}

	public function parse(): string {
		return '';
	}

	public function escaped(): string {
		return '';
	}

	public function isDisabled(): bool {
		return false;
	}
}

class Config {
	public function get( string $name ): mixed {
		return null;
	}
}

class Language {
	public function getCode(): string {
		return '';
	}

	public function formatNum( mixed $number ): string {
		return '';
	}
}

class WebResponse {
	public function header( string $header, bool $replace = true, int $statusCode = 0 ): void {
	}
}

class WebRequest {
	public function getCookie( string $key ): ?string {
		return null;
	}

	public function getText( string $key, string $default = '' ): string {
		return $default;
	}

	public function getVal( string $name, ?string $default = null ): ?string {
		return $default;
	}

	public function getCheck( string $name ): bool {
		return false;
	}

	public function getHeader( string $name ): string|false {
		return false;
	}

	public function response(): WebResponse {
		return new WebResponse();
	}
}

class User {
	public function isAnon(): bool {
		return false;
	}

	public function isRegistered(): bool {
		return true;
	}

	public function getName(): string {
		return '';
	}

	public function getId(): int {
		return 0;
	}

	public function getEmail(): string {
		return '';
	}

	public function getEmailAuthenticationTimestamp(): ?string {
		return null;
	}
}

class OutputPage {
	public string $mBodytext = '';

	public function addMeta( string $name, string $value ): void {
	}

	/**
	 * @param string|string[] $modules
	 */
	public function addModules( string|array $modules ): void {
	}

	public function addInlineStyle( string $style ): void {
	}

	public function getPageTitle(): string {
		return '';
	}

	public function getSkin(): ?Skin {
		return null;
	}

	public function showErrorPage( string $title, string $msg ): void {
	}

	public function disable(): void {
	}
}

class Skin {
	public function getSkinName(): string {
		return '';
	}

	public function getUser(): User {
		return new User();
	}

	public function getTitle(): ?MediaWiki\Title\Title {
		return null;
	}

	public function getSkin(): self {
		return $this;
	}

	public function getOutput(): OutputPage {
		return new OutputPage();
	}

	public function getRequest(): WebRequest {
		return new WebRequest();
	}

	public function getConfig(): Config {
		return new Config();
	}

	public function msg( string $key, mixed ...$params ): Message {
		return new Message();
	}

	public function getLanguage(): Language {
		return new Language();
	}

	public function getRelevantTitle(): MediaWiki\Title\Title {
		return new MediaWiki\Title\Title();
	}

	public function getComponent( string $name ): SkinComponent {
		return new SkinComponent();
	}

	/**
	 * @return array<string,array<string,mixed>>
	 */
	public function getStructuredPersonalTools(): array {
		return [];
	}

	/**
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	public function getFooterIcons(): array {
		return [];
	}

	/**
	 * @param array<string,mixed> $icon
	 */
	public function makeFooterIcon( array $icon ): string {
		return '';
	}

	/**
	 * @param array<string,mixed> $item
	 */
	public function makeListItem( string $key, array $item ): string {
		return '';
	}
}

class SkinMustache extends Skin {
	public function initPage( MediaWiki\Output\OutputPage $out ): void {
	}

	/**
	 * @return array<string,mixed>
	 */
	public function getTemplateData(): array {
		return [];
	}
}

class SkinComponent {
	/**
	 * @return array<string,mixed>
	 */
	public function getTemplateData(): array {
		return [];
	}
}

class SpecialPage {
	public function __construct( string $name = '' ) {
	}

	public static function getTitleFor( string $name, ?string $subPage = null ): MediaWiki\Title\Title {
		return new MediaWiki\Title\Title();
	}

	public function setHeaders(): void {
	}

	public function getOutput(): OutputPage {
		return new OutputPage();
	}

	public function getRequest(): WebRequest {
		return new WebRequest();
	}

	public function getConfig(): Config {
		return new Config();
	}

	public function getUser(): User {
		return new User();
	}
}

class TitleValue {
	public function __construct( int $namespace, string $title ) {
	}
}

class HtmlArmor {
	public function __construct( string $html ) {
	}
}

class Parser {
}

class StripState {
}

class Preferences {
}

class Sanitizer {
	public static function decodeCharReferences( string $text ): string {
		return $text;
	}

	public static function escapeClass( string $class ): string {
		return $class;
	}
}

class MWDebug {
	public static function getHTMLDebugLog(): string {
		return '';
	}
}

class ArticleMetaDescription {
}

class Description2 {
}

class EchoEvent {
}

class Title {
	public static function newMainPage(): self {
		return new self();
	}

	public static function newFromText( string $text, int $namespace = 0 ): ?self {
		return new self();
	}

	public function getLocalURL( array $query = [] ): string {
		return '';
	}
}

class Html {
	/**
	 * @param array<string,mixed> $attrs
	 */
	public static function rawElement( string $element, array $attrs = [], string $contents = '' ): string {
		return '';
	}

	/**
	 * @param array<string,mixed> $attrs
	 */
	public static function element( string $element, array $attrs = [], string $contents = '' ): string {
		return '';
	}
}

class Linker {
	public static function titleAttrib( string $name, string $options = '' ): string {
		return '';
	}
}

}

namespace MediaWiki {
	class MediaWikiServices {
		public static function getInstance(): self {
			return new self();
		}

		public function getUserOptionsLookup(): UserOptionsLookup {
			return new UserOptionsLookup();
		}

		public function getUserGroupManager(): UserGroupManager {
			return new UserGroupManager();
		}

		public function getPermissionManager(): PermissionManager {
			return new PermissionManager();
		}

		public function getLinkRenderer(): LinkRenderer {
			return new LinkRenderer();
		}

		public function getDBLoadBalancer(): DBLoadBalancer {
			return new DBLoadBalancer();
		}

		public function getMainWANObjectCache(): WANObjectCache {
			return new WANObjectCache();
		}

		public function getWikiPageFactory(): WikiPageFactory {
			return new WikiPageFactory();
		}

		public function getRevisionLookup(): Revision\RevisionLookup {
			return new Revision\RevisionLookup();
		}

		public function getRestrictionStore(): RestrictionStore {
			return new RestrictionStore();
		}

		public function getWatchlistManager(): WatchlistManager {
			return new WatchlistManager();
		}
	}

	class UserOptionsLookup {
		public function getOption( \User $user, string $option, mixed $default = null ): mixed {
			return $default;
		}
	}

	class UserGroupManager {
		/**
		 * @return array<int,string>
		 */
		public function getUserGroups( \User $user ): array {
			return [];
		}
	}

	class PermissionManager {
		public function quickUserCan( string $action, \User $user, mixed $target ): bool {
			return true;
		}

		public function userHasRight( \User $user, string $action ): bool {
			return true;
		}

		/**
		 * @return array<int,string>
		 */
		public function getUserPermissions( \User $user ): array {
			return [];
		}
	}

	class LinkRenderer {
		/**
		 * @param array<string,string> $attrs
		 * @param array<string,string> $query
		 */
		public function makeKnownLink( mixed $target, mixed $text = '', array $attrs = [], array $query = [] ): string {
			return '';
		}
	}

	class DBLoadBalancer {
		public function getConnection( int $index ): Database {
			return new Database();
		}
	}

	class Database {
		/**
		 * @param string|array<int|string,mixed> $tables
		 * @param string|array<int|string,mixed> $fields
		 * @param string|array<int|string,mixed> $conds
		 * @param array<string,mixed> $options
		 * @param array<string,mixed> $joinConds
		 * @return iterable<int,\stdClass>
		 */
		public function select(
			string|array $tables,
			string|array $fields,
			string|array $conds,
			string $caller = '',
			array $options = [],
			array $joinConds = []
		): iterable {
			return [];
		}

		/**
		 * @param string|array<int|string,mixed> $tables
		 * @param string|array<int|string,mixed> $fields
		 * @param string|array<int|string,mixed> $conds
		 * @param array<string,mixed> $options
		 * @param array<string,mixed> $joinConds
		 */
		public function selectRow(
			string|array $tables,
			string|array $fields,
			string|array $conds,
			string $caller = '',
			array $options = [],
			array $joinConds = []
		): ?\stdClass {
			return null;
		}

		public function addQuotes( string $value ): string {
			return "'" . $value . "'";
		}
	}

	class WANObjectCache {
		public function makeKey( mixed ...$parts ): string {
			return implode( ':', array_map( 'strval', $parts ) );
		}

		/**
		 * @template T
		 * @param callable():T $callback
		 * @return T
		 */
		public function getWithSetCallback( string $key, int $ttl, callable $callback ): mixed {
			return $callback();
		}
	}

	class WikiPageFactory {
		public function newFromTitle( Title\Title $title ): WikiPage {
			return new WikiPage();
		}
	}

	class WikiPage {
		public function getLatest(): int {
			return 0;
		}

		public function getLatestRevID(): int {
			return 0;
		}

		public function getRevisionRecord(): ?Revision\RevisionRecord {
			return null;
		}

		public function getContent( int $audience = 0 ): ?Content\Content {
			return null;
		}
	}

	class RestrictionStore {
		public function isProtected( Title\Title $title ): bool {
			return false;
		}
	}

	class WatchlistManager {
		public function isWatchedIgnoringRights( \User $user, Title\Title $title ): bool {
			return false;
		}
	}
}

namespace MediaWiki\Output {
	class OutputPage extends \OutputPage {
		/**
		 * @param string|string[] $modules
		 */
		public function addModuleStyles( string|array $modules ): void {
		}
	}
}

namespace MediaWiki\Skin {
	class SkinMustache extends \SkinMustache {
	}
}

namespace MediaWiki\SpecialPage {
	class SpecialPage extends \SpecialPage {
	}
}

namespace MediaWiki\Html {
	class Html {
		/**
		 * @param array<string,mixed> $attrs
		 */
		public static function rawElement( string $element, array $attrs = [], string $contents = '' ): string {
			return '';
		}

		/**
		 * @param array<string,mixed> $attrs
		 */
		public static function element( string $element, array $attrs = [], string $contents = '' ): string {
			return '';
		}
	}
}

namespace MediaWiki\Linker {
	class Linker {
		public static function titleAttrib( string $name, string $options = '' ): string {
			return '';
		}

		public static function accesskey( string $name ): string {
			return '';
		}
	}
}

namespace MediaWiki\Title {
	class Title {
		public static function newMainPage(): self {
			return new self();
		}

		public static function newFromText( string $text, int $namespace = 0 ): ?self {
			return new self();
		}

		public static function makeTitle( int $namespace, string $title ): self {
			return new self();
		}

		public static function makeTitleSafe( int $namespace, string $title ): ?self {
			return new self();
		}

		/**
		 * @param array<string,mixed> $query
		 */
		public function getLocalURL( array $query = [] ): string {
			return '';
		}

		public function getFullURL(): string {
			return '';
		}

		public function getPrefixedDBkey(): string {
			return '';
		}

		public function getPrefixedText(): string {
			return '';
		}

		public function getText(): string {
			return '';
		}

		public function exists(): bool {
			return true;
		}

		public function getNamespace(): int {
			return 0;
		}

		public function getDBkey(): string {
			return '';
		}

		public function getLatestRevID(): int {
			return 0;
		}

		public function getSubjectPage(): self {
			return new self();
		}

		public function getTalkPage(): self {
			return new self();
		}

		public function isTalkPage(): bool {
			return false;
		}

		public function inNamespaces( int ...$namespaces ): bool {
			return false;
		}
	}
}

namespace MediaWiki\Content {
	class Content {
		public function getText(): string {
			return '';
		}
	}

	class TextContent extends Content {
	}
}

namespace MediaWiki\Revision {
	class RevisionLookup {
		public function getRevisionByTitle( \MediaWiki\Title\Title $title ): ?RevisionRecord {
			return null;
		}
	}

	class RevisionRecord {
		public const RAW = 1;

		public function getContent( int $audience ): ?\MediaWiki\Content\Content {
			return null;
		}

		public function getId(): int {
			return 0;
		}
	}
}
