document.addEventListener( 'DOMContentLoaded', function () {
        'use strict';

        document.querySelectorAll( '.dropdown' ).forEach( function ( el ) {
                el.addEventListener( 'show.bs.dropdown', function () {
                        var menu = el.querySelector( '.dropdown-menu' );
                        if ( menu ) {
                                menu.classList.add( 'show' );
                        }
                } );
                el.addEventListener( 'hide.bs.dropdown', function () {
                        var menu = el.querySelector( '.dropdown-menu' );
                        if ( menu ) {
                                menu.classList.remove( 'show' );
                        }
                } );
        } );

        var loginModal = document.getElementById( 'login-modal' );
        if ( loginModal ) {
                loginModal.addEventListener( 'shown.bs.modal', function () {
                        var wpName = document.getElementById( 'wpName1' );
                        if ( wpName ) {
                                wpName.focus();
                        }
                } );
        }

        var display;
        document.querySelectorAll( '.dropdown-toggle-sub' ).forEach( function ( toggle ) {
                toggle.addEventListener( 'click', function ( event ) {
                        display = toggle.nextElementSibling;
                        if ( display && display.classList.contains( 'dropdown-menu' ) ) {
                                display.style.display = display.style.display === 'block' ? 'none' : 'block';
                        }
                        event.stopPropagation();
                        event.preventDefault();
                } );
        } );

        document.documentElement.addEventListener( 'click', function () {
                if ( display ) {
                        display.style.display = 'none';
                }
        } );
} );
/* Sub menu end */
