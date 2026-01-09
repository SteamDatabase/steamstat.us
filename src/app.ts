//! https://github.com/SteamDatabase/steamstat.us

import type { ApiResponse, ChartDefinition } from './types.js';

const statuses = ['good', 'minor', 'major'];
let firstLoad = true;
let secondsToUpdate = 0;
const loader = document.getElementById('loader')!;
const psaElement = document.getElementById('psa')!;
const saleNameElement = document.querySelector<HTMLAnchorElement>('#js-sale-name')!;
const timeElement = document.getElementById('js-refresh')!;
const statusIdsOnPage = new Set<string>();

if (window.location.search.length > 0 || window.location.hash.length > 0) {
	window.history.replaceState(null, '', window.location.origin);
}

for (const el of document.querySelectorAll('.status[id]')) {
	statusIdsOnPage.add(el.id);
}

const charts: ChartDefinition[] = [
	{
		canvas: document.getElementById('js-cms-chart') as HTMLCanvasElement,
		status: document.getElementById('cms')!,
		statusHover: document.getElementById('cms-hover')!,
		hoveredIndex: -1,
		graph: null,
	},
	{
		canvas: document.getElementById('js-pageviews-chart') as HTMLCanvasElement,
		status: document.getElementById('pageviews')!,
		statusHover: document.getElementById('pageviews-hover')!,
		hoveredIndex: -1,
		graph: null,
	},
	{
		canvas: document.getElementById('js-online-chart') as HTMLCanvasElement,
		status: document.getElementById('online')!,
		statusHover: document.getElementById('online-hover')!,
		hoveredIndex: -1,
		graph: null,
	},
];

for (let i = 0; i < charts.length; i++) {
	const canvas = charts[i].canvas!;
	canvas.addEventListener('mousemove', ChartPointerMove.bind(this, i), { passive: true });
	canvas.addEventListener('mouseleave', ChartPointerLeave.bind(this, i), { passive: true });
}

{
	const ssrData = loader.getAttribute('data-ssr');
	if (ssrData) {
		const parsedData = JSON.parse(ssrData);
		secondsToUpdate = 45;
		ProcessApiResponse(parsedData);
	} else {
		Tick();
	}
}

RemoveNoscript();

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js', { scope: './' }).catch((e) => {
		// eslint-disable-next-line no-console
		console.error(e);
	});
}

function ShowError(text: string) {
	loader.setAttribute('hidden', '');
	psaElement.removeAttribute('hidden');
	psaElement.textContent = text;
}

function RefreshData() {
	loader.removeAttribute('hidden');

	let pleaseDoNotUseThis = 'not_an_api.json';

	const xhr = new XMLHttpRequest();
	xhr.open('GET', pleaseDoNotUseThis, true);
	xhr.onreadystatechange = () => LoadData(xhr);
	xhr.ontimeout = () => ShowError('Request timed out. Is your network working?');
	xhr.timeout = 20000;
	xhr.send();
}

function Tick() {
	timeElement.textContent = secondsToUpdate < 10 ? `0${secondsToUpdate}` : `${secondsToUpdate}`;

	if (secondsToUpdate <= 0) {
		secondsToUpdate = 45;

		RefreshData();
	} else {
		setTimeout(Tick.bind(this), 1000);

		secondsToUpdate -= 1;
	}
}

function LoadData(xhr: XMLHttpRequest) {
	if (xhr.readyState !== 4) {
		return;
	}

	const responseText = xhr.responseText;

	try {
		loader.setAttribute('hidden', '');

		if (xhr.status === 0) {
			ShowError('Failed to update the status. Is your network working?');
			return;
		}

		if (xhr.status !== 200) {
			ShowError(`Status: ${xhr.status}`);
			return;
		}

		if (responseText === null || responseText[0] !== '{') {
			ShowError('Received invalid data. Is your network working?');
			return;
		}

		const response = JSON.parse(responseText) as ApiResponse;
		ProcessApiResponse(response);
	} catch (error: any) {
		ShowError(error.message);
		console.error(error); // eslint-disable-line no-console
	}
}

