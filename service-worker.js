async function networkOrCache(event) {
	try {
		const response = await fetch(event.request);

		if (response.ok) {
			const cache = await caches.open('steamstatus');
			await cache.put(event.request, response.clone());
			return response;
		}

		throw new Error(`Request failed with HTTP ${response.status}`);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error(e.message, event.request.url);

		const cache = await caches.open('steamstatus');
		const matching = await cache.match(event.request);

		return matching || Promise.reject(new Error('Request not in cache'));
	}
}

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	if (!event.request.url.startsWith(self.registration.scope)) {
		return;
	}

	event.respondWith(networkOrCache(event));
});
