// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

( function( doc, storage, notif )
{
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
		time_element   = doc.getElementById( 'js-refresh' ),
		
		/**
		 * @param {string} text
		 * @param {string=} data
		 */
		ShowError = function( text, data )
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
		},
		
		Tick = function( )
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
		},
		
		LoadGraph = function( )
		{
			var xhrGraph = new XMLHttpRequest( );
			xhrGraph.open( 'GET', 'https://crowbar.steamdb.info/Gina', true );
			xhrGraph.onreadystatechange = function()
			{
				try
				{
					if( xhrGraph.readyState === 4 )
					{
						response = JSON.parse( xhrGraph.responseText );
						
						if( !response[ 'success' ] )
						{
							graph.textContent = 'Failed to load graph data.';
							
							return;
						}
						
						graphData = response.data;
						
						if( 'Highcharts' in window )
						{
							RenderChart();
						}
					}
				}
				catch( x )
				{
					graph.textContent = 'Failed to load graph data.';
				}
			};
			xhrGraph.ontimeout = function() { graph.textContent = 'Request timed out, unable to render graph.'; };
			xhrGraph.timeout = 10000;
			xhrGraph.send( );
		},
		
		RefreshData = function( )
		{
			loader.style.display = 'block';
			
			xhr = new XMLHttpRequest( );
			xhr.open( 'GET', 'https://crowbar.steamdb.info/Barney', true );
			xhr.onreadystatechange = LoadData;
			xhr.ontimeout = function() { ShowError( 'Request timed out.<br>Reload the page manually.' ); };
			xhr.timeout = 20000;
			xhr.send( );
		},
		
		LoadData = function( )
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
					
					if( !response[ 'success' ] )
					{
						return ShowError( '', 'Success = false' );
					}
					
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
					
					if( previousOnline < 75 && response[ 'online' ] >= 75 && notif )
					{
						if( notif.permission === 'granted' )
						{
							var notification = new notif( 'Steam is back online',
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
							
							if( value.time )
							{
								element.innerHTML = value.title + ' <span class="time" title="Time since last status change">(' + TimeDifference( value.time ) + ')</span>';
							}
							else
							{
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
		},
		
		/**
		 * @param {number} previous
		 * @return {string}
		 */
		TimeDifference = function( previous )
		{
			var msPerMinute = 60 * 1000;
			var msPerHour = msPerMinute * 60;
			var msPerDay = msPerHour * 24;
			var msPerMonth = msPerDay * 30;
			var msPerYear = msPerDay * 365;
			
			var elapsed = Date.now() - ( previous * 1000 );
			
			if( elapsed < msPerMinute )
			{
				return '<1m';
			}
			else if( elapsed < msPerHour )
			{
				return Math.round( elapsed / msPerMinute ) + 'm';
			}
			else if( elapsed < msPerDay )
			{
				return Math.round( elapsed / msPerHour ) + 'h';
			}
			else if( elapsed < msPerMonth )
			{
				return '≈' + Math.round( elapsed / msPerDay ) + 'd';
			}
			else if( elapsed < msPerYear )
			{
				return '≈' + Math.round( elapsed / msPerMonth ) + 'm';
			}
			else
			{
				return '≈' + Math.round( elapsed / msPerYear ) + 'y';
			}
		},
		
		/**
		 * @param {string} item
		 */
		InitializeMatchmakingStats = function( item )
		{
			var storageItem    = 'show_' + item,
				statsContainer = doc.getElementById( 'js-' + item + '-container' ),
				caret          = doc.getElementById( 'js-' + item + '-caret' );
			
			if( storage.getItem( storageItem ) )
			{
				statsContainer.classList.remove( 'closed' );
				
				caret.classList.add( 'up' );
			}
			
			doc.getElementById( 'js-' + item + '-services' ).addEventListener( 'click', function( e )
			{
				e.preventDefault( );
				
				if( !statsContainer.classList.contains( 'closed' ) )
				{
					statsContainer.classList.add( 'closed' );
					
					storage.removeItem( storageItem );
					
					caret.classList.remove( 'up' );
				}
				else
				{
					statsContainer.classList.remove( 'closed' );
					
					storage.setItem( storageItem, 1 );
					
					caret.classList.add( 'up' );
				}
			} );
		};
	
	// Delete noscript element because some browsers think it's cool to render it if javascript is enabled
	if( element )
	{
		element.parentNode.removeChild( element );
	}
	
	Tick( );
	LoadGraph( );
	
	// Insanity checks
	if( !storage || ( notif && !notif.permission ) || !Element.prototype.addEventListener )
	{
		doc.getElementById( 'old-browser' ).style.display = 'block';
	}
	else
	{
		InitializeMatchmakingStats( 'csgo' );
		
		if( notif && notif.permission !== 'denied' )
		{
			notif.requestPermission();
		}
	}
	
	// Not using dot notation so that closure compiler doesn't optimize it away
	window[ 'RenderChart' ] = function()
	{
		if( !graphData )
		{
			return;
		}
		
		if( !( 'Highcharts' in window ) )
		{
			graph.innerHTML = 'Failed to load Highcharts.<br>Please unblock <b>cdnjs.cloudflare.com</b> for this to work.';
			
			return;
		}
		
		var d = new Date();
		d.setDate( d.getDate( ) - 1 );
		
		new window[ 'Highcharts' ][ 'Chart' ](
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
	
	// http://updates.html5rocks.com/2015/03/increasing-engagement-with-app-install-banners-in-chrome-for-android
	if( 'serviceWorker' in navigator )
	{
		navigator.serviceWorker.register( '/service-worker.js', { scope: './' } );
	}
	
	window.addEventListener('beforeinstallprompt', function( e )
	{
		e.userChoice.then( function( choiceResult )
		{
			if( ga )
			{
				ga( 'send', 'event', 'Install Prompt', 'Outcome', choiceResult[ 'outcome' ] );
			}
		} );
	} );
}
catch( e )
{
	ShowError( 'Something broke.<br>' + ( e.message || 'Are you using an outdated browser?' ) );
	
	console.error( e );
}
}( document, localStorage, Notification ) );
