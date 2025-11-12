import { API_KEY } from './config.js';

export async function apiRequest(url, { method = 'GET', body } = {}) {
	const headers = {
		'Content-Type': 'application/json',
		'X-Noroff-API-Key': API_KEY,
	};

	const response = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	const isJson = response.headers.get('content-type')?.includes('application/json');
	const data = isJson ? await response.json() : null;

	if (!response.ok) {
		const msg = data?.errors?.[0]?.message || data?.message || `HTTP ${response.status}`;
		throw new Error(msg);
	}

	return data;
}
