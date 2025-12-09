import { AUCTION, apiRequest, getUser, ensureApiKey, formatEndsIn, showToast, showApiError } from './auth.js';
import { getListingIdFromUrl, getHighestBid } from './utils.js';

let currentListing = null;
let currentListingId = null;

function showMessage(text, type = 'info') {
	const el = document.getElementById('single-message');
	if (!el) return;

	el.textContent = text || '';

	el.classList.remove('text-red-600', 'text-zinc-500', 'text-emerald-600');

	if (type === 'error') {
		el.classList.add('text-red-600');
	} else if (type === 'success') {
		el.classList.add('text-emerald-600');
	} else {
		el.classList.add('text-zinc-500');
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

function isListingActive(listing) {
	if (!listing || !listing.endsAt) return true;
	return new Date(listing.endsAt).getTime() > Date.now();
}

function renderBids(listing) {
	const listEl = document.getElementById('single-bids');
	if (!listEl) return;

	listEl.innerHTML = '';

	const bids = Array.isArray(listing.bids) ? listing.bids.slice() : [];

	if (!bids.length) {
		listEl.innerHTML = `<li class="text-[12px] text-zinc-500">No bids yet.</li>`;
		return;
	}

	bids.sort((a, b) => {
		if (a.amount === b.amount) {
			return new Date(b.created).getTime() - new Date(a.created).getTime();
		}
		return b.amount - a.amount;
	});

	bids.forEach((bid, index) => {
		const li = document.createElement('li');
		const created = bid.created
			? new Date(bid.created).toLocaleString('en-GB', {
					year: 'numeric',
					month: 'short',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
			  })
			: '';

		const isTop = index === 0;

		
		const bidderName = (bid.bidder && bid.bidder.name) || bid.bidderName || 'Anonymous';

		li.className = 'flex items-center justify-between gap-2';
		li.innerHTML = `
      <span class="text-[12px] ${isTop ? 'font-semibold text-zinc-900' : 'text-zinc-700'}">
        ${escapeHtml(bidderName)}
      </span>
      <span class="text-[12px] ${isTop ? 'font-semibold text-zinc-900' : 'text-zinc-700'}">
        ${bid.amount} credits
      </span>
      <span class="text-[10px] text-zinc-400">
        ${created}
      </span>
    `;

		listEl.appendChild(li);
	});
}


function updatePriceArea(listing) {
	const priceEl = document.getElementById('single-price');
	if (!priceEl) return;

	const highest = getHighestBid(listing);
	const bidsCount = Array.isArray(listing.bids) ? listing.bids.length : 0;

	const bidsText = !bidsCount ? '(no bids yet)' : `(${bidsCount} bid${bidsCount === 1 ? '' : 's'})`;

	priceEl.innerHTML = `
		<span class="inline-flex items-center gap-1">
			<span>${highest}</span>
			<span class="inline-flex items-center gap-1">
				<img src="/credits.svg" class="w-4 h-4 opacity-80" alt="Credits icon" />
				
			</span>
			<span>${bidsText}</span>
		</span>
	`;
}

function setupBidSectionState(listing) {
	const user = getUser();
	const bidSection = document.getElementById('bid-section');
	const bidForm = document.getElementById('bid-form');
	const ownListingNote = document.getElementById('single-own-listing-note');
	const notLoggedMsg = document.getElementById('not-logged-in-message');

	if (!bidSection || !ownListingNote || !notLoggedMsg || !bidForm) return;

	
	bidSection.classList.add('hidden');
	bidForm.classList.add('hidden');
	ownListingNote.classList.add('hidden');
	notLoggedMsg.classList.add('hidden');

	if (!user) {
		bidSection.classList.remove('hidden');   
		notLoggedMsg.textContent = 'Please log in to place a bid.';
		notLoggedMsg.classList.remove('hidden');
		return;
	}


	if (listing.seller?.name === user.name) {
		ownListingNote.classList.remove('hidden');
		return;
	}

	
	if (!isListingActive(listing)) {
		return;
	}

	
	bidSection.classList.remove('hidden');
	bidForm.classList.remove('hidden');
}

function renderListing(listing) {
	const wrapper = document.getElementById('single-wrapper');
	const imgEl = document.getElementById('single-image');
	const titleEl = document.getElementById('single-title');
	const descEl = document.getElementById('single-description');
	const sellerEl = document.getElementById('single-seller');
	const endsEl = document.getElementById('single-ends');
	const badgeEl = document.getElementById('single-badge');

	if (!wrapper) return;

	const media = Array.isArray(listing.media) ? listing.media : [];
	const firstMedia = media[0];
	const imgUrl =
		(typeof firstMedia === 'string' && firstMedia) ||
		(firstMedia && typeof firstMedia === 'object' && firstMedia.url) ||
		'https://placehold.co/800x600?text=No+image';

	if (imgEl) {
		imgEl.src = imgUrl;
		imgEl.alt = listing.title || 'Listing image';
	}

	if (titleEl) {
		titleEl.textContent = listing.title || 'Untitled listing';
	}

	if (descEl) {
		descEl.textContent = listing.description || '';
	}

	if (sellerEl) {
		sellerEl.textContent = listing.seller?.name || 'Unknown seller';
	}

	if (endsEl) {
		if (listing.endsAt) {
			endsEl.textContent = formatEndsIn(listing.endsAt);
		} else {
			endsEl.textContent = 'No end date';
		}
	}

	if (badgeEl) {
		if (isListingActive(listing)) {
			badgeEl.textContent = 'LIVE AUCTION';
			badgeEl.classList.remove('text-zinc-400');
			badgeEl.classList.add('text-amber-600');
		} else {
			badgeEl.textContent = 'AUCTION ENDED';
			badgeEl.classList.remove('text-amber-600');
			badgeEl.classList.add('text-zinc-400');
		}
	}

	updatePriceArea(listing);
	renderBids(listing);
	setupBidSectionState(listing);

	wrapper.classList.remove('hidden');
}

async function loadListing(id) {
	try {
		await ensureApiKey();

		const url = `${AUCTION}/listings/${encodeURIComponent(id)}?_bids=true&_seller=true`;
		const { data } = await apiRequest(url);

		currentListing = data;
		currentListingId = data.id;

		showMessage('', 'info');
		renderListing(data);
	} catch (error) {
		console.error('Single listing error:', error);

		
		showApiError(document.getElementById('single-wrapper'), 'Could not load this listing. Please try again.');
	}
}


async function handleBidSubmit(event) {
	event.preventDefault();

	const amountInput = document.getElementById('bid-amount');
	const successEl = document.getElementById('bid-success');
	const errorEl = document.getElementById('bid-error');

	if (successEl) successEl.classList.add('hidden');
	if (errorEl) errorEl.classList.add('hidden');

	const user = getUser();
	if (!user) {
		showMessage('You must be logged in to place a bid.', 'error');
		window.location.href = './login.html';
		return;
	}

	if (!currentListing || !currentListingId) {
		showMessage('Listing data not loaded yet.', 'error');
		return;
	}

	if (!isListingActive(currentListing)) {
		showMessage('This auction has already ended.', 'error');
		return;
	}

	if (!amountInput) return;

	const value = Number(amountInput.value);
	if (!Number.isFinite(value) || value <= 0) {
		if (errorEl) {
			errorEl.textContent = 'Please enter a valid bid amount.';
			errorEl.classList.remove('hidden');
		}
		return;
	}

	const currentHighest = getHighestBid(currentListing);
	if (value <= currentHighest) {
		if (errorEl) {
			errorEl.textContent = `Your bid must be higher than the current bid (${currentHighest} credits).`;
			errorEl.classList.remove('hidden');
		}
		return;
	}

	try {
		await ensureApiKey();

		const url = `${AUCTION}/listings/${encodeURIComponent(currentListingId)}/bids`;
		await apiRequest(url, {
			method: 'POST',
			body: JSON.stringify({ amount: value }),
		});

		if (amountInput) {
			amountInput.value = '';
		}

		if (successEl) {
			successEl.textContent = 'Bid placed successfully.';
			successEl.classList.remove('hidden');
		}

		showToast('Bid placed successfully.', 'success');

		
		await loadListing(currentListingId);
	} catch (err) {
		console.error('Place bid error:', err);

		if (errorEl) {
			if (err && err.status === 400) {
				errorEl.textContent = err.data?.errors?.[0]?.message || 'Could not place bid.';
			} else if (err && err.message === 'NETWORK_ERROR') {
				errorEl.textContent = 'Network error. Please try again.';
			} else {
				errorEl.textContent = 'Could not place bid.';
			}
			errorEl.classList.remove('hidden');
		}
	}
}

function initSingle() {
	const id = getListingIdFromUrl('id');

	if (!id) {
		showMessage('Missing listing id in the URL.', 'error');
		return;
	}

	currentListingId = id;
	showMessage('Loading listing…', 'info');
	loadListing(id);

	const form = document.getElementById('bid-form');
	if (form) {
		form.addEventListener('submit', handleBidSubmit);
	}
}

document.addEventListener('DOMContentLoaded', initSingle);
