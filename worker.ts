import { WorkerEntrypoint } from "cloudflare:workers";
import type { ApiResponse } from "./src/types.js";

export default class extends WorkerEntrypoint<Env> {
	async fetch(request: Request) {
		const url = new URL(request.url);

		if (url.pathname === '/') {
			return this.handleSSR(request);
		}
		else if (url.pathname === '/not_an_api.json') {
			const value = await this.env.KV_STATUS.get<ApiResponse>('steamstatus', { type: 'json' });
			return Response.json(value);
		}

		return new Response(null, { status: 404 });
	}

	async handleSSR(request: Request): Promise<Response> {
		const statusData = await this.env.KV_STATUS.get<ApiResponse>('steamstatus', { type: 'json' });

		const htmlResponse = await this.env.ASSETS.fetch(request);

		if (!statusData) {
			return htmlResponse;
		}

		const statuses = ['good', 'minor', 'major'];
		const servicesMap = new Map(statusData.services.map(([id, status, title]) => [id, { status, title }]));

		return new HTMLRewriter()
			.on('.status[id]', {
				element(element) {
					const serviceId = element.getAttribute('id');

					if (!serviceId || serviceId === 'cms-hover' || serviceId === 'pageviews-hover') {
						return;
					}

					const service = servicesMap.get(serviceId);
					if (service) {
						element.setAttribute('class', `status ${statuses[service.status]}`);
						element.setInnerContent(service.title);
					}
				}
			})
			.on('#psa', {
				element(element) {
					if (statusData.psa) {
						element.removeAttribute('hidden');
						element.setInnerContent(statusData.psa, { html: true });
					}
				}
			})
			.on('#loader', {
				element(element) {
					const ssrData = structuredClone(statusData);

					// @ts-ignore
					delete ssrData.notice;
					// @ts-ignore
					delete ssrData.services;

					element.setAttribute('hidden', '');
					element.setAttribute('data-ssr', JSON.stringify(ssrData));
				}
			})
			.on('#js-sale-name', {
				element(element) {
					if (statusData.sale) {
						element.setAttribute('class', 'has-sale');
						element.setInnerContent(statusData.sale);
					}
				}
			})
			.transform(htmlResponse);
	}
}
