const API_BASE = 'https://v2.api.noroff.dev';
export const AUCTION = `${API_BASE}/auction`;

const LAST_SEEN_WINS_KEY = 'lastSeenWinsCount';

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

export async function ensureApiKey() {
	const existing = getApiKey();
	const token = getToken();

	
	if (existing || !token) return existing || null;

	try {
		const res = await fetch(`${API_BASE}/auth/create-api-key`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ name: 'BidHouse key' }),
		});

		const data = await res.json();

		if (!res.ok) {
			console.error('API key error', data);
			return null;
		}

		const key = data.data?.key;
		if (key) {
			localStorage.setItem('apiKey', key);
			return key;
		}

		return null;
	} catch (err) {
		console.error('API key network error', err);
		return null;
	}
}

export async function apiRequest(path, options = {}) {
	const token = getToken();
	const apiKey = getApiKey();

	const headers = {
		'Content-Type': 'application/json',
		...(options.headers || {}),
	};

	if (token) headers.Authorization = `Bearer ${token}`;
	if (apiKey) headers['X-Noroff-API-Key'] = apiKey;

	let res;

	try {
		res = await fetch(path, {
			...options,
			headers,
		});
	} catch (networkError) {
		console.error('Network error', networkError);
		const err = new Error('NETWORK_ERROR');
		err.cause = networkError;
		throw err;
	}


	const hasBody = res.status !== 204 && res.status !== 205;

	let data = null;
	if (hasBody) {
		try {
			data = await res.json();
		} catch {
			
			data = null;
		}
	}

	if (!res.ok) {
		console.error('API error', res.status, path, data);
		const msgFromApi =
			data?.errors?.[0]?.message ||
			data?.message ||
			(res.status === 404 ? 'Requested resource was not found.' : 'Request failed.');

		const err = new Error(msgFromApi);
		err.status = res.status;
		err.data = data;
		throw err;
	}

	
	return data ?? {};
}


export function renderCredits(amount) {
	const n = typeof amount === 'number' ? amount : Number(amount) || 0;
	return `${n} credits`;
}

export function formatEndsIn(endsAtStr) {
	if (!endsAtStr) return 'Unknown';

	const endsAt = new Date(endsAtStr);
	const now = new Date();
	const diffMs = endsAt.getTime() - now.getTime();

	if (diffMs <= 0) return 'Ended';

	const totalMinutes = Math.floor(diffMs / (1000 * 60));
	const days = Math.floor(totalMinutes / (60 * 24));
	const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
	const minutes = totalMinutes % 60;

	if (days > 0) return `Ends in ${days}d ${hours}h`;
	if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
	return `Ends in ${minutes}m`;
}


async function fetchProfileSummary(name) {
	if (!name) return null;

	try {
		await ensureApiKey(); 
		const { data } = await apiRequest(`${AUCTION}/profiles/${encodeURIComponent(name)}?_wins=true`);

		return data;
	} catch (err) {
		console.error('Profile error:', err);
		return null;
	}
}



function setupUserMenuToggle() {
	const btn = document.getElementById('user-menu-button');
	const menu = document.getElementById('user-menu');

	if (!btn || !menu) return;

	
	btn.setAttribute('aria-expanded', 'false');

	function openMenu() {
		menu.classList.remove('hidden');
		btn.setAttribute('aria-expanded', 'true');
	}

	function closeMenu() {
		menu.classList.add('hidden');
		btn.setAttribute('aria-expanded', 'false');
	}

	
	btn.addEventListener('click', e => {
		e.stopPropagation();
		const isHidden = menu.classList.contains('hidden');
		isHidden ? openMenu() : closeMenu();
	});

	
	document.addEventListener('click', e => {
		if (!menu.classList.contains('hidden')) {
			const clickedInside = menu.contains(e.target);
			const clickedButton = btn.contains(e.target);
			if (!clickedInside && !clickedButton) {
				closeMenu();
			}
		}
	});

	
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
			closeMenu();
		}
	});
}


function setupLogoutButtons() {
	const buttons = [document.getElementById('logout-btn'), document.getElementById('dropdown-logout-btn')];

	buttons.forEach(btn => {
		if (!btn) return;

		btn.addEventListener('click', () => {
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			localStorage.removeItem('apiKey');
			
			window.location.href = './index.html';
		});
	});
}

export function showApiError(container, message = 'Could not load data. Please try again.') {
	if (!container) return;
	container.innerHTML = `
		<div class="p-4 mt-4 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
			${message}
		</div>
	`;
}

function setupNotifButton(getCurrentWinsCount) {
	const btn = document.getElementById('notif-btn');
	if (!btn) return;

	btn.addEventListener('click', () => {
		const currentWins = typeof getCurrentWinsCount === 'function' ? Number(getCurrentWinsCount()) || 0 : 0;

		localStorage.setItem(LAST_SEEN_WINS_KEY, String(currentWins));

		const notifBadge = document.getElementById('notif-badge');
		if (notifBadge) {
			notifBadge.classList.add('hidden');
			notifBadge.textContent = '0';
		}

		window.location.href = './my-wins.html';
	});
}

