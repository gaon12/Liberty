// eslint-disable-next-line
function LoginManage() {
	'use strict';
	mw.loader.using( 'mediawiki.api' ).then(function() {
		try {
			// new mw.Api().postWithToken does not work with clientlogin
			var api = new mw.Api();
			api.post( {
				action: 'query',
				meta: 'tokens',
				type: 'login'
			} )
				.then( function ( result ) {
					var token = result.query.tokens.logintoken;
					return api.post( {
						action: 'clientlogin',
						loginreturnurl: location.href,
                                                username: document.getElementById( 'wpName1' ).value,
                                                password: document.getElementById( 'wpPassword1' ).value,
                                                rememberMe: document.getElementById( 'lgremember' ).checked ? 1 : 0,
						logintoken: token
					} )
				} )
				.then( function ( result ) {
					if ( result.clientlogin.status !== 'PASS' ) {
						switch ( result.clientlogin.status ) {
							case 'FAIL':
                                                                var alertEl = document.getElementById( 'modal-login-alert' );
                                                                alertEl.classList.add( 'alert-warning' );
                                                                alertEl.style.display = 'block';
                                                                alertEl.textContent = result.clientlogin.message;
								break;
							default:

						}
					} else {
						if ( mw.config.get( 'wgNamespaceNumber' ) === -1 ) {
                                                        location.href = mw.config.get( 'wgArticlePath' ).replace( '$1', '' );
						} else {
							window.location.reload();
						}
					}
				} )
				.catch( function () {} );
			return false;
		} catch ( e ) {
			return false;
		}
	});
}

document.addEventListener( 'DOMContentLoaded', function () {
        var form = document.getElementById( 'modal-loginform' );
        if ( form ) {
                form.addEventListener( 'keypress', function ( e ) {
                        if ( e.which === 13 ) {
                                e.preventDefault();
                                return LoginManage();
                        }
                } );
                form.addEventListener( 'submit', function ( e ) {
                        e.preventDefault();
                        return LoginManage();
                } );
        }
} );
