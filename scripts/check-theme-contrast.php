<?php

/**
 * Validate theme foreground contrast selection without booting MediaWiki.
 *
 * @license GPL-3.0-or-later
 */

require_once __DIR__ . '/../tests/phpstan/mediawiki-stubs.php';
require_once __DIR__ . '/../SkinWhale.php';

$reflection = new ReflectionClass( SkinWhale::class );
$skin = $reflection->newInstanceWithoutConstructor();
$getContrastColor = $reflection->getMethod( 'getContrastColor' );

$cases = [
	'#000000' => '#FFFFFF',
	'#FFFFFF' => '#000000',
	'#0B67D1' => '#FFFFFF',
	'#1677FF' => '#000000',
	'#0958D9' => '#FFFFFF',
	'#99CCFF' => '#000000',
	'#663399' => '#FFFFFF',
	'#FFCC33' => '#000000',
];

foreach ( $cases as $background => $expected ) {
	$actual = $getContrastColor->invoke( $skin, $background );
	if ( $actual !== $expected ) {
		fwrite(
			STDERR,
			"Theme contrast selection failed for $background: expected $expected, received $actual.\n"
		);
		exit( 1 );
	}
}