function ProcessApiResponse(response: ApiResponse) {
	try {
		let psa = response.psa;
		const timeDiff = Math.abs(Date.now() / 1000 - response.time);

		if (timeDiff > 300) {
			if (psa) {
				psa += '<hr>';
			} else {
				psa = '';
			}

			psa += `Data appears to be ${Math.round(timeDiff / 60)} minutes old.`;

			if (timeDiff > 3000) {
				psa += ' <a href="https://time.is" target="_blank" rel="noopener">Is your clock out of sync?</a>';
			}
		}

		if (psa) {
			if (psaElement.hasAttribute('hidden')) {
				psaElement.removeAttribute('hidden');
			}

			if (psaElement.innerHTML !== psa) {
				psaElement.innerHTML = psa;
			}
		} else if (!psaElement.hasAttribute('hidden')) {
			psaElement.innerHTML = '';
			psaElement.setAttribute('hidden', '');
		}

		if (response.sale) {
			if (!saleNameElement.classList.contains('has-sale')) {
				saleNameElement.classList.add('has-sale');
			}

			if (saleNameElement.textContent !== response.sale) {
				saleNameElement.textContent = response.sale;
				saleNameElement.href = 'https://steamdb.info/sales/';
			}
		} else if (saleNameElement.classList.contains('has-sale')) {
			saleNameElement.textContent = 'Sales & Deals';
			saleNameElement.classList.remove('has-sale');
			saleNameElement.href = 'https://steamdb.info/sales/history/';
		}

		if (response.services) {
			const missingServices = new Set(statusIdsOnPage);

			for (const [service, status, title] of response.services) {
				const element = document.getElementById(service);

				if (!element) {
					console.error('Missing DOM element for', service);
					continue;
				}

				missingServices.delete(service);

				const className = `status ${statuses[status]}`;

				if (firstLoad) {
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

			for (const service of missingServices) {
				console.error('Unused DOM element for', service);

				const element = document.getElementById(service)!;
				element.className = 'status major';
				element.textContent = 'Removed';
			}
		}

		firstLoad = false;

		if (response.c_cms) {
			charts[0].graph = response.c_cms;
		}

		if (response.c_pv) {
			charts[1].graph = response.c_pv;
		}

		if (response.c_users) {
			charts[2].graph = response.c_users;
		}

		Tick();

		requestAnimationFrame(() => {
			for (let i = 0; i < charts.length; i++) {
				DrawChart(i);
			}
		});
	} catch (error: any) {
		ShowError(error.message);
		console.error(error); // eslint-disable-line no-console
	}
}

function DrawChart(chartIndex: number) {
	const { canvas, graph, hoveredIndex } = charts[chartIndex];
	const rect = canvas.getBoundingClientRect();
	const width = rect.width * devicePixelRatio;
	const height = rect.height * devicePixelRatio;

	const ctx = canvas.getContext('2d');

	if (graph === null || ctx === null) {
		return;
	}

	// Setting size clears the canvas
	canvas.width = width;
	canvas.height = height;

	let minVal = 0;
	let maxVal = 100;

	if (chartIndex === 2) {
		minVal = Math.min(...graph.data);
		maxVal = Math.max(...graph.data);
	}

	const range = Math.max(1, maxVal - minVal);
	const normalize = chartIndex === 2
		? (value: number) => (value - minVal) / range
		: (value: number) => (value as number) / 100;

	// Draw gradient
	const grd = ctx.createLinearGradient(0, 0, 0, height);
	grd.addColorStop(0, 'rgba(93, 145, 223, .2)');
	grd.addColorStop(1, 'transparent');

	ctx.fillStyle = grd;

	ctx.beginPath();

	let i = 0;
	const paddedHeight = height * 0.95;
	const halfHeight = height / 2;
	const gap = width / (graph.data.length - 1);

	ctx.moveTo(0, height);

	for (const point of graph.data) {
		const val = 2 * (normalize(point) - 0.5);
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
		const val = 2 * (normalize(point) - 0.5);
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

	if (circleX !== null && circleY !== null) {
		ctx.beginPath();
		ctx.fillStyle = '#fff';
		ctx.arc(circleX, circleY, 3 * devicePixelRatio, 0, Math.PI * 2);
		ctx.fill();
	}
}

function ChartPointerMove(chartIndex: number, eOriginal: Event) {
	const e = eOriginal as PointerEvent;
	const chart = charts[chartIndex];

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

	chart.hoveredIndex = index;

	requestAnimationFrame(() => {
		DrawChart(chartIndex);
	});

	const date = new Date((chart.graph.start * 1000) + (chart.graph.step * 1000 * index)).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		hourCycle: 'h23',
	});

	// Online chart shows raw numbers
	if (chartIndex === 2) {
		chart.statusHover.textContent = `${chart.graph.data[index].toLocaleString()} at ${date}`;
	} else {
		chart.statusHover.textContent = `${chart.graph.data[index]}% at ${date}`;
	}
}

function ChartPointerLeave(chartIndex: number) {
	if (charts[chartIndex].graph === null) {
		return;
	}

	charts[chartIndex].hoveredIndex = -1;
	charts[chartIndex].statusHover.hidden = true;
	charts[chartIndex].status.hidden = false;

	requestAnimationFrame(() => {
		DrawChart(chartIndex);
	});
}

function RemoveNoscript() {
	document.querySelector('noscript')?.remove();
}
