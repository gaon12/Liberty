document.addEventListener( 'DOMContentLoaded', function () {
        'use strict';
        var mobileAds = document.querySelector( '.mobile-ads' ),
                rightAds;

        if ( mobileAds ) {
                if ( window.innerWidth < 1024 ) {
                        rightAds = document.querySelector( '.right-ads' );
                        if ( rightAds ) {
                                mobileAds.innerHTML = rightAds.innerHTML;
                                rightAds.remove();
                        }
                }
        }

        document.querySelectorAll( '.adsbygoogle' ).forEach( function () {
                ( window.adsbygoogle = window.adsbygoogle || [] ).push( {} );
        } );
} );
