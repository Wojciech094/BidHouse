
import { AUCTION, apiRequest, formatEndsIn, renderCredits } from './homeJs/home-api.js';


function getListingIdFromUrl() {
	const params = new URLSearchParams(window.location.search);
	return params.get('id');
}

function showMessage(text, type = 'info') {
	const el = document.getElementById('single-message');
	if (!el) return;

	el.textContent = text || '';

	el.classList.remove('text-red-500', 'text-zinc-500');
	if (!text) return;

	if (type === 'error') {
		el.classList.add('text-red-500');
	} else {
		el.classList.add('text-zinc-500');
	}
}

function getUser() {
	try {
		return JSON.parse(localStorage.getItem('user'));
	} catch {
		return null;
	}
}


async function fetchListing(id) {
	const url = `${AUCTION}/listings/${encodeURIComponent(id)}?_seller=true&_bids=true`;

	const { data } = await apiRequest(url);
	return data;
}

function getHighestBid(listing) {
	const bids = Array.isArray(listing.bids) ? listing.bids : [];
	if (!bids.length) return listing.price ?? 0;

	const highest = bids.reduce((max, bid) => (bid.amount > max ? bid.amount : max), 0);
	return highest || listing.price || 0;
}

function renderBids(listing) {
	const bidsUl = document.getElementById('single-bids');
	if (!bidsUl) return;

	const bids = Array.isArray(listing.bids) ? listing.bids : [];
	bidsUl.innerHTML = '';

	if (!bids.length) {
		const li = document.createElement('li');
		li.textContent = 'No bids yet.';
		bidsUl.appendChild(li);
		return;
	}

	const user = getUser();
	const isLoggedIn = !!user;

	const sorted = [...bids].sort((a, b) => b.amount - a.amount);

	for (const bid of sorted) {
		const li = document.createElement('li');

		const apiName = bid.bidderName || bid.bidder?.name || null;

		let label;

		if (!isLoggedIn) {
			label = 'Bidder';
		} else if (apiName) {
			if (user && apiName === user.name) {
				label = `${apiName} (you)`;
			} else {
				label = apiName;
			}
		} else {
			label = 'Bidder';
		}

		li.innerHTML = `${label} - ${renderCredits(bid.amount)}`;
		bidsUl.appendChild(li);
	}
}

function renderListing(listing) {
	const wrapper = document.getElementById('single-wrapper');
	if (!wrapper) return;

	const imgEl = document.getElementById('single-image');
	const titleEl = document.getElementById('single-title');
	const descEl = document.getElementById('single-description');
	const sellerEl = document.getElementById('single-seller');
	const endsEl = document.getElementById('single-ends');
	const priceEl = document.getElementById('single-price');
	const badgeEl = document.getElementById('single-badge');

	const imgUrl = listing.media?.[0]?.url ?? 'https://placehold.co/600x400?text=No+image';
	const imgAlt = listing.media?.[0]?.alt ?? listing.title ?? 'Listing image';

	if (imgEl) {
		imgEl.src = imgUrl;
		imgEl.alt = imgAlt;
	}

	if (titleEl) titleEl.textContent = listing.title ?? 'Untitled listing';
	if (descEl) descEl.textContent = listing.description || 'No description provided.';

	if (sellerEl) sellerEl.textContent = listing.seller?.name ?? 'Unknown';

	const endsAtDate = listing.endsAt ? new Date(listing.endsAt) : null;
	const now = new Date();
	const isEnded = endsAtDate ? endsAtDate <= now : false;

	if (endsEl) {
		if (endsAtDate) {
			const dateText = `${endsAtDate.toLocaleDateString('nb-NO')} ${endsAtDate.toLocaleTimeString('nb-NO', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			})}`;
			const rel = formatEndsIn(endsAtDate);
			endsEl.textContent = `${dateText} (${rel})`;
		} else {
			endsEl.textContent = 'Unknown';
		}
	}

	if (badgeEl) {
		badgeEl.textContent = isEnded ? 'ENDED AUCTION' : 'LIVE AUCTION';
		badgeEl.classList.toggle('text-amber-600', !isEnded);
		badgeEl.classList.toggle('text-rose-600', isEnded);
	}

	const highestBid = getHighestBid(listing);
	if (priceEl) priceEl.innerHTML = renderCredits(highestBid);

	renderBids(listing);

	wrapper.classList.remove('hidden');
}

function setupBidForm(listing) {
	const bidSection = document.getElementById('bid-section');
	const form = document.getElementById('bid-form');
	const amountInput = document.getElementById('bid-amount');
	const successEl = document.getElementById('bid-success');
	const errorEl = document.getElementById('bid-error');

	if (!bidSection || !form || !amountInput) return;

	const user = getUser();
	const endsAtDate = listing.endsAt ? new Date(listing.endsAt) : null;
	const now = new Date();
	const isEnded = endsAtDate ? endsAtDate <= now : false;

	if (!user || isEnded || listing.seller?.name === user.name) {
		bidSection.classList.add('hidden');
		return;
	}

	bidSection.classList.remove('hidden');

	form.addEventListener('submit', async event => {
		event.preventDefault();

		const raw = amountInput.value;
		const amount = Number(raw);

		if (!Number.isFinite(amount) || amount <= 0) {
			if (errorEl) {
				errorEl.textContent = 'Please enter a valid amount.';
				errorEl.classList.remove('hidden');
			}
			return;
		}

		if (successEl) successEl.classList.add('hidden');
		if (errorEl) errorEl.classList.add('hidden');
		showMessage('Placing bid...');

		try {
			const url = `${AUCTION}/listings/${encodeURIComponent(listing.id)}/bids`;

			await apiRequest(url, {
				method: 'POST',
				body: JSON.stringify({ amount }),
				requiresAuth: true,
			});

			const updated = await fetchListing(listing.id);
			renderListing(updated);
			setupBidForm(updated);
			amountInput.value = '';

			showMessage('Bid placed successfully.');
			if (successEl) successEl.classList.remove('hidden');
		} catch (error) {
			console.error(error);
			showMessage('Could not place bid.', 'error');
			if (errorEl) {
				errorEl.textContent = 'Could not place bid.';
				errorEl.classList.remove('hidden');
			}
		}
	});
}

async function initSinglePage() {
	const id = getListingIdFromUrl();

	if (!id) {
		showMessage('Missing listing id in URL.', 'error');
		return;
	}

	showMessage('Loading listing...');

	try {
		const listing = await fetchListing(id);
		renderListing(listing);
		setupBidForm(listing);
		showMessage('');
	} catch (error) {
		console.error(error);
		showMessage('Could not load listing.', 'error');
	}
}

document.addEventListener('DOMContentLoaded', initSinglePage);
