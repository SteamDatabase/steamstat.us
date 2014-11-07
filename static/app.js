// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

( function( doc, storage )
{
try
{
	var key, value, response, xhr, psa, timeDiff,
		loader         = doc.getElementById( 'loader' ),
		element        = doc.getElementsByTagName( 'noscript' )[ 0 ],
		psa_element    = doc.getElementById( 'psa' ),
		
		ShowError = function( text )
		{
			loader.style.display = 'block';
			doc.getElementById( 'loader-content' ).style.display = 'none';
			( element = doc.getElementById( 'loader-error' ) ).style.display = 'block';
			
			if( text )
			{
				element.innerHTML = text;
			}
		},
		
		RefreshData = function( )
		{
			loader.style.display = 'block';
			
			xhr = new XMLHttpRequest( );
			xhr.open( 'GET', 'https://steamdb.info/api/SteamRailgun/?' + Math.round( Date.now() / 1000 / 60 ) * 60, true );
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
						return ShowError( 0 );
					}
					
					if( response === null || response[ 0 ] !== '{' )
					{
						return ShowError( 'Received invalid data.<br>Is something wrong with your network?' );
					}
					
					response = JSON.parse( response );
					
					if( !response[ 'success' ] )
					{
						return ShowError( 0 );
					}
					
					psa = response[ 'psa' ] || '';
					
					timeDiff = Math.abs( Date.now() / 1000 - response[ 'time' ] );
					
					if( timeDiff > 300 )
					{
						if( psa )
						{
							psa = '<hr>';
						}
						
						psa += 'Data appears to be ' + 0 | ( timeDiff / 60 ) + ' minutes old.';
						
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
					
					setTimeout( RefreshData, 60000 );
				}
				catch( x )
				{
					ShowError( 0 );
					
					console.debug( 'Status:', xhr.status, xhr.statusText );
					console.debug( 'Data:', response );
				}
			}
		},
		
		/** @return {string} */
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
				return 'just now';
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
		
		InitializeMatchmakingStats = function( item )
		{
			var yeOlDumbeClassName = 'mmstats services',
				storageItem = 'show_' + item,
				statsContainer = doc.getElementById( item + '-container' );
			
			if( storage.getItem( storageItem ) )
			{
				statsContainer.className = yeOlDumbeClassName;
			}
			
			doc.getElementById( item + '-button' ).addEventListener( 'click', function( e )
			{
				try
				{
					e.preventDefault( );
					
					if( statsContainer.className === yeOlDumbeClassName )
					{
						statsContainer.className = yeOlDumbeClassName + ' closed';
						
						storage.removeItem( storageItem );
					}
					else
					{
						statsContainer.className = yeOlDumbeClassName;
						
						storage.setItem( storageItem, 1 );
					}
				}
				catch( x )
				{
					//
				}
			} );
		};
	
	if( element )
	{
		element.parentNode.removeChild( element );
	}
	
	RefreshData( );
	
	if( storage && Element.prototype.addEventListener )
	{
		InitializeMatchmakingStats( 'csgo' );
		InitializeMatchmakingStats( 'dota' );
	}
}
catch( e )
{
	ShowError( 'Something broke.<br>Are you using an outdated browser?' );
	console.error( e );
}
}( document, localStorage ) );
