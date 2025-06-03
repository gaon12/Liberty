window.addEventListener( 'load', function () {
        'use strict';
        var hash, navHeight, id;

	/* Anchor Process */
	hash = window.location.hash;
        var navWrapper = document.querySelector( '.nav-wrapper' );
        navHeight = navWrapper ? navWrapper.offsetHeight : 0;

	if ( hash.indexOf( '.' ) !== -1 ) {
		hash = String( hash );
		hash = document.getElementById( hash.replace( '#', '' ) );
	}

        if ( hash ) {
                var target = typeof hash === 'string' ? document.querySelector( hash ) : hash;
                if ( target ) {
                        window.scrollTo( { top: target.offsetTop - navHeight - 10, behavior: 'smooth' } );
                }
        }
	/* Anchor Process End */

	/* ToC click process */
        document.querySelectorAll( '.toc ul li > a' ).forEach( function ( a ) {
                a.addEventListener( 'click', function ( e ) {
                        var href = a.getAttribute( 'href' );
                        if ( href && href[0] === '#' ) {
                                id = href;
                                if ( id.indexOf( '.' ) !== -1 ) {
                                        id = document.getElementById( id.replace( '#', '' ) );
                                } else {
                                        id = document.querySelector( href );
                                }
                                if ( id ) {
                                        window.scrollTo( { top: id.offsetTop - navHeight - 10, behavior: 'smooth' } );
                                        e.preventDefault();
                                }
                        }
                } );
        } );
	/* ToC click process End */

	/* Title number click process */
        document.querySelectorAll( '.mw-headline-number' ).forEach( function ( el ) {
                el.addEventListener( 'click', function ( e ) {
                        var target = document.getElementById( 'toctitle' );
                        if ( target ) {
                                window.scrollTo( { top: target.offsetTop - navHeight - 10, behavior: 'smooth' } );
                                e.preventDefault();
                        }
                } );
        } );
	/* Title number click process End */

	/* ToC Click Process */
        function addAnchorScroll( selector ) {
                document.querySelectorAll( selector ).forEach( function ( el ) {
                        el.addEventListener( 'click', function ( e ) {
                                var href = el.getAttribute( 'href' );
                                if ( href && href[0] === '#' ) {
                                        id = href;
                                        if ( id.indexOf( '.' ) !== -1 ) {
                                                id = document.getElementById( id.replace( '#', '' ) );
                                        } else {
                                                id = document.querySelector( href );
                                        }
                                        if ( id ) {
                                                window.scrollTo( { top: id.offsetTop - navHeight - 10, behavior: 'smooth' } );
                                                e.preventDefault();
                                        }
                                }
                        } );
                } );
        }

        addAnchorScroll( '.mw-cite-backlink > a' );
        addAnchorScroll( '.mw-cite-backlink > * > a' );
        addAnchorScroll( '.reference > a' );
	/* ToC Click Process End */

	/* Preference Tab Click Process */
        document.querySelectorAll( '#preftoc li > a' ).forEach( function ( el ) {
                el.addEventListener( 'click', function () {
                        if ( el.getAttribute( 'href' )[0] === '#' ) {
                                window.scrollTo( { top: 0, behavior: 'smooth' } );
                        }
                } );
        } );
	/* Preference Tab Click Process End */
} );
