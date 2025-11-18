const API_BASE = 'https://v2.api.noroff.dev';
const AUCTION = `${API_BASE}/auction`;



function getUser() {
	try {
		return JSON.parse(localStorage.getItem('user'));
	} catch {
		return null;
	}
}

function getToken() {
	return localStorage.getItem('token');
}

function setupHeader() {
	const user = getUser();
	const token = getToken();

	const out = document.getElementById('auth-logged-out');
	const inn = document.getElementById('auth-logged-in');
	const nameEl = document.getElementById('user-name');
	const avatar = document.getElementById('user-avatar');
	const logoutBtn = document.getElementById('logout-btn');

	if (!out || !inn) return;

	if (user && token) {
		out.classList.add('hidden');
		inn.classList.remove('hidden');

		const name = user.name || 'User';
		if (nameEl) nameEl.textContent = name;

		if (avatar) {
			const initials = name
				.split(' ')
				.map(x => x[0])
				.join('')
				.slice(0, 2)
				.toUpperCase();
			avatar.textContent = initials || 'U';
		}

		if (logoutBtn) {
			logoutBtn.addEventListener('click', () => {
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				window.location.reload();
			});
		}
	} else {
		inn.classList.add('hidden');
		out.classList.remove('hidden');
	}
}

// helpers

function dateShort(date) {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return '—';

	return d
		.toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		})
		.replace(',', '');
}

function mainImage(listing) {
	if (Array.isArray(listing.media) && listing.media[0]?.url) {
		return listing.media[0].url;
	}
	return null;
}

/* URL (DRY)*/

function buildListingsUrl({ limit = 50, sort = 'created', sortOrder = 'desc', seller = true, bids = true } = {}) {
	const url = new URL(`${AUCTION}/listings`);
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('sort', sort);
	url.searchParams.set('sortOrder', sortOrder);
	url.searchParams.set('_seller', String(seller));
	url.searchParams.set('_bids', String(bids));
	return url;
}



