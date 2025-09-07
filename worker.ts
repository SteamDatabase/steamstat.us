import { WorkerEntrypoint } from "cloudflare:workers";

export default class extends WorkerEntrypoint<Env> {
	async fetch() {
		const value = await this.env.STEAMSTATUS.get('steamstatus', { type: 'json' });
		return Response.json(value);
	}
}
