// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

( function( doc, win )
{
	'use strict';
	
	/**
	 * @param {!string} text
	 * @param {string=} data
	 * @return {undefined}
	 */
	var ShowError = function( text, data )
	{
		loader.style.display = 'block';
		doc.getElementById( 'loader-content' ).style.display = 'none';
		( element = doc.getElementById( 'loader-error' ) ).style.display = 'block';
		
		if( text )
		{
			element.innerHTML = text;
			
			text = text.replace( '<br>', ' ' );
		}
		else
		{
			text = 'AJAX Error: ' + data;
		}
	};
	
	/**
	 * Taken from https://github.com/schalkneethling/dnt-helper
	 *
	 * Returns true or false based on whether doNotTack is enabled. It also takes into account the
	 * anomalies, such as !bugzilla 887703, which effect versions of Fx 31 and lower. It also handles
	 * IE versions on Windows 7, 8 and 8.1, where the DNT implementation does not honor the spec.
	 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=1217896 for more details
	 * @returns {boolean} true if enabled else false
	 */
	function _dntEnabled()
	{
		// for old version of IE we need to use the msDoNotTrack property of navigator
		// on newer versions, and newer platforms, this is doNotTrack but, on the window object
		// Safari also exposes the property on the window object.
		var dntStatus = navigator.doNotTrack || win.doNotTrack || navigator.msDoNotTrack;
		var ua = navigator.userAgent;
		
		// List of Windows versions known to not implement DNT according to the standard.
		var anomalousWinVersions = ['Windows NT 6.1', 'Windows NT 6.2', 'Windows NT 6.3'];
		
		var fxMatch = ua.match(/Firefox\/(\d+)/);
		var ieRegEx = /MSIE|Trident/i;
		var isIE = ieRegEx.test(ua);
		// Matches from Windows up to the first occurance of ; un-greedily
		// http://www.regexr.com/3c2el
		var platform = ua.match(/Windows.+?(?=;)/g);
		
		// With old versions of IE, DNT did not exist so we simply return false;
		if (isIE && typeof Array.prototype.indexOf !== 'function') {
			return false;
		} else if (fxMatch && parseInt(fxMatch[1], 10) < 32) {
			// Can't say for sure if it is 1 or 0, due to Fx bug 887703
			dntStatus = 'Unspecified';
		} else if (isIE && platform && anomalousWinVersions.indexOf(platform.toString()) !== -1) {
			// default is on, which does not honor the specification
			dntStatus = 'Unspecified';
		} else {
			// sets dntStatus to Disabled or Enabled based on the value returned by the browser.
			// If dntStatus is undefined, it will be set to Unspecified
			dntStatus = { '0': 'Disabled', '1': 'Enabled' }[dntStatus] || 'Unspecified';
		}
		
		return dntStatus === 'Enabled' ? true : false;
	}

try
{
	var key,
		value,
		response,
		xhr,
		psa,
		timeDiff,
		secondsToUpdate = 0,
		previousOnline = 100,
		graphData,
		graph          = doc.getElementById( 'cms-graph' ),
		loader         = doc.getElementById( 'loader' ),
		element        = doc.getElementsByTagName( 'noscript' )[ 0 ],
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
		loader.style.display = 'block';
		
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
				loader.style.display = 'none';
				
				if( xhr.status !== 200 )
				{
					return ShowError( '', 'Status: ' + xhr.status );
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
						psa += ' <a href="http://time.is" target="_blank">Is your clock out of sync?</a>';
					}
				}
				
				if( psa )
				{
					if( psa_element.style.display !== 'block' )
					{
						psa_element.style.display = 'block';
					}
					
					if( psa_element.innerHTML !== psa )
					{
						psa_element.innerHTML = psa;
					}
				}
				else if( psa_element.style.display !== 'none' )
				{
					psa_element.innerHTML = '';
					psa_element.style.display = 'none';
				}
				
				if( previousOnline < 75 && response[ 'online' ] >= 75 && 'Notification' in win )
				{
					if( win.Notification.permission === 'granted' )
					{
						var notification = new win.Notification( 'Steam is back online',
						{
							'lang': 'en',
							'icon': '/static/logos/192px.png',
							'body': response[ 'online' ] + '% of Steam servers are online, you could try logging in now.'
						} );
						
						setTimeout( function() {
							notification.close();
						}, 5000 );
					}
				}
				
				previousOnline = response[ 'online' ];
				
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
						
						if( value.time )
						{
							element.title = 'Time since last status change: ' + TimeDifference( value.time );
						}
					}
				}
				
				Tick( );
			}
			catch( x )
			{
				ShowError( '' );
				
				console.debug( 'Status:', xhr.status, xhr.statusText );
				console.debug( 'Data:', response );
			}
		}
	};
	
	/**
	 * @param {!number} previous
	 * @return {!string}
	 */
	var TimeDifference = function( previous )
	{
		var msPerMinute = 60 * 1000;
		var msPerHour = msPerMinute * 60;
		var msPerDay = msPerHour * 24;
		var msPerMonth = msPerDay * 30;
		
		var elapsed = Date.now() - ( previous * 1000 );
		
		if( elapsed < msPerMinute )
		{
			return 'less than a minute ago';
		}
		else if( elapsed < msPerHour )
		{
			return Math.round( elapsed / msPerMinute ) + ' minutes';
		}
		else if( elapsed < msPerDay )
		{
			return Math.round( elapsed / msPerHour ) + ' hours';
		}
		
		return '≈' + Math.round( elapsed / msPerDay ) + ' days';
	};
	
	/**
	 * @return {undefined}
	 */
	var RenderChart = function()
	{
		if( !graphData )
		{
			return;
		}
		
		if( !( 'Highcharts' in win ) )
		{
			graph.innerHTML = 'Failed to load Highcharts.<br>Please unblock <b>cdnjs.cloudflare.com</b> for this to work.';
			
			return;
		}
		
		var d = new Date();
		d.setDate( d.getDate( ) - 1 );
		
		new win[ 'Highcharts' ][ 'Chart' ](
		{
			plotOptions:
			{
				series:
				{
					animation: false,
					color: '#4384D8'
				}
			},
			chart:
			{
				renderTo: graph,
				backgroundColor: '#282936',
				spacing: [5, 0, 0, 0],
				style: {
					fontFamily: "'Open Sans', sans-serif"
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
				enabled: false
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
					text: 'Online CMs Today',
					style:
					{
						color: '#8A8DB7'
					}
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
					pointStart: d.getTime(),
					pointInterval: 30000,
					data: graphData,
					marker:
					{
						enabled: false
					},
					states:
					{
						hover:
						{
							enabled: false
						}
					}
				}
			]
		});
		
		graphData = null;
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
						graph.textContent = 'Failed to load graph data: Failed to parse JSON.';
						
						return;
					}
					
					graphData = response.data;
					
					if( 'Highcharts' in win )
					{
						RenderChart();
					}
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
	
	// Expose render chart so it can get rendered after highcharts loads (and graph data already loaded)
	win[ 'RenderChart' ] = RenderChart;
	win[ 'UpdateGraph' ] = LoadGraph;
	
	Tick( );
	LoadGraph( );
	
	// Refresh graph every 10 minutes
	setInterval( LoadGraph, 600000 );
	
	if( win.Notification && win.Notification.permission !== 'denied' )
	{
		win.Notification.requestPermission();
	}
	
	// http://updates.html5rocks.com/2015/03/increasing-engagement-with-app-install-banners-in-chrome-for-android
	if( 'serviceWorker' in navigator )
	{
		navigator.serviceWorker.register( '/service-worker.js', { scope: './' } );
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

// Only load Google Analytics and Twitter helper widget if DNT is not enabled
if( !_dntEnabled() )
{
	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m);})(win,doc,'script','https://www.google-analytics.com/analytics.js','ga');ga('create','UA-37177069-4','steamstat.us');ga('set','forceSSL',true);ga('send','pageview');
	(function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}})(doc, 'script', 'twitter-wjs');
}
}( document, window ) );
