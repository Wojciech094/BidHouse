import { AUCTION, apiRequest, formatEndsIn } from './auth.js';


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
			if (apiName === user.name) {
				label = `${apiName} (you)`;
			} else {
				label = apiName;
			}
		} else {
			label = 'Bidder';
		}

		li.innerHTML = `
			<span class="flex items-center gap-1">
				${label} -
				<span class="flex items-center gap-1 font-medium">
					${bid.amount}
					<img src="/credits.svg" alt="credits" class="w-3 h-3" />
				</span>
			</span>
		`;

		bidsUl.appendChild(li);
	}
}



function renderListing(listing) {
	const wrapper = document.getElementById('single-wrapper');
	if (!wrapper) return;

	
	wrapper.classList.remove('hidden');

	const imgEl = document.getElementById('single-image');
	const titleEl = document.getElementById('single-title');
	const descEl = document.getElementById('single-description');
	const sellerEl = document.getElementById('single-seller');
	const endsEl = document.getElementById('single-ends');
	const priceEl = document.getElementById('single-price');
	const badgeEl = document.getElementById('single-badge');

	const imgUrl = listing.media?.[0]?.url ?? 'https://placehold.co/600x400?text=No+image';
	const imgAlt = listing.media?.[0]?.alt ?? listing.title ?? 'Listing';

	if (imgEl) {
		imgEl.src = imgUrl;
		imgEl.alt = imgAlt;
	}

	if (titleEl) titleEl.textContent = listing.title ?? 'Untitled listing';
	if (descEl) descEl.textContent = listing.description || 'No description provided.';
	if (sellerEl) sellerEl.textContent = listing.seller?.name || 'Unknown seller';

	if (badgeEl) {
		const bidsCount = listing._count?.bids ?? 0;
		badgeEl.textContent = bidsCount > 0 ? `${bidsCount} bids` : 'No bids yet';
	}

	const highestBid = getHighestBid(listing);
	if (priceEl) {
		priceEl.innerHTML = `
			<span class="flex items-center gap-1">
				${highestBid}
				<img src="/credits.svg" alt="credits" class="w-4 h-4" />
			</span>
		`;
	}

	if (endsEl) {
		if (listing.endsAt) {
			endsEl.textContent = formatEndsIn(listing.endsAt);
		} else {
			endsEl.textContent = 'No end date';
		}
	}

	renderBids(listing);

	const user = getUser();
	const bidSection = document.getElementById('bid-section');

	if (user) {
		bidSection.classList.remove('hidden');
	}
}


async function handleBidSubmit(event) {
	event.preventDefault();

	const form = event.target;
	const amountInput = document.getElementById('bid-amount');
	const successEl = document.getElementById('bid-success');
	const errorEl = document.getElementById('bid-error');

	if (!amountInput) return;

	const rawAmount = amountInput.value;
	const amount = Number(rawAmount);

	if (!Number.isFinite(amount) || amount <= 0) {
		errorEl.textContent = 'Enter a valid amount.';
		errorEl.classList.remove('hidden');
		return;
	}

	const token = localStorage.getItem('token');
	if (!token) {
		errorEl.textContent = 'You must be logged in to place a bid.';
		errorEl.classList.remove('hidden');
		return;
	}

	const listingId = getListingIdFromUrl();
	if (!listingId) return;

	successEl.classList.add('hidden');
	errorEl.classList.add('hidden');

	const submitBtn = form.querySelector('button[type="submit"]');
	if (submitBtn) {
		submitBtn.disabled = true;
		submitBtn.textContent = 'Bidding...';
	}

	try {
		const url = `${AUCTION}/listings/${encodeURIComponent(listingId)}/bids`;

		await apiRequest(url, {
			method: 'POST',
			body: JSON.stringify({ amount }),
		});

		amountInput.value = '';

		successEl.textContent = 'Bid placed successfully.';
		successEl.classList.remove('hidden');

		
		const updated = await fetchListing(listingId);
		renderListing(updated);
	} catch (err) {
		errorEl.textContent = 'Could not place bid.';
		errorEl.classList.remove('hidden');
	} finally {
		if (submitBtn) {
			submitBtn.disabled = false;
			submitBtn.textContent = 'Place bid';
		}
	}
}


async function initSingle() {
	const id = getListingIdFromUrl();
	if (!id) {
		showMessage('Missing listing id.', 'error');
		return;
	}

	showMessage('Loading listing...');

	try {
		const listing = await fetchListing(id);
		renderListing(listing);
		showMessage('');
	} catch (err) {
		console.error(err);
		showMessage('Could not load listing.', 'error');
	}

	const form = document.getElementById('bid-form');
	if (form) {
		form.addEventListener('submit', handleBidSubmit);
	}
}

document.addEventListener('DOMContentLoaded', initSingle);
