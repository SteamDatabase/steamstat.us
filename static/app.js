(function Bootstrap() {
	class SteamStatus {
		constructor() {
			this.statuses = ['good', 'minor', 'major'];
			this.firstLoad = true;
			this.secondsToUpdate = 0;
			this.loader = document.getElementById('loader');
			this.psa_element = document.getElementById('psa');
			this.time_element = document.getElementById('js-refresh');

			if (window.location.search.length > 0 || window.location.hash.length > 0) {
				window.history.replaceState(null, '', window.location.origin);
			}

			this.charts = [
				{
					canvas: document.getElementById('js-cms-chart'),
					status: document.getElementById('cms'),
					statusHover: document.getElementById('cms-hover'),
					hoveredIndex: -1,
					graph: null,
				},
				{
					canvas: document.getElementById('js-pageviews-chart'),
					status: document.getElementById('pageviews'),
					statusHover: document.getElementById('pageviews-hover'),
					hoveredIndex: -1,
					graph: null,
				},
			];

			for (let i = 0; i < this.charts.length; i += 1) {
				const { canvas } = this.charts[i];
				canvas.addEventListener('mousemove', this.ChartPointerMove.bind(this, i), { passive: true });
				canvas.addEventListener('mouseleave', this.ChartPointerLeave.bind(this, i), { passive: true });
			}
		}

		ShowError(text) {
			this.loader.setAttribute('hidden', '');
			this.psa_element.removeAttribute('hidden');
			this.psa_element.textContent = text;
		}

		RefreshData() {
			this.loader.removeAttribute('hidden');

			let pleaseDoNotUseThis = 'not_an_api.json';

			if (window.location.hostname !== 'localhost') {
				pleaseDoNotUseThis = `https://vortigaunt.steamstat.us/${pleaseDoNotUseThis}`;
			}

			const xhr = new XMLHttpRequest();
			xhr.open('GET', pleaseDoNotUseThis, true);
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

				if (response.c_cms) {
					this.charts[0].graph = response.c_cms;
					this.DrawChart(0);
				}

				if (response.c_pv) {
					this.charts[1].graph = response.c_pv;
					this.DrawChart(1);
				}

				this.Tick();
			} catch (error) {
				this.ShowError(error.message);
				console.error(error); // eslint-disable-line no-console
			}
		}

		DrawChart(chartIndex) {
			const { canvas, graph, hoveredIndex } = this.charts[chartIndex];
			const rect = canvas.getBoundingClientRect();
			const width = rect.width * devicePixelRatio;
			const height = rect.height * devicePixelRatio;

			const gap = width / (graph.data.length - 1);
			const ctx = canvas.getContext('2d');

			// Setting size clears the canvas
			canvas.width = width;
			canvas.height = height;

			// Draw gradient
			const grd = ctx.createLinearGradient(0, 0, 0, height);
			grd.addColorStop(0, 'rgba(93, 145, 223, .2)');
			grd.addColorStop(1, 'transparent');

			ctx.fillStyle = grd;

			ctx.beginPath();

			let i = 0;
			const paddedHeight = height * 0.95;
			const halfHeight = height / 2;

			ctx.moveTo(0, height);

			for (const point of graph.data) {
				const val = 2 * (point / 100 - 0.5);
				const x = i * gap;
				const y = (-val * paddedHeight) / 2 + halfHeight;
				ctx.lineTo(x, y);

				i += 1;
			}

			ctx.lineTo(width, height);
			ctx.fill();

			ctx.beginPath();

			// Draw line
			ctx.strokeStyle = '#5d91df';
			ctx.lineWidth = 2 * devicePixelRatio;

			let circleX = null;
			let circleY = null;
			i = 0;

			for (const point of graph.data) {
				const val = 2 * (point / 100 - 0.5);
				const x = i * gap;
				const y = (-val * paddedHeight) / 2 + halfHeight;

				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}

				if (hoveredIndex === i) {
					circleX = x;
					circleY = y;
				}

				i += 1;

				// Page views chart, last point is partial so draw dashed line
				if (chartIndex === 1 && graph.data.length === i + 1) {
					ctx.stroke();

					ctx.beginPath();

					ctx.setLineDash([5 * devicePixelRatio, 3 * devicePixelRatio]);
					ctx.strokeStyle = '#4f5061';
					ctx.moveTo(x, y);
				}
			}

			ctx.stroke();

			if (circleX !== null) {
				ctx.beginPath();
				ctx.fillStyle = '#fff';
				ctx.arc(circleX, circleY, 3 * devicePixelRatio, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		ChartPointerMove(chartIndex, e) {
			const chart = this.charts[chartIndex];

			if (chart.graph === null) {
				return;
			}

			const gap = chart.canvas.offsetWidth / (chart.graph.data.length - 1);
			const x = e.offsetX - (gap / 2);
			const index = Math.ceil(x / gap);

			if (chart.hoveredIndex === index) {
				return;
			}

			if (chart.hoveredIndex === -1) {
				chart.status.hidden = true;
				chart.statusHover.hidden = false;
			}

			this.charts[chartIndex].hoveredIndex = index;
			this.DrawChart(chartIndex);

			const date = new Date((chart.graph.start * 1000) + (chart.graph.step * 1000 * index)).toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				hourCycle: 'h23',
			});

			chart.statusHover.textContent = `${chart.graph.data[index]}% at ${date}`;
		}

		ChartPointerLeave(chartIndex) {
			if (this.charts[chartIndex].graph === null) {
				return;
			}

			this.charts[chartIndex].hoveredIndex = -1;
			this.charts[chartIndex].statusHover.hidden = true;
			this.charts[chartIndex].status.hidden = false;
			this.DrawChart(chartIndex);
		}

		RemoveNoscript() {
			const element = document.querySelector('noscript');

			if (element) {
				element.parentNode.removeChild(element);
			}
		}
	}

	const status = new SteamStatus();
	status.Tick();
	status.RemoveNoscript();

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/service-worker.js', { scope: './' }).catch((e) => {
			// eslint-disable-next-line no-console
			console.error(e);
		});
	}
}());
