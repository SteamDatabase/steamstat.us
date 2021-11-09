(function Bootstrap() {
	class SteamStatus {
		constructor() {
			this.statuses = ['good', 'minor', 'major'];
			this.firstLoad = true;
			this.secondsToUpdate = 0;
			this.loader = document.getElementById('loader');
			this.psa_element = document.getElementById('psa');
			this.time_element = document.getElementById('js-refresh');
			this.canvas = document.getElementById('js-cms-chart');
			this.cmsStatus = document.getElementById('cms');
			this.cmsStatusHover = document.getElementById('cms-hover');
			this.chartHoveredIndex = -1;
			this.graph = null;

			if (window.location.search.length > 0 || window.location.hash.length > 0) {
				window.history.replaceState(null, '', window.location.origin);
			}

			this.canvas.addEventListener('mousemove', this.ChartPointerMove.bind(this), { passive: true });
			this.canvas.addEventListener('mouseleave', this.ChartPointerLeave.bind(this), { passive: true });
		}

		ShowError(text) {
			this.loader.setAttribute('hidden', '');
			this.psa_element.removeAttribute('hidden');
			this.psa_element.textContent = text;
		}

		RefreshData() {
			this.loader.removeAttribute('hidden');

			const pleaseDoNotUseThis = 'not_an_api.json';
			const xhr = new XMLHttpRequest();
			xhr.open('GET', `https://vortigaunt.steamstat.us/${pleaseDoNotUseThis}`, true);
			xhr.onreadystatechange = () => this.LoadData(xhr);
			xhr.ontimeout = () => this.ShowError('Request timed out. Is your network working?');
			xhr.timeout = 20000;
			xhr.withCredentials = true;
			xhr.send();
		}

		Tick() {
			this.time_element.textContent = this.secondsToUpdate < 10 ? `0${this.secondsToUpdate}` : this.secondsToUpdate;

			if (this.secondsToUpdate <= 0) {
				this.secondsToUpdate = 45;

				this.RefreshData();
			} else {
				setTimeout(this.Tick.bind(this), 1000);

				this.secondsToUpdate -= 1;
			}
		}

		LoadData(xhr) {
			if (xhr.readyState !== 4) {
				return;
			}

			let response = xhr.responseText;

			try {
				this.loader.setAttribute('hidden', '');

				if (xhr.status === 0) {
					this.ShowError('Failed to update the status. Is your network working?');
					return;
				}

				if (xhr.status !== 200) {
					this.ShowError(`Status: ${xhr.status}`);
					return;
				}

				if (response === null || response[0] !== '{') {
					this.ShowError('Received invalid data. Is your network working?');
					return;
				}

				response = JSON.parse(response);
				let psa = response.psa || '';
				const timeDiff = Math.abs(Date.now() / 1000 - response.time);

				if (timeDiff > 300) {
					if (psa) {
						psa += '<hr>';
					}

					psa += `Data appears to be ${Math.round(timeDiff / 60)} minutes old.`;

					if (timeDiff > 3000) {
						psa += ' <a href="https://time.is" target="_blank" rel="noopener">Is your clock out of sync?</a>';
					}
				}

				if (psa) {
					if (this.psa_element.hasAttribute('hidden')) {
						this.psa_element.removeAttribute('hidden');
					}

					if (this.psa_element.innerHTML !== psa) {
						this.psa_element.innerHTML = psa;
					}
				} else if (!this.psa_element.hasAttribute('hidden')) {
					this.psa_element.innerHTML = '';
					this.psa_element.setAttribute('hidden', '');
				}

				for (const [service, status, title] of response.services) {
					const element = document.getElementById(service);

					if (!element) {
						// eslint-disable-next-line no-console
						console.error('Missing DOM element for', service);
						// eslint-disable-next-line no-continue
						continue;
					}

					const className = `status ${this.statuses[status]}`;

					if (this.firstLoad) {
						// Initial page load
						element.className = className;
					} else if (element.className !== className) {
						element.className = `${className} status-changed`;

						element.addEventListener('animationend', () => {
							element.className = className;
						}, { once: true });
					}

					if (element.textContent !== title) {
						element.textContent = title;
					}
				}

				this.firstLoad = false;

				if (response.graph) {
					this.graph = response.graph;
					this.DrawChart();
				}

				this.Tick();
			} catch (error) {
				this.ShowError(error.message);
				console.error(error); // eslint-disable-line no-console
			}
		}

		DrawChart() {
			const rect = this.canvas.getBoundingClientRect();
			const width = rect.width * devicePixelRatio;
			const height = rect.height * devicePixelRatio;

			const gap = width / (this.graph.data.length - 1);
			const ctx = this.canvas.getContext('2d');

			this.canvas.width = width;
			this.canvas.height = height;

			ctx.beginPath();

			let i = 0;
			let circleX = null;
			let circleY = null;
			const paddedHeight = height * 0.95;
			const halfHeight = height / 2;

			ctx.moveTo(-50, height);

			for (const point of this.graph.data) {
				const val = 2 * (point / 100 - 0.5);
				const x = i * gap;
				const y = (-val * paddedHeight) / 2 + halfHeight;
				ctx.lineTo(x, y);

				if (this.chartHoveredIndex === i) {
					circleX = x;
					circleY = y;
				}

				i += 1;
			}

			const grd = ctx.createLinearGradient(0, 0, 0, height);
			grd.addColorStop(0, 'rgba(93, 145, 223, .2)');
			grd.addColorStop(1, 'transparent');

			ctx.lineTo(width + 50, height);
			ctx.fillStyle = grd;
			ctx.strokeStyle = '#5d91df';
			ctx.lineWidth = 1.5 * devicePixelRatio;
			ctx.fill();
			ctx.stroke();

			if (circleX !== null) {
				ctx.beginPath();
				ctx.fillStyle = '#fff';
				ctx.arc(circleX, circleY, 3 * devicePixelRatio, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		ChartPointerMove(e) {
			if (this.graph === null) {
				return;
			}

			const gap = this.canvas.offsetWidth / (this.graph.data.length - 1);
			const x = e.offsetX - (gap / 2);
			const index = Math.ceil(x / gap);

			if (this.chartHoveredIndex === index) {
				return;
			}

			if (this.chartHoveredIndex === -1) {
				this.cmsStatus.hidden = true;
				this.cmsStatusHover.hidden = false;
			}

			this.chartHoveredIndex = index;
			this.DrawChart();

			const date = new Date(this.graph.start + (this.graph.step * index)).toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				hourCycle: 'h23',
			});

			this.cmsStatusHover.textContent = `${this.graph.data[index]}% at ${date}`;
		}

		ChartPointerLeave() {
			if (this.graph === null) {
				return;
			}

			this.chartHoveredIndex = -1;
			this.cmsStatusHover.hidden = true;
			this.cmsStatus.hidden = false;
			this.DrawChart();
		}

		HandleFollowButton() {
			const follow = document.getElementById('js-twitter-follow');
			follow.addEventListener('click', (e) => {
				const left = Math.round(window.screen.width / 2 - 250);
				const top = Math.round(window.screen.height / 2 - 300);

				window.open(follow.href, undefined, `scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=500,height=600,left=${left},top=${top}`);

				e.preventDefault();
				e.stopPropagation();
			});
		}

		RemoveNoscript() {
			const element = document.getElementsByTagName('noscript')[0];

			if (element) {
				element.parentNode.removeChild(element);
			}
		}
	}

	const status = new SteamStatus();
	status.Tick();
	status.RemoveNoscript();
	status.HandleFollowButton();

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/service-worker.js', { scope: './' }).catch((e) => {
			// eslint-disable-next-line no-console
			console.error(e);
		});
	}
}());
