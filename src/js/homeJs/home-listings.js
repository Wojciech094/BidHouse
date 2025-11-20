import { AUCTION, apiRequest, formatEndsIn, renderCredits } from './home-api.js';
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const tagFilter = document.getElementById('tag-filter');
const activeOnlyCheckbox = document.getElementById('active-only');
const sortSelect = document.getElementById('sort-by');

const featuredGrid = document.getElementById('featured-grid');
const featuredLoadMoreBtn = document.getElementById('featured-load-more');

const endingSoonGrid = document.getElementById('ending-soon-grid');

const featuredState = {
	page: 1,
	lastPage: null,
	query: '',
	tag: '',
	activeOnly: true,
	sortField: 'created', 
	sortOrder: 'desc',
	
	priceSort: null,
};

function applySortFromUi() {
	const value = sortSelect?.value || 'newest';

	switch (value) {
		case 'oldest':
			featuredState.sortField = 'created';
			featuredState.sortOrder = 'asc';
			featuredState.priceSort = null;
			break;

		case 'endingSoon':
			featuredState.sortField = 'endsAt';
			featuredState.sortOrder = 'asc';
			featuredState.priceSort = null;
			break;

		case 'endingLast':
			featuredState.sortField = 'endsAt';
			featuredState.sortOrder = 'desc';
			featuredState.priceSort = null;
			break;

		case 'priceHigh': 
			featuredState.sortField = 'created';
			featuredState.sortOrder = 'desc';
			featuredState.priceSort = 'desc';
			break;

		case 'priceLow':
			featuredState.sortField = 'created';
			featuredState.sortOrder = 'desc';
			featuredState.priceSort = 'asc';
			break;

		case 'newest':
		default:
			featuredState.sortField = 'created';
			featuredState.sortOrder = 'desc';
			featuredState.priceSort = null;
			break;
	}
}

function getHighestBidAmount(listing) {
	if (Array.isArray(listing.bids) && listing.bids.length > 0) {
		const last = listing.bids[listing.bids.length - 1];
		const amount = Number(last?.amount);
		return Number.isFinite(amount) ? amount : 0;
	}
	return 0;
}

function applyClientSidePriceSort(listings) {
	if (!featuredState.priceSort) return listings;
	if (!Array.isArray(listings) || listings.length === 0) return listings;

	const sorted = [...listings];

	sorted.sort((a, b) => {
		const aBid = getHighestBidAmount(a);
		const bBid = getHighestBidAmount(b);

		if (featuredState.priceSort === 'asc') {
			return aBid - bBid;
		} else {
			return bBid - aBid;
		}
	});

	return sorted;
}

async function fetchFeaturedListings({
	page = 1,
	query = '',
	tag = '',
	activeOnly = true,
	sortField = 'created',
	sortOrder = 'desc',
} = {}) {
	const base = query && query.trim().length > 0 ? `${AUCTION}/listings/search` : `${AUCTION}/listings`;

	const params = new URLSearchParams();

	params.set('page', page);
	params.set('limit', 20);
	params.set('sort', sortField);
	params.set('sortOrder', sortOrder);
	params.set('_seller', 'true');
	params.set('_bids', 'true');

	if (query) params.set('q', query);
	if (tag) params.set('_tag', tag);
	if (activeOnly) params.set('_active', 'true');

	const url = `${base}?${params.toString()}`;

	return apiRequest(url);
}

