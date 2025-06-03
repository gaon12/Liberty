(function () {
    'use strict';

    // It's good practice to run this after DOM is loaded, though for a single event listener
    // if the script is at the bottom of the body, it might work without.
    // However, Liberty loads scripts in a way that DOMContentLoaded is safer.
    document.addEventListener('DOMContentLoaded', function () {
        const shareButton = document.querySelector('.tools-share');

        if (shareButton) {
            shareButton.addEventListener('click', function () {
                var ns, title, url, host; // Keep 'use strict' if it was file-level, or ensure it's per function
                host = mw.config.get( 'wgServer' );
                if ( host.startsWith( '//' ) ) {
                    host = location.protocol + host;
                }
                ns = mw.config.get( 'wgNamespaceNumber' );
                title = mw.config.get( 'wgTitle' );
                if ( ns ) {
                    // Ensure wgFormattedNamespaces exists and the key ns exists.
                    const formattedNamespaces = mw.config.get( 'wgFormattedNamespaces' );
                    if (formattedNamespaces && formattedNamespaces[ns]) {
                        title = formattedNamespaces[ns] + ':' + title;
                    }
                }
                url = host + mw.config.get( 'wgScriptPath' ) + '/index.php?curid=' + mw.config.get( 'wgArticleId' );

                // Check if navigator.share is supported
                if (navigator.share) {
                    navigator.share( {
                        title: title,
                        text: title + ' - ' + mw.config.get( 'wgSiteName' ),
                        url: url,
                        // Make sure wgSiteName is available and replace is safe
                        hashtags: [ (mw.config.get( 'wgSiteName' ) || '').replace( / /g, '_' ) ]
                    } )
                    .catch( function ( error ) {
                        // Only log error if it's a true error, not an AbortError by user cancellation
                        if (error.name !== 'AbortError') {
                           console.error( 'Share API error: ', error );
                        }
                    } );
                } else {
                    // Fallback behavior if navigator.share is not supported (optional)
                    // For example, copy to clipboard or open a share dialog
                    console.warn( 'Web Share API not supported.' );
                    // As an example fallback, could copy URL to clipboard:
                    // navigator.clipboard.writeText(url).then(...).catch(...);
                    // Or, alert the user:
                    // alert("Web Share API not supported. URL: " + url);
                    // The original script had no fallback, so just logging a warning is fine.
                }
            });
        }
    });
})();
