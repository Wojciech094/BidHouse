import { AUCTION, apiRequest, getUser, ensureApiKey, showApiError } from './auth.js';

import { getHighestBid } from './utils.js';

const grid = document.getElementById('wins-grid');
const msgEl = document.getElementById('wins-message');
const LAST_SEEN_WINS_KEY = 'lastSeenWinsCount';

function showMessage(text, type = 'info') {
	if (!msgEl) return;
	msgEl.textContent = text || '';
	msgEl.classList.remove('text-red-600', 'text-zinc-500', 'text-emerald-600');
	if (type === 'error') msgEl.classList.add('text-red-600');
	else if (type === 'success') msgEl.classList.add('text-emerald-600');
	else msgEl.classList.add('text-zinc-500');
}

function escapeHtml(str = '') {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function updateWinsNotification(count) {
	
	localStorage.setItem(LAST_SEEN_WINS_KEY, String(count));

	const badge = document.getElementById('notif-badge');
	if (badge) {
		badge.textContent = '0';
		badge.classList.add('hidden');
	}
}

function createWinCard(listing) {
	const highest = getHighestBid(listing);

	const closedAt = listing.endsAt
		? new Date(listing.endsAt).toLocaleString('en-GB', {
				year: 'numeric',
				month: 'short',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
		  })
		: 'Unknown';

	const media = Array.isArray(listing.media) ? listing.media : [];
	const firstMedia = media[0];
	const imgUrl =
		(typeof firstMedia === 'string' && firstMedia) ||
		(firstMedia && typeof firstMedia === 'object' && firstMedia.url) ||
		'https://placehold.co/600x400?text=No+image';

	const card = document.createElement('article');
	card.className =
		'flex flex-col overflow-hidden text-xs bg-white border shadow-sm rounded-2xl border-zinc-200 text-zinc-700';

	card.innerHTML = `
		<a href="./single.html?id=${encodeURIComponent(listing.id)}" class="block aspect-4/3 bg-zinc-100 overflow-hidden">
			<img src="${imgUrl}" alt="${escapeHtml(listing.title)}" loading="lazy" class="object-cover w-full h-full" />
		</a>

		<div class="flex flex-col flex-1 px-4 py-3">
			<h2 class="mb-1 text-sm font-semibold text-zinc-900 line-clamp-2">
				${escapeHtml(listing.title)}
			</h2>

			<p class="mb-2 text-[11px] text-zinc-500">
				Closed: ${closedAt}
			</p>

			<div class="inline-flex items-center gap-2 px-3 py-2 border rounded-xl bg-zinc-50 border-zinc-200 w-fit">
				<span class="text-[11px] text-zinc-600">Final price</span>
				<span class="text-sm font-semibold text-zinc-900">${highest}</span>
				<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full">
					<img src="/credits.svg" class="w-4 h-4 opacity-80" alt="Credits icon" />
				</span>
			</div>

			<div class="mt-3">
				<span class="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
					Win
				</span>
			</div>
		</div>
	`;

	return card;
}

function renderWins(listings) {
	if (!grid) return;
	grid.innerHTML = '';

	if (!Array.isArray(listings) || listings.length === 0) {
		showMessage("You haven't won any auctions yet.", 'info');
		grid.innerHTML = `
			<p class="col-span-full mt-4 text-sm text-center text-zinc-500">
				You haven't won any auctions yet.
			</p>
		`;
		return;
	}

	listings.forEach(listing => grid.appendChild(createWinCard(listing)));
	showMessage(`You have ${listings.length} win${listings.length === 1 ? '' : 's'}.`, 'info');
}

async function fetchListingWithBids(id) {
	try {
		const { data } = await apiRequest(`${AUCTION}/listings/${encodeURIComponent(id)}?_bids=true&_seller=true`);
		return data;
	} catch (e) {
		console.error('fetchListingWithBids failed for', id, e);
		return null;
	}
}

async function loadWins() {
	const user = getUser();
	if (!user) {
		showMessage('You must be logged in to view this page.', 'error');
		window.location.href = './login.html';
		return;
	}

	try {
		showMessage('Loading your wins…', 'info');
		await ensureApiKey();

		const url = `${AUCTION}/profiles/${encodeURIComponent(user.name)}/wins?_listings=true`;
		const { data } = await apiRequest(url);

		const winsRaw = Array.isArray(data) ? data : [];

		const baseListings = winsRaw
			.map(item => (item && item.listing ? item.listing : item))
			.filter(listing => listing && listing.id);

		const fullListings = await Promise.all(baseListings.map(l => fetchListingWithBids(l.id)));

		const listings = fullListings.filter(Boolean);

		renderWins(listings);
		updateWinsNotification(listings.length);

		console.log(
			'winsRaw length:',
			winsRaw.length,
			'baseListings:',
			baseListings.length,
			'fullListings:',
			listings.length
		);
	} catch (error) {
		console.error('My wins error:', error);
		showApiError(document.getElementById('my-wins-grid'));
	}
}

document.addEventListener('DOMContentLoaded', loadWins);