function createFeaturedCard(listing) {
	const imgUrl = listing.media?.[0]?.url ?? 'https://placehold.co/600x400?text=No+image';
	const imgAlt = listing.media?.[0]?.alt ?? listing.title ?? 'Listing image';

	const title = listing.title ?? 'Untitled';
	const description = listing.description ?? '';

	const bidsCount = listing._count?.bids ?? 0;
	const highestBid =
		Array.isArray(listing.bids) && listing.bids.length > 0 ? listing.bids[listing.bids.length - 1].amount : null;

	const endsAtDate = listing.endsAt ? new Date(listing.endsAt) : null;
	const now = new Date();
	const isEnded = endsAtDate ? endsAtDate <= now : false;
	const endsInText = endsAtDate ? formatEndsIn(endsAtDate) : 'Unknown';

	const card = document.createElement('article');
	card.className = 'flex flex-col overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-sm';

	card.innerHTML = `
    <div class="px-5 pt-4">
      <p class="text-[10px] font-semibold tracking-[0.26em] text-amber-600 uppercase">
        ${isEnded ? 'ENDED AUCTION' : 'LIVE AUCTION'}
      </p>
    </div>

    <div class="px-5 pt-2">
      <div class="overflow-hidden rounded-3xl">
        <img
          src="${imgUrl}"
          alt="${imgAlt}"
          class="h-64 w-full object-cover"
        />
      </div>
    </div>

    <div class="flex flex-col flex-1 px-5 pt-4 pb-4 text-xs text-zinc-700">
      <h3 class="text-sm font-semibold text-zinc-900">
        ${title}
      </h3>

      <p class="mt-1 text-[11px] text-zinc-600 line-clamp-2">
        ${description || 'No description provided.'}
      </p>

      <div class="mt-4 flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            ${highestBid !== null ? 'Current bid' : 'Bids'}
          </p>
          <p class="mt-0.5 text-[11px] text-zinc-800">
            ${highestBid !== null ? renderCredits(highestBid) : `${bidsCount} ${bidsCount === 1 ? 'bid' : 'bids'}`}
          </p>
        </div>

        <div class="text-right">
          <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            ${isEnded ? 'Status' : 'Ends in'}
          </p>
          <p class="mt-0.5 text-[11px] font-medium ${isEnded ? 'text-rose-600' : 'text-amber-600'}">
            ${isEnded ? 'Ended' : endsInText}
          </p>
        </div>
      </div>

    ${
			endsAtDate
				? `<p class="mt-2 text-[10px] text-zinc-400">
         ${endsAtDate.toLocaleDateString('nb-NO')} ${endsAtDate.toLocaleTimeString('nb-NO', {
						hour: '2-digit',
						minute: '2-digit',
						hour12: false,
				  })}
       </p>`
				: ''
		}

      <div class="mt-4 flex items-center justify-between gap-3">
        <form
          class="flex items-center gap-2"
          data-bid-form
          data-listing-id="${listing.id}"
        >
          <input
            type="number"
            name="bid-amount"
            min="1"
            step="1"
            required
            class="w-20 rounded-full border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
            placeholder="Bid"
          />
          <button
            type="submit"
            class="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
          >
            Bid
          </button>
        </form>

        <a
          href="/listing.html?id=${listing.id}"
          class="inline-flex items-center rounded-full border border-zinc-300 px-4 py-1.5 text-[11px] font-medium text-zinc-800 hover:border-amber-500 hover:text-amber-700"
        >
          View details
        </a>
      </div>

      <p class="mt-2 text-[10px] text-emerald-600 hidden" data-bid-success>
        Bid placed successfully.
      </p>
      <p class="mt-2 text-[10px] text-red-600 hidden" data-bid-error>
        Could not place bid.
      </p>
    </div>
  `;

	return card;
}

function renderFeatured(listings, { append = false } = {}) {
	if (!featuredGrid) return;

	if (!append) {
		featuredGrid.innerHTML = '';
	}

	if (!Array.isArray(listings) || listings.length === 0) {
		if (!append) {
			featuredGrid.innerHTML = '<p class="col-span-full text-xs text-center text-zinc-400">No listings found.</p>';
		}
		return;
	}

	const fragment = document.createDocumentFragment();

	listings.forEach(listing => {
		fragment.appendChild(createFeaturedCard(listing));
	});

	featuredGrid.appendChild(fragment);
}

function updateFeaturedLoadMore(meta) {
	if (!featuredLoadMoreBtn) return;

	if (!meta?.nextPage) {
		featuredLoadMoreBtn.classList.add('hidden');
	} else {
		featuredLoadMoreBtn.classList.remove('hidden');
	}

	featuredState.lastPage = meta?.pageCount ?? null;
}

