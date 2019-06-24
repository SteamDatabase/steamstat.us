// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

( function( doc, win )
{
	'use strict';
	
	/**
	 * @param {!string} text
	 * @return {undefined}
	 */
	var ShowError = function( text )
	{
		loader.removeAttribute( 'hidden' );
		doc.getElementById( 'loader-content' ).setAttribute( 'hidden', '' );
		
		element = doc.getElementById( 'loader-error' );
		element.removeAttribute( 'hidden' );
		element.innerHTML = text;
	};

try
{
	var key,
		value,
		response,
		xhr,
		psa,
		timeDiff,
		hasServiceWorker = false,
		secondsToUpdate = 0,
		previousOnline = 100,
		graph          = doc.getElementById( 'cms-graph' ),
		loader         = doc.getElementById( 'loader' ),
		element        = doc.getElementsByTagName( 'noscript' )[ 0 ],
		notif_button   = doc.getElementById( 'js-enable-notification' ),
		psa_element    = doc.getElementById( 'psa' ),
		time_element   = doc.getElementById( 'js-refresh' );
	
	// Delete noscript element because some browsers think it's cool to render it if javascript is enabled
	if( element )
	{
		element.parentNode.removeChild( element );
	}
	
	/**
	 * @return {undefined}
	 */
	var Tick = function( )
	{
		if( secondsToUpdate <= 0 )
		{
			secondsToUpdate = 45;
			
			RefreshData( );
		}
		else
		{
			setTimeout( Tick, 1000 );
			
			time_element.textContent = --secondsToUpdate < 10 ? '0' + secondsToUpdate : secondsToUpdate;
		}
	};
	
	/**
	 * @return {undefined}
	 */
	var RefreshData = function( )
	{
		loader.removeAttribute( 'hidden' );
		
		xhr = new XMLHttpRequest( );
		xhr.open( 'GET', 'https://crowbar.steamstat.us/Barney', true );
		xhr.onreadystatechange = LoadData;
		xhr.ontimeout = function() { ShowError( 'Request timed out.<br>Reload the page manually.' ); };
		xhr.timeout = 20000;
		xhr.send( );
	};
	
	/**
	 * @return {undefined}
	 */
	var LoadData = function( )
	{
		xhr = this;
		
		if( xhr.readyState === 4 )
		{
			response = xhr.responseText;
			
			try
			{
				loader.setAttribute( 'hidden', '' );
				
				if( xhr.status !== 200 )
				{
					return ShowError( 'Status: ' + xhr.status );
				}
				
				if( response === null || response[ 0 ] !== '{' )
				{
					return ShowError( 'Received invalid data.<br>Is something wrong with your network?' );
				}
				
				response = JSON.parse( response );
				psa = response[ 'psa' ] || '';
				timeDiff = Math.abs( Date.now() / 1000 - response[ 'time' ] );
				
				if( timeDiff > 300 )
				{
					if( psa )
					{
						psa += '<hr>';
					}
					
					psa += 'Data appears to be ' + ( 0 | ( timeDiff / 60 ) ) + ' minutes old.';
					
					if( timeDiff > 3000 )
					{
						psa += ' <a href="https://time.is" target="_blank" rel="noopener">Is your clock out of sync?</a>';
					}
				}
				
				if( psa )
				{
					if( psa_element.hasAttribute( 'hidden' ) )
					{
						psa_element.removeAttribute( 'hidden' );
					}
					
					if( psa_element.innerHTML !== psa )
					{
						psa_element.innerHTML = psa;
					}
				}
				else if( !psa_element.hasAttribute( 'hidden' ) )
				{
					psa_element.innerHTML = '';
					psa_element.setAttribute( 'hidden', '' );
				}
				
				if( previousOnline < 75 && response[ 'online' ] >= 75 && 'Notification' in win )
				{
					if( win.Notification.permission === 'granted' )
					{
						var notifTitle = 'Steam is back online';
						var notifData =
						{
							'lang': 'en',
							'icon': '/static/logos/192px.png',
							'body': response[ 'online' ] + '% of Steam servers are online, you could try logging in now.'
						};

						if( hasServiceWorker )
						{
							navigator.serviceWorker.ready.then( function( registration )
							{
								registration.showNotification( notifTitle, notifData );
							} );
						}
						else
						{
							var notification = new win.Notification( notifTitle, notifData );

							notification.onclick = function()
							{
								notification.close();
							};
						}
					}
				}
				
				previousOnline = response[ 'online' ];
				
				var extra = response[ 'online_info' ];
				
				response = response[ 'services' ];
				
				for( key in response )
				{
					element = doc.getElementById( key );
					
					if( element )
					{
						value = response[ key ];
						
						if( value.status )
						{
							key = 'status ' + value.status;
							
							if( element.className !== key )
							{
								element.className = key;
							}
						}
						
						if( element.textContent )
						{
							element.textContent = value.title;
						}
						else
						{
							element.innerText = value.title;
						}
					}
				}
				
				Tick( );
			}
			catch( x )
			{
				ShowError( x.message );
			}
		}
	};
	
	/**
	 * @param {Object} graphData
	 * @return {undefined}
	 */
	var RenderChart = function( graphData )
	{
		if( !( 'Highcharts' in win ) )
		{
			graph.innerHTML = 'Failed to load Highcharts.<br>Please unblock <b>cdnjs.cloudflare.com</b> for this to work.';
			
			return;
		}

		new win[ 'Highcharts' ][ 'Chart' ](
		{
			global:
			{
				useUTC: false
			},
			plotOptions:
			{
				series:
				{
					animation: false
				}
			},
			chart:
			{
				renderTo: graph,
				backgroundColor: '#282936',
				spacing: [5, 0, 0, 0],
				style: {
					fontFamily: 'inherit'
				}
			},
			title:
			{
				text: null
			},
			credits:
			{
				enabled: false
			},
			exporting:
			{
				enabled: false
			},
			rangeSelector:
			{
				enabled: false
			},
			scrollbar:
			{
				enabled: false
			},
			navigator:
			{
				enabled: false
			},
			tooltip:
			{
				shared: true,
				split: false,
				shadow: false,
				borderWidth: 0,
				borderRadius: 0,
				style:
				{
					color: '#FFF'
				},
				backgroundColor: 'rgba(27, 27, 36, .8)',
				pointFormat: '<br><span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y}%</b>',
			},
			legend:
			{
				enabled: false
			},
			xAxis:
			{
				type: 'datetime',
				labels:
				{
					style:
					{
						color: '#9E9E9E'
					}
				},
				lineWidth: 0,
				tickWidth: 0
			},
			yAxis:
			{
				gridLineColor: '#3A3B47',
				title:
				{
					enabled: false
				},
				labels:
				{
					format: '{value}%',
					style:
					{
						color: '#9E9E9E'
					}
				},
				showLastLabel: true,
				tickPositions: [0, 25, 50, 75, 100],
				min: 0,
				max: 100,
				allowDecimals: false,
				startOnTick: false,
				endOnTick: false
			},
			series:
			[
				{
					color: '#4384D8',
					name: 'Online CMs',
					pointStart: graphData.start,
					pointInterval: graphData.step,
					data: graphData.data
				},
				{
					color: '#FFF176',
					name: 'Online WebSocket CMs',
					pointStart: graphData.start,
					pointInterval: graphData.step,
					data: graphData.cms_ws
				}
			]
		});
	};
	
	/**
	 * @return {undefined}
	 */
	var LoadGraph = function( )
	{
		var xhrGraph = new XMLHttpRequest( );
		xhrGraph.open( 'GET', 'https://crowbar.steamstat.us/Gina', true );
		xhrGraph.onreadystatechange = function()
		{
			try
			{
				if( xhrGraph.readyState === 4 )
				{
					if( xhrGraph.status !== 200 )
					{
						graph.textContent = 'Failed to load graph data: HTTP ' + xhrGraph.status;
					}
					
					response = JSON.parse( xhrGraph.responseText );
					
					if( !response[ 'data' ] )
					{
						graph.textContent = 'Failed to load graph data.';
						
						return;
					}
					
					RenderChart( response );
				}
			}
			catch( x )
			{
				graph.textContent = 'Failed to load graph data: ' + ( x.message || 'Unknown error.' );
			}
		};
		xhrGraph.ontimeout = function() { graph.textContent = 'Request timed out, unable to render graph.'; };
		xhrGraph.timeout = 10000;
		xhrGraph.send( );
	};
	
	Tick( );
	LoadGraph( );
	
	// Refresh graph every 10 minutes
	setInterval( LoadGraph, 600000 );
	
	if( win.Notification && win.Notification.permission === 'default' )
	{
		notif_button.addEventListener( 'click', function( e )
		{
			e.preventDefault();

			win.Notification.requestPermission( function( notifResult )
			{
				if( notifResult === 'granted' )
				{
					notif_button.setAttribute( 'hidden', '' );
				}
			} );
		}, false );
	}
	else
	{
		notif_button.setAttribute( 'hidden', '' );
	}
	
	// http://updates.html5rocks.com/2015/03/increasing-engagement-with-app-install-banners-in-chrome-for-android
	if( 'serviceWorker' in navigator )
	{
		navigator.serviceWorker.register( '/service-worker.js', { scope: './' } ).then( function() 
		{
			hasServiceWorker = true;
		} ).catch( function( e )
		{
			console.error( e );
		} );
	}
	
	win.addEventListener( 'beforeinstallprompt', function( e )
	{
		e[ 'userChoice' ].then( function( choiceResult )
		{
			if( 'ga' in win )
			{
				win[ 'ga' ]( 'send', 'event', 'Install Prompt', 'Outcome', choiceResult[ 'outcome' ] );
			}
		} );
	} );
}
catch( e )
{
	ShowError( 'Something broke.<br>' + ( e.message || 'Are you using an outdated browser?' ) );
	
	console.error( e );
}

	if( window.location.search.length > 0 || window.location.hash.length > 0 )
	{
		window.history.replaceState( null, '', window.location.origin );
	}

	const follow = document.getElementById( 'js-twitter-follow' );
	follow.addEventListener( 'click', function( e )
	{
		const left = Math.round( window.screen.width / 2 - 250 );
		const top = Math.round( window.screen.height / 2 - 300 );

		window.open( follow.href, undefined, 'scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=500,height=600,left=' + left + ',top=' + top );

		e.preventDefault();
		e.stopPropagation();
	} );

	window.GoogleAnalyticsObject = 'ga';
	window.ga = function()
	{
		window.ga.q.push( arguments );
	};
	window.ga.q = [];
	window.ga.l = Date.now();
	ga( 'create', 'UA-37177069-4', 'auto' );
	ga( 'set', 'anonymizeIp', true );
	ga( 'send', 'pageview' );
}( document, window ) );
