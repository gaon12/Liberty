document.addEventListener( 'DOMContentLoaded', function () {
        var up = document.getElementById( 'liberty-scrollup' );
        var down = document.getElementById( 'liberty-scrolldown' );

        if ( up ) {
                up.addEventListener( 'click', function ( e ) {
                        window.scrollTo( { top: 0, behavior: 'smooth' } );
                        e.preventDefault();
                } );
        }

        if ( down ) {
                down.addEventListener( 'click', function ( e ) {
                        window.scrollTo( { top: document.documentElement.scrollHeight, behavior: 'smooth' } );
                        e.preventDefault();
                } );
        }
} );
