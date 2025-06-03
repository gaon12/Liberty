document.addEventListener( 'DOMContentLoaded', function () {
        'use strict';
        document.querySelectorAll( '.liberty-notice' ).forEach( function ( el ) {
                el.addEventListener( 'closed.bs.alert', function () {
                        mw.cookie.set( 'disable-notice', true, { expires: 3600 * 24, secure: false } );
                } );
        } );
} );