export async function loadFeaturedFirstPage() {
	featuredState.page = 1;

	if (featuredGrid) {
		featuredGrid.innerHTML = '<p class="col-span-full text-xs text-center text-zinc-400">Loading listings…</p>';
	}

	try {
		let { data, meta } = await fetchFeaturedListings({
			page: featuredState.page,
			query: featuredState.query,
			tag: featuredState.tag,
			activeOnly: featuredState.activeOnly,
			sortField: featuredState.sortField,
			sortOrder: featuredState.sortOrder,
		});

		
		data = applyClientSidePriceSort(data);

		renderFeatured(data, { append: false });
		updateFeaturedLoadMore(meta);
	} catch (error) {
		console.error(error);
		if (featuredGrid) {
			featuredGrid.innerHTML = '<p class="col-span-full text-xs text-center text-red-500">Could not load listings.</p>';
		}
	}
}

export async function loadFeaturedNextPage() {
	if (featuredState.lastPage && featuredState.page >= featuredState.lastPage) return;

	const nextPage = featuredState.page + 1;

	try {
		let { data, meta } = await fetchFeaturedListings({
			page: nextPage,
			query: featuredState.query,
			tag: featuredState.tag,
			activeOnly: featuredState.activeOnly,
			sortField: featuredState.sortField,
			sortOrder: featuredState.sortOrder,
		});

		data = applyClientSidePriceSort(data);

		featuredState.page = nextPage;
		renderFeatured(data, { append: true });
		updateFeaturedLoadMore(meta);
	} catch (error) {
		console.error(error);
	}
}

export async function loadEndingSoon() {
	if (!endingSoonGrid) return;

	endingSoonGrid.innerHTML = '<p class="text-sm text-center col-span-full text-zinc-400">Loading auctions...</p>';

	try {
		const params = new URLSearchParams();
		params.set('page', 1);
		params.set('limit', 4);
		params.set('_active', 'true');
		params.set('sort', 'endsAt');
		params.set('sortOrder', 'asc');
		params.set('_bids', 'true');
		params.set('_seller', 'true');

		const url = `${AUCTION}/listings?${params.toString()}`;
		const { data } = await apiRequest(url);

		if (!Array.isArray(data) || data.length === 0) {
			endingSoonGrid.innerHTML = '<p class="text-sm text-center col-span-full text-zinc-400">No auctions found.</p>';
			return;
		}

		const fragment = document.createDocumentFragment();

		data.forEach(listing => {
			const card = createFeaturedCard(listing);
			fragment.appendChild(card);
		});

		endingSoonGrid.innerHTML = '';
		endingSoonGrid.appendChild(fragment);
	} catch (error) {
		console.error(error);
		endingSoonGrid.innerHTML = '<p class="text-sm text-center col-span-full text-red-500">Could not load auctions.</p>';
	}
}

export function initSearchAndFeatured() {
	if (!featuredGrid) return;

	
	featuredState.query = (searchInput?.value ?? '').trim();
	featuredState.tag = tagFilter?.value ?? '';
	featuredState.activeOnly = activeOnlyCheckbox?.checked ?? true;
	applySortFromUi();

	if (searchForm) {
		searchForm.addEventListener('submit', event => {
			event.preventDefault();

			featuredState.query = (searchInput?.value ?? '').trim();
			featuredState.tag = tagFilter?.value ?? '';
			featuredState.activeOnly = activeOnlyCheckbox?.checked ?? true;
			applySortFromUi();

			loadFeaturedFirstPage();
		});
	}

	if (sortSelect) {
		sortSelect.addEventListener('change', () => {
			applySortFromUi();
			loadFeaturedFirstPage();
		});
	}

	if (featuredLoadMoreBtn) {
		featuredLoadMoreBtn.addEventListener('click', () => {
			loadFeaturedNextPage();
		});
	}


	loadFeaturedFirstPage();
}
