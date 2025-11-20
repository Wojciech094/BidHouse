

export const API_BASE = 'https://v2.api.noroff.dev';
export const AUCTION = `${API_BASE}/auction`;

export function getUser() {
	try {
		return JSON.parse(localStorage.getItem('user'));
	} catch {
		return null;
	}
}

export function getToken() {
	return localStorage.getItem('token');
}

export function getApiKey() {
	return localStorage.getItem('apiKey');
}

export async function apiRequest(path, options = {}) {
	const token = getToken();
	const apiKey = getApiKey();

	const headers = {
		'Content-Type': 'application/json',
		...(options.headers || {}),
	};

	if (token) headers['Authorization'] = `Bearer ${token}`;
	if (apiKey) headers['X-Noroff-API-Key'] = apiKey;

	const res = await fetch(path, { ...options, headers });

	if (!res.ok) {
		console.error('API ERROR:', res.status, path);
		throw new Error('API request failed');
	}

	return res.json();
}

export function formatEndsIn(endsAt) {
	if (!endsAt) return 'Unknown';

	const now = new Date();
	const diffMs = endsAt.getTime() - now.getTime();

	if (diffMs <= 0) return 'Ended';

	const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;

	if (days > 0) return `${days}d ${hours}h`;

	if (hours > 0) {
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		return `${hours}h ${minutes}m`;
	}

	const minutes = Math.floor(diffMs / (1000 * 60));
	if (minutes > 0) return `${minutes}m`;

	const seconds = Math.floor(diffMs / 1000);
	return `${seconds}s`;
}


export function renderCredits(amount) {
	if (amount == null) return '';

	return `
    <span class="inline-flex items-center gap-1 align-middle">
      <img src="/credits.svg" alt="Credits" class="h-4 w-auto inline-block" />
      <span>${amount}</span>
    </span>
  `;
}

export async function placeBid(listingId, amount) {
	const am = Number(amount);
	if (!Number.isFinite(am) || am <= 0) {
		throw new Error('Invalid bid amount');
	}

	const token = getToken();
	if (!token) {
		throw new Error('AUTH_REQUIRED');
	}

	const url = `${AUCTION}/listings/${listingId}/bids`;

	return apiRequest(url, {
		method: 'POST',
		body: JSON.stringify({ amount: am }),
	});
}
