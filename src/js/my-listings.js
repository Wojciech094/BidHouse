import { AUCTION, apiRequest, getUser, ensureApiKey, formatEndsIn, showToast, showApiError } from './auth.js';
import { getHighestBid } from './utils.js';

const grid = document.getElementById('my-listings-grid');
const msgEl = document.getElementById('my-listings-message');

function showMessage(text, type = 'info') {
	if (!msgEl) return;
	msgEl.textContent = text || '';
	msgEl.classList.remove('text-red-600', 'text-zinc-500', 'text-emerald-600');
	if (type === 'error') msgEl.classList.add('text-red-600');
	else if (type === 'success') msgEl.classList.add('text-emerald-600');
	else msgEl.classList.add('text-zinc-500');
}

function createListingCard(listing) {
	const card = document.createElement('article');
	card.className = 'relative flex flex-col overflow-hidden bg-white border shadow-sm rounded-2xl border-zinc-200';
	card.dataset.id = listing.id;

	const media = Array.isArray(listing.media) ? listing.media : [];
	const firstMedia = media[0];
	const imgUrl =
		(typeof firstMedia === 'string' && firstMedia) ||
		(firstMedia && typeof firstMedia === 'object' && firstMedia.url) ||
		'https://placehold.co/600x400?text=No+image';
	const imgAlt = (firstMedia && typeof firstMedia === 'object' && firstMedia.alt) || listing.title || 'Listing image';

	const linkHref = `./single.html?id=${encodeURIComponent(listing.id)}`;
	const highestBid = getHighestBid(listing);
	const endsLabel = listing.endsAt ? formatEndsIn(listing.endsAt) : 'No end date';

	const bidsArray = Array.isArray(listing.bids) ? listing.bids : [];
	const bidsCount = bidsArray.length || listing._count?.bids || 0;
	const hasBids = bidsCount > 0;
	card.dataset.hasBids = String(hasBids);

	card.innerHTML = `
    <a href="${linkHref}" class="block relative w-full overflow-hidden">
      <img
        src="${imgUrl}"
        alt="${imgAlt}"
		loading="lazy"
        class="object-cover w-full h-40 transition-transform duration-300 hover:scale-[1.03]"
      />
      <div
        class="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-zinc-800">
        ${bidsCount} bid${bidsCount === 1 ? '' : 's'}
      </div>
    </a>

    <div class="flex flex-col flex-1 p-4 space-y-3">
      <header class="flex flex-col gap-1">
        <h2 class="text-sm font-semibold text-zinc-900 line-clamp-2">
          <a href="${linkHref}" class="hover:text-amber-700">
            ${listing.title ?? 'Untitled listing'}
          </a>
        </h2>
        <p class="text-xs text-zinc-500 line-clamp-2">
          ${listing.description || 'No description available.'}
        </p>
      </header>

      <div class="flex items-center justify-between text-xs text-zinc-600">
        <span class="inline-flex items-center gap-1">
          <span>Current / final price:</span>
          <span class="inline-flex items-center gap-1 font-semibold text-zinc-900">
            <span>${highestBid}</span>
            <img src="/credits.svg" alt="credits" class="w-3 h-3 md:w-4 md:h-4" />
          </span>
        </span>

        <span class="text-[11px] text-zinc-500">
          ${endsLabel}
        </span>
      </div>

      <div class="flex items-center justify-between pt-3 mt-auto border-t border-zinc-100">
        <p class="text-[11px] text-zinc-500">
          ${hasBids ? 'Active listing with bids' : 'No bids yet'}
        </p>

        <div class="flex items-center gap-2">
          <button
            type="button"
            data-edit-btn
            class="px-3 py-1 text-[11px] rounded-full border border-zinc-300 text-zinc-800 hover:border-amber-500 hover:text-amber-700">
            Edit
          </button>
          <button
            type="button"
            data-delete-btn
            class="px-3 py-1 text-[11px] rounded-full border border-red-200 text-red-600 hover:border-red-500 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;

	const editBtn = card.querySelector('[data-edit-btn]');
	const deleteBtn = card.querySelector('[data-delete-btn]');

	if (hasBids) {
		if (editBtn instanceof HTMLButtonElement) {
			editBtn.disabled = true;
			editBtn.classList.add('opacity-50', 'cursor-not-allowed');
			editBtn.title = 'You cannot edit a listing that already has bids.';
		}
		if (deleteBtn instanceof HTMLButtonElement) {
			deleteBtn.disabled = true;
			deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
			deleteBtn.title = 'You cannot delete a listing that already has bids.';
		}
	}

	return card;
}

function renderListings(listings) {
	if (!grid) return;

	grid.innerHTML = '';

	if (!Array.isArray(listings) || listings.length === 0) {
		showMessage('You have no listings yet.', 'info');
		grid.innerHTML = `
			<p class="col-span-full mt-4 text-sm text-center text-zinc-500">
				You haven't created any listings yet.
			</p>
		`;
		return;
	}

	listings.forEach(listing => {
		grid.appendChild(createListingCard(listing));
	});

	showMessage(`You have ${listings.length} listing${listings.length === 1 ? '' : 's'}.`, 'info');
}

async function handleDelete(listingId, card) {
	if (!listingId) return;

	const hasBids = card?.dataset.hasBids === 'true';
	if (hasBids) {
		showToast('You cannot delete a listing that already has bids.', 'error');
		return;
	}

	const confirmDelete = window.confirm('Are you sure you want to delete this listing?');
	if (!confirmDelete) return;

	try {
		await ensureApiKey();

		await apiRequest(`${AUCTION}/listings/${encodeURIComponent(listingId)}`, {
			method: 'DELETE',
		});

		if (card && card.parentElement) {
			card.parentElement.removeChild(card);
		}

		showToast('Listing deleted.', 'success');

		if (grid && !grid.querySelector('[data-id]')) {
			renderListings([]);
		}
	} catch (err) {
		console.error('Delete listing error:', err);
		showToast('Could not delete listing.', 'error');
	}
}

async function loadMyListings() {
	const user = getUser();
	if (!user) {
		showMessage('You must be logged in to view this page.', 'error');
		window.location.href = './login.html';
		return;
	}

	try {
		showMessage('Loading your listings…', 'info');
		await ensureApiKey();

		const url = `${AUCTION}/profiles/${encodeURIComponent(user.name)}/listings?_bids=true&sort=created&sortOrder=desc`;

		const { data } = await apiRequest(url);
		const listings = Array.isArray(data) ? data : [];

		renderListings(listings);
	} catch (error) {
		console.error('My listings error:', error);
		showApiError(document.getElementById('my-listings-grid'));
	}
}

function setupActions() {
	if (!grid) return;

	grid.addEventListener('click', event => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const card = target.closest('[data-id]');
		const listingId = card?.dataset.id;
		if (!listingId) return;

		if (target.matches('[data-edit-btn]')) {
			const hasBids = card?.dataset.hasBids === 'true';
			if (hasBids) {
				showToast('You cannot edit a listing that already has bids.', 'error');
				return;
			}
			window.location.href = `./edit-listing.html?id=${encodeURIComponent(listingId)}`;
			return;
		}

		if (target.matches('[data-delete-btn]')) {
			handleDelete(listingId, card);
			return;
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	loadMyListings();
	setupActions();
});
