/* Make button to make fixed toc */
document.addEventListener( 'DOMContentLoaded', function () {
        'use strict';
        var width = window.innerWidth,
                contentHeader,
                contentHeaderOffset,
                indexButton,
                navHeight,
                id;
        if ( document.getElementById( 'toc' ) && width > 1649 ) {
                contentHeader = document.querySelector( '.liberty-content-header' );
                if ( !contentHeader ) {
                        return;
                }
                contentHeaderOffset = contentHeader.getBoundingClientRect();
                indexButton = document.createElement( 'button' );
                indexButton.id = 'fixed-toc-button';
                indexButton.type = 'button';
                indexButton.className = 'btn btn-primary';
                indexButton.innerHTML = '<span class="fa fa-list" aria-hidden="true"></span>';
                indexButton.style.position = 'fixed';
                indexButton.style.top = contentHeaderOffset.top + 'px';
                indexButton.style.left = ( contentHeaderOffset.left - 47 - 15 ) + 'px';
                window.damezuma = { doc: null };
                indexButton.addEventListener( 'click', function () {
                        indexButton.style.display = 'none';
                        if ( !window.damezuma.doc ) {
                                window.damezuma.doc = document.getElementById( 'toc' ).cloneNode( true );
                                document.body.appendChild( window.damezuma.doc );
                                Object.assign( window.damezuma.doc.style, {
                                        position: 'fixed',
                                        top: '44px',
                                        left: '0',
                                        backgroundColor: '#f5f8fa',
                                        borderRight: '1px solid #e1e8ed',
                                        color: '#373a3c',
                                        padding: '16px',
                                        bottom: '0',
                                        overflowY: 'auto',
                                        display: 'block',
                                        maxWidth: '200px',
                                        zIndex: '3000'
                                } );
                                window.damezuma.doc.id = 'fixed-toc';
                                var toggle = window.damezuma.doc.querySelector( '.togglelink' );
                                if ( toggle ) {
                                        toggle.addEventListener( 'click', function () {
                                                indexButton.style.display = 'block';
                                                window.damezuma.doc.remove();
                                                window.damezuma.doc = null;
                                                return false;
                                        } );
                                }

                                navHeight = document.querySelector( '.nav-wrapper' ).offsetHeight;
                                window.damezuma.doc.querySelectorAll( 'ul li > a' ).forEach( function ( a ) {
                                        a.addEventListener( 'click', function ( event ) {
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
                                                                event.preventDefault();
                                                        }
                                                }
                                        } );
                                } );
                        }
                } );
                document.body.appendChild( indexButton );
        }
} );
