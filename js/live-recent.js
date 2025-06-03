document.addEventListener( 'DOMContentLoaded', function () {
	'use strict';
	var articleNamespaces, talkNamespaces, isArticleTab, limit;

        var recent = document.querySelector( '.live-recent' );
        articleNamespaces = recent ? recent.getAttribute( 'data-article-ns' ) : '';
        talkNamespaces = recent ? recent.getAttribute( 'data-talk-ns' ) : '';
	isArticleTab = true;
        var list = document.getElementById( 'live-recent-list' );
        limit = list ? list.childElementCount : 0;

	function timeFormat( time ) {
		var aDayAgo, hour, minute, second;
		aDayAgo = new Date();
		aDayAgo.setDate( aDayAgo.getDate() - 1 );
		if ( time < aDayAgo ) {
			return ( time.getFullYear() ) + '/' + ( time.getMonth() + 1 ) + '/' + time.getDate();
		}
		hour = time.getHours();
		minute = time.getMinutes();
		second = time.getSeconds();
		if ( hour < 10 ) {
			hour = '0' + hour;
		}
		if ( minute < 10 ) {
			minute = '0' + minute;
		}
		if ( second < 10 ) {
			second = '0' + second;
		}
		return hour + ':' + minute + ':' + second;
	}

	function refreshLiveRecent() {
		var getParameter;

                var listEl = document.getElementById( 'live-recent-list' );
                if ( !listEl || listEl.offsetParent === null ) {
                        return;
                }

		getParameter = {
			action: 'query',
			list: 'recentchanges',
			rcprop: 'title|timestamp',
			rcshow: '!bot|!redirect',
			rctype: 'edit|new',
			rclimit: limit,
			format: 'json',
			rcnamespace: isArticleTab ? articleNamespaces : talkNamespaces,
			rctoponly: true
		};

		mw.loader.using( 'mediawiki.api' ).then( function () {
			var api = new mw.Api();
			api.get( getParameter ).then( function ( data ) {
				var recentChanges, html, time, line, text;
				recentChanges = data.query.recentchanges;
				html = recentChanges.map( function ( item ) {
					time = new Date( item.timestamp );
					line = '<li><a class="recent-item" href="' + mw.util.getUrl( item.title ) + '" title="' + item.title + '">[' + timeFormat( time ) + '] ';
					text = '';
					if ( item.type === 'new' ) {
						text += '[New]';
					}
					text += item.title;
					if ( text.length > 13 ) {
						text = text.substr( 0, 13 );
						text += '...';
					}
					text = text.replace( '[New]', '<span class="new">' + mw.msg( 'liberty-feed-new' ) + ' </span>' );
					line += text;
					line += '</a></li>';
					return line;
				} ).join( '\n' );
                                document.getElementById( 'live-recent-list' ).innerHTML = html;
			} )
			.catch( function () {} );
		});
	}

        document.getElementById( 'liberty-recent-tab1' ).addEventListener( 'click', function () {
                this.classList.add( 'active' );
                document.getElementById( 'liberty-recent-tab2' ).classList.remove( 'active' );
                isArticleTab = true;
                refreshLiveRecent();
        } );

        document.getElementById( 'liberty-recent-tab2' ).addEventListener( 'click', function () {
                this.classList.add( 'active' );
                document.getElementById( 'liberty-recent-tab1' ).classList.remove( 'active' );
                isArticleTab = false;
                refreshLiveRecent();
        } );

	setInterval( refreshLiveRecent, 5 * 60 * 1000 );
	refreshLiveRecent();
} );