export async function setupHeader() {
	const user = getUser();
	const token = getToken();

	const loggedOut = document.getElementById('auth-logged-out');
	const loggedIn = document.getElementById('auth-logged-in');

	const nameEl = document.getElementById('user-name');
	const avatarEl = document.getElementById('user-avatar');
	const chipEl = document.getElementById('user-chip');

	const menuUsername = document.getElementById('menu-username');
	const menuEmail = document.getElementById('menu-email');
	const menuCredits = document.getElementById('menu-credits');

	const notifBadge = document.getElementById('notif-badge');

	if (!loggedOut || !loggedIn) return;

	if (!user || !token) {
		loggedIn.classList.add('hidden');
		loggedOut.classList.remove('hidden');
		return;
	}

	loggedOut.classList.add('hidden');
	loggedIn.classList.remove('hidden');

	const name = user.name;
	const email = user.email;

	if (nameEl) nameEl.textContent = name;
	if (menuUsername) menuUsername.textContent = name;
	if (menuEmail) menuEmail.textContent = email;

	if (chipEl) {
		chipEl.style.backgroundImage = '';
		chipEl.style.backgroundColor = 'white';
		chipEl.style.backdropFilter = '';
	}

	if (avatarEl) {
		const initials = name
			.split(' ')
			.map(n => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();

		avatarEl.textContent = initials;
		avatarEl.innerHTML = initials;
	}

	
	let lastWinCount = 0;

	setupUserMenuToggle();
	setupLogoutButtons();
	
	setupNotifButton(() => lastWinCount);

	async function checkWinsLive() {
		const user = getUser();
		if (!user) return;

		try {
			await ensureApiKey();

			const { data } = await apiRequest(`${AUCTION}/profiles/${user.name}?_wins=true`);
			const winsCount = data._count?.wins ?? data.wins?.length ?? 0;

			
			if (lastWinCount === 0) {
				lastWinCount = winsCount;
				return;
			}

			const lastSeenStr = localStorage.getItem(LAST_SEEN_WINS_KEY);
			const lastSeen = lastSeenStr ? Number(lastSeenStr) : 0;

			if (winsCount > lastWinCount && winsCount > lastSeen) {
				showToast(' You won a new auction!', 'success');

				const badge = document.getElementById('notif-badge');
				if (badge) {
					badge.textContent = winsCount > 9 ? '9+' : String(winsCount);
					badge.classList.remove('hidden');
				}
			}

			lastWinCount = winsCount;
		} catch (err) {
			console.error('Live-win-check error', err);
		}
	}

	setInterval(checkWinsLive, 30000);

	try {
		const profile = await fetchProfileSummary(name);
		if (!profile) return;

		const credits = typeof profile.credits === 'number' ? profile.credits : 0;
		if (menuCredits) menuCredits.textContent = String(credits);

		const winsCount =
			typeof profile._count?.wins === 'number'
				? profile._count.wins
				: Array.isArray(profile.wins)
				? profile.wins.length
				: 0;

		lastWinCount = winsCount;

		const lastSeenStr = localStorage.getItem(LAST_SEEN_WINS_KEY);
		const lastSeen = lastSeenStr ? Number(lastSeenStr) : 0;
		const hasUnseenWins = winsCount > lastSeen;

		if (notifBadge) {
			if (hasUnseenWins) {
				notifBadge.textContent = winsCount > 9 ? '9+' : String(winsCount);
				notifBadge.classList.remove('hidden');
			} else {
				notifBadge.classList.add('hidden');
			}
		}

		if (avatarEl) {
			avatarEl.innerHTML = '';

			const img = document.createElement('img');
			img.src = profile.avatar?.url || 'https://placehold.co/40x40?text=U';
			img.alt = `${profile.name} avatar`;
			img.className = 'object-cover w-6 h-6 rounded-full';

			avatarEl.appendChild(img);
		}
	} catch (err) {
		console.error('Header summary failed:', err);
	}
}


document.addEventListener('DOMContentLoaded', () => {
	setupHeader();
});

export function showToast(message, type = 'info') {
	const container = document.getElementById('toast-container');
	if (!container) return;

	const toast = document.createElement('div');

	const colors = {
		success: 'bg-emerald-600 text-white',
		error: 'bg-red-600 text-white',
		info: 'bg-zinc-800 text-white',
	};

	toast.className = `
        px-4 py-2 rounded-lg shadow-md text-sm animate-fade-in 
        ${colors[type] || colors.info}
    `;
	toast.textContent = message;

	container.appendChild(toast);

	setTimeout(() => {
		toast.classList.add('opacity-0', 'transition');
		setTimeout(() => toast.remove(), 300);
	}, 3500);
}