function formatDiff(ms) {
	if (ms <= 0) return 'Ended';

	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / (24 * 3600));
	const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m`;
	return '<1m';
}

let countdownInterval = null;

function updateCountdowns() {
	const now = new Date();
	const nodes = document.querySelectorAll('[data-countdown-ends]');

	nodes.forEach(node => {
		const iso = node.getAttribute('data-countdown-ends');
		const end = new Date(iso);
		if (Number.isNaN(end.getTime())) {
			node.textContent = 'Ends -';
			return;
		}

		const diff = end - now;
		if (diff <= 0) {
			node.textContent = 'Ended';
			return;
		}

		node.textContent = `Ends in ${formatDiff(diff)}`;
	});
}

function startCountdowns() {
	if (countdownInterval) clearInterval(countdownInterval);
	updateCountdowns();
	countdownInterval = setInterval(updateCountdowns, 1000);
}


const FEATURED_BATCH_SIZE = 4;
let featuredAll = [];
let featuredShown = 0;

function cardFeatured(l) {
	const img = mainImage(l);
	const bids = l._count?.bids ?? 0;
	const lastBid = Array.isArray(l.bids) && l.bids.length ? l.bids[l.bids.length - 1].amount : null;

	const div = document.createElement('article');
	div.className = 'flex flex-col p-4 bg-white border shadow-sm rounded-2xl border-zinc-200 shadow-zinc-200';

	div.innerHTML = `
    <p class="mb-2 text-[11px] uppercase tracking-[0.2em] text-amber-700">
      LIVE AUCTION
    </p>

    <div class="aspect-2/3 rounded-xl bg-zinc-200 overflow-hidden">
      ${img ? `<img src="${img}" class="w-full h-full object-cover" alt="${l.title ?? 'Auction lot'}" />` : ''}
    </div>

    <h3 class="mt-3 text-sm font-semibold text-zinc-900 line-clamp-2">
      ${l.title}
    </h3>

    <p class="mt-1 text-xs text-zinc-500 line-clamp-2">
      ${l.description ?? ''}
    </p>

    <div class="mt-3 flex justify-between text-xs text-zinc-600">
      <span>${lastBid !== null ? 'Current bid' : 'Bids'}</span>
      <span class="${lastBid ? 'text-amber-700 font-semibold' : ''}">
        ${lastBid ? '$' + lastBid : bids === 1 ? '1 bid' : `${bids} bids`}
      </span>
    </div>

    <div class="mt-1 flex justify-between items-center text-[11px] text-zinc-500">
      <span>${dateShort(l.endsAt)}</span>
      <span
        class="font-semibold text-amber-700"
        data-countdown-ends="${l.endsAt}"
      >
        Ends in …
      </span>
    </div>
  `;

	return div;
}

function updateLoadMoreVisibility() {
	const wrap = document.getElementById('featured-load-more-wrapper');
	if (!wrap) return;
	if (!featuredAll.length || featuredShown >= featuredAll.length) {
		wrap.classList.add('hidden');
	} else {
		wrap.classList.remove('hidden');
	}
}

function renderFeaturedMore({ reset = false } = {}) {
	const container = document.getElementById('featured-grid');
	if (!container) return;

	if (reset) {
		container.innerHTML = '';
		featuredShown = 0;
	}

	if (!featuredAll.length) {
		container.innerHTML = '<p class="col-span-full text-sm text-zinc-400">No listings available.</p>';
		updateLoadMoreVisibility();
		return;
	}

	const nextItems = featuredAll.slice(featuredShown, featuredShown + FEATURED_BATCH_SIZE);

	nextItems.forEach(l => container.appendChild(cardFeatured(l)));
	featuredShown += nextItems.length;

	updateLoadMoreVisibility();
	startCountdowns();
}

async function loadFeatured() {
	const container = document.getElementById('featured-grid');
	if (!container) return;

	container.innerHTML = '<p class="col-span-full text-sm text-zinc-400">Loading featured lots…</p>';

	try {
		
		const url = buildListingsUrl();
		const res = await fetch(url);
		const json = await res.json();

		if (!res.ok) {
			console.error('Featured error:', json);
			container.innerHTML = '<p class="text-red-500 col-span-full">Loading featured lots failed.</p>';
			const wrap = document.getElementById('featured-load-more-wrapper');
			if (wrap) wrap.classList.add('hidden');
			return;
		}

		if (!Array.isArray(json.data)) {
			container.innerHTML = '<p class="text-red-500 col-span-full">Unexpected response shape.</p>';
			const wrap = document.getElementById('featured-load-more-wrapper');
			if (wrap) wrap.classList.add('hidden');
			return;
		}

		featuredAll = json.data;
		renderFeaturedMore({ reset: true });
	} catch (err) {
		console.error(err);
		container.innerHTML = '<p class="text-red-500 col-span-full">Loading featured lots failed.</p>';
		const wrap = document.getElementById('featured-load-more-wrapper');
		if (wrap) wrap.classList.add('hidden');
	}
}



function cardEndingSoon(l) {
	const seller = l._seller?.name ?? 'Auction house';
	const img = mainImage(l);

	const div = document.createElement('article');
	div.className = 'flex flex-col bg-white border shadow-sm rounded-2xl border-zinc-200 shadow-zinc-200';

	div.innerHTML = `
    <div class="p-5 pb-0">
      <div class="flex justify-between items-center">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          ENDING SOON
        </p>
        <p class="text-[11px] text-zinc-500">
          ${dateShort(l.endsAt)}
        </p>
      </div>
    </div>

    <div class="mt-3 px-5">
      <div class="aspect-2/3 rounded-xl bg-zinc-200 overflow-hidden">
        ${img ? `<img src="${img}" class="w-full h-full object-cover" alt="${l.title}" />` : ''}
      </div>
    </div>

    <div class="p-5 pt-3 flex flex-col gap-2">
      <p class="text-sm font-semibold text-zinc-900 line-clamp-2">${l.title}</p>
      <p class="text-xs text-zinc-500">${seller}</p>
      <p class="text-xs text-zinc-500 line-clamp-3">${l.description ?? ''}</p>

      <p
        class="mt-1 text-sm font-semibold text-amber-700"
        data-countdown-ends="${l.endsAt}"
      >
        Ends in …
      </p>
    </div>
  `;

	return div;
}

async function loadEndingSoon({ showLoading = true } = {}) {
	const container = document.getElementById('ending-soon-grid');
	if (!container) return;

	if (showLoading) {
		container.innerHTML = '<p class="col-span-full text-sm text-zinc-400 text-center">Loading auctions...</p>';
	}

	try {
		
		const url = buildListingsUrl();
		const res = await fetch(url);
		const json = await res.json();

		if (!Array.isArray(json.data)) {
			console.error('Ending soon error, unexpected shape:', json);
			container.innerHTML = '<p class="text-red-500 col-span-full text-center">Could not load auctions.</p>';
			return;
		}

		const now = new Date();

		const candidates = json.data
			.map(l => ({ raw: l, ends: new Date(l.endsAt) }))
			.filter(item => {
				const { raw, ends } = item;
				if (!raw.title) return false;
				if (Number.isNaN(ends.getTime())) return false;
				return ends > now;
			});

		candidates.sort((a, b) => a.ends - b.ends);

		
		const items = candidates.slice(0, 4).map(item => item.raw);

		if (!items.length) {
			container.innerHTML = '<p class="col-span-full text-sm text-zinc-400 text-center">No auctions ending soon.</p>';
			return;
		}

		container.innerHTML = '';
		items.forEach(l => container.appendChild(cardEndingSoon(l)));

		startCountdowns();
	} catch (err) {
		console.error(err);
		container.innerHTML = '<p class="text-red-500 col-span-full text-center">Could not load auctions.</p>';
	}
}



document.addEventListener('DOMContentLoaded', () => {
	setupHeader();

	const loadMoreBtn = document.getElementById('featured-load-more');
	if (loadMoreBtn) {
		loadMoreBtn.addEventListener('click', () => {
			renderFeaturedMore({ reset: false });
		});
	}

	loadFeatured();
	loadEndingSoon();

	setInterval(() => {
		loadEndingSoon({ showLoading: false });
	}, 30000);
});
