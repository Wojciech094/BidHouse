import { AUCTION, apiRequest, getUser, ensureApiKey, formatEndsIn ,showApiError } from './auth.js';
import { getHighestBid } from './utils.js';

const grid = document.getElementById('my-bids-grid');
const msgEl = document.getElementById('my-bids-message');

function showMessage(text, type = 'info') {
	if (!msgEl) return;
	msgEl.textContent = text || '';

	msgEl.classList.remove('text-red-600', 'text-zinc-500', 'text-emerald-600');

	if (type === 'error') {
		msgEl.classList.add('text-red-600');
	} else if (type === 'success') {
		msgEl.classList.add('text-emerald-600');
	} else {
		msgEl.classList.add('text-zinc-500');
	}
}

function escapeHtml(str = '') {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function hasEnded(endsAt) {
	if (!endsAt) return false;
	return new Date(endsAt).getTime() <= Date.now();
}

function createBidCard({ listing, myBid, isWin, ended }) {
	const highest = getHighestBid(listing);
	const endsLabel = listing.endsAt ? formatEndsIn(listing.endsAt) : 'No end date';

	let status = 'Outbid';
	let statusClass = 'bg-red-50 text-red-700 border-red-200';

	if (ended) {
		if (isWin) {
			status = 'Won';
			statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
		} else {
			status = 'Lost';
			statusClass = 'bg-zinc-50 text-zinc-700 border-zinc-200';
		}
	} else {
		if (myBid >= highest && highest > 0) {
			status = 'Leading';
			statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
		}
	}

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
			<img src="${imgUrl}" alt="${escapeHtml(listing.title)}" class="object-cover w-full h-full" loading="lazy" />
		</a>

		<div class="flex flex-col flex-1 px-4 py-3">
			<h2 class="mb-1 text-sm font-semibold text-zinc-900 line-clamp-2">
				${escapeHtml(listing.title)}
			</h2>
			<p class="mb-1 text-[11px] text-zinc-500">
				${listing.endsAt ? endsLabel : 'No end date'}
			</p>

			<div class="mt-2 text-[11px] space-y-1">
				<p>Your bid: <span class="font-semibold">${myBid} credits</span></p>
				<p>Current highest: <span class="font-semibold">${highest} credits</span></p>
			</div>

			<div class="mt-3">
				<span class="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${statusClass}">
					${status}
				</span>
			</div>
		</div>
	`;

	return card;
}

function renderBids(summaryList) {
	if (!grid) return;
	grid.innerHTML = '';

	if (!Array.isArray(summaryList) || summaryList.length === 0) {
		showMessage('You have not placed any bids yet.', 'info');
		grid.innerHTML = `
			<p class="col-span-full mt-4 text-sm text-center text-zinc-500">
				You haven't bid on any listings yet.
			</p>
		`;
		return;
	}

	summaryList.forEach(item => {
		grid.appendChild(createBidCard(item));
	});

	showMessage(`You have bids on ${summaryList.length} listing${summaryList.length === 1 ? '' : 's'}.`, 'info');
}

async function loadMyBids() {
	const user = getUser();

	if (!user) {
		showMessage('You must be logged in to view this page.', 'error');
		window.location.href = './login.html';
		return;
	}

	try {
		showMessage('Loading your bids…', 'info');
		await ensureApiKey();

		const bidsUrl = `${AUCTION}/profiles/${encodeURIComponent(
			user.name
		)}/bids?_listings=true&sort=created&sortOrder=desc`;

		const winsUrl = `${AUCTION}/profiles/${encodeURIComponent(user.name)}/wins`;

		const [bidsRes, winsRes] = await Promise.all([
			apiRequest(bidsUrl),
			apiRequest(winsUrl).catch(() => ({ data: [] })),
		]);

		const bids = Array.isArray(bidsRes.data) ? bidsRes.data : [];
		const winsRaw = Array.isArray(winsRes.data) ? winsRes.data : [];

		const winIds = new Set();
		for (const w of winsRaw) {
			const id = (w && w.listing && w.listing.id) || (w && w.id) || null;
			if (id) winIds.add(id);
		}

		const byListing = new Map();

		for (const bid of bids) {
			const listing = bid.listing;
			if (!listing || !listing.id) continue;

			const amount = typeof bid.amount === 'number' ? bid.amount : 0;
			const existing = byListing.get(listing.id);

			if (!existing || amount > existing.myBid) {
				byListing.set(listing.id, {
					listing,
					myBid: amount,
				});
			}
		}

		const baseList = Array.from(byListing.values());

		if (baseList.length === 0) {
			renderBids([]);
			return;
		}

		const detailedResults = await Promise.all(
			baseList.map(item =>
				apiRequest(`${AUCTION}/listings/${encodeURIComponent(item.listing.id)}?_bids=true&_seller=true`).catch(
					() => null
				)
			)
		);

		const summaryList = baseList.map((item, idx) => {
			const res = detailedResults[idx];
			const fullListing = res?.data || item.listing;
			const ended = hasEnded(fullListing.endsAt);
			const isWin = ended && winIds.has(fullListing.id);

			return {
				listing: fullListing,
				myBid: item.myBid,
				isWin,
				ended,
			};
		});

		renderBids(summaryList);
	} catch (error) {
		console.error('My bids error:', error);
		showApiError(document.getElementById('my-bids-grid'));
	}

}

document.addEventListener('DOMContentLoaded', () => {
	loadMyBids();
});
