import { WorkerEntrypoint } from "cloudflare:workers";

export default class extends WorkerEntrypoint<Env> {
	async fetch(request: Request) {
		const url = new URL(request.url);

		if (url.pathname === '/') {
			return this.handleSSR(request);
		}
		else if (url.pathname === '/not_an_api.json') {
			const value = await this.env.KV_STATUS.get('steamstatus', { type: 'json' });
			return Response.json(value);
		}

		return new Response(null, { status: 404 });
	}

	async handleSSR(request: Request): Promise<Response> {
		const statusData = await this.env.KV_STATUS.get('steamstatus', { type: 'json' });

		const htmlResponse = await this.env.ASSETS.fetch(request);

		if (!statusData) {
			return htmlResponse;
		}

		// @ts-ignore
		delete statusData.notice;

		const scriptTag = `<script>window.g_SteamStatusSSR=${JSON.stringify(statusData)};</script>`;
		let html = await htmlResponse.text();
		html = html.replace('</body>', `${scriptTag}</body>`);

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=UTF-8'
			}
		});
	}
}
