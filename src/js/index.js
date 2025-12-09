import { showApiError } from './auth.js';

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

function getApiKey() {
	return localStorage.getItem('apiKey');
}

async function apiRequest(path, options = {}) {
	const token = getToken();
	const apiKey = getApiKey();

	const headers = {
		'Content-Type': 'application/json',
		...(options.headers || {}),
	};

	if (token) headers['Authorization'] = `Bearer ${token}`;
	if (apiKey) headers['X-Noroff-API-Key'] = apiKey;

	const res = await fetch(path, {
		...options,
		headers,
	});

	if (res.status === 401) {
		console.warn('Unauthorized (401), clearing auth and redirecting to login…');
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		localStorage.removeItem('apiKey');
		window.location.href = './login.html';
		throw new Error('Unauthorized');
	}

	if (!res.ok) {
		let data = null;

		try {
			data = await res.json();
		} catch {
			data = null;
		}

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

	return res.json();
}

function initMobileNav() {
	const toggle = document.getElementById('mobile-menu-toggle');
	const menu = document.getElementById('mobile-menu');

	if (!toggle || !menu) return;

	const openIcon = toggle.querySelector('[data-icon="open"]');
	const closeIcon = toggle.querySelector('[data-icon="close"]');

	function setState(isOpen) {
		if (isOpen) {
			menu.classList.remove('hidden');
			toggle.setAttribute('aria-expanded', 'true');
			if (openIcon) openIcon.classList.add('hidden');
			if (closeIcon) closeIcon.classList.remove('hidden');
		} else {
			menu.classList.add('hidden');
			toggle.setAttribute('aria-expanded', 'false');
			if (openIcon) openIcon.classList.remove('hidden');
			if (closeIcon) closeIcon.classList.add('hidden');
		}
	}

	toggle.addEventListener('click', () => {
		const isCurrentlyOpen = !menu.classList.contains('hidden');
		setState(!isCurrentlyOpen);
	});

	window.addEventListener('resize', () => {
		if (window.innerWidth >= 768) {
			setState(false);
		}
	});
}

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const tagFilter = document.getElementById('tag-filter');
const activeOnlyCheckbox = document.getElementById('active-only');
const sortSelect = document.getElementById('sort-select');

const featuredGrid = document.getElementById('featured-grid');
const featuredLoadMoreBtn = document.getElementById('featured-load-more');

const endingSoonGrid = document.getElementById('ending-soon-grid');

const featuredState = {
	page: 1,
	lastPage: null,
	query: '',
	tag: '',
	activeOnly: true,
	sortChoice: 'newest',
};

function formatEndsIn(endsAt) {
	if (!endsAt) return 'Unknown';

	const now = new Date();
	const diffMs = endsAt.getTime() - now.getTime();

	if (diffMs <= 0) return 'Ended';

	const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;

	if (days > 0) return `${days}d ${hours}h`;
	return `${totalHours}h`;
}

function getHighestBid(listing) {
	const bids = Array.isArray(listing.bids) ? listing.bids : [];
	if (!bids.length) return listing.price ?? 0;

	const highest = bids.reduce((max, bid) => (typeof bid.amount === 'number' && bid.amount > max ? bid.amount : max), 0);

	return highest || listing.price || 0;
}

function mapSort(value) {
	switch (value) {
		case 'newest':
			return { mode: 'server', sort: 'created', sortOrder: 'desc' };
		case 'oldest':
			return { mode: 'server', sort: 'created', sortOrder: 'asc' };
		case 'endingSoon':
			return { mode: 'server', sort: 'endsAt', sortOrder: 'asc' };
		case 'endingLast':
			return { mode: 'server', sort: 'endsAt', sortOrder: 'desc' };

		case 'priceHigh':
			return { mode: 'priceHigh' };
		case 'priceLow':
			return { mode: 'priceLow' };

		default:
			return { mode: 'server', sort: 'created', sortOrder: 'desc' };
	}
}

function createFeaturedCard(listing) {
	const li = document.createElement('article');
	li.className = 'relative flex flex-col overflow-hidden bg-white border shadow-sm rounded-3xl border-zinc-200';
	li.dataset.card = 'listing';
	li.dataset.sellerName = listing.seller?.name || '';

	let rawImage =
		(listing.media && listing.media[0] && (listing.media[0].url || listing.media[0].src)) ||
		'https://placehold.co/800x600?text=No+image';

	let imgUrl = rawImage.includes('res.cloudinary.com')
		? rawImage.replace('/upload/', '/upload/f_auto,q_auto,w_300,h_300,c_fill/')
		: rawImage;

	const imgAlt = (listing.media && listing.media[0] && listing.media[0].alt) || listing.title || 'Listing image';

	const linkHref = `./single.html?id=${encodeURIComponent(listing.id)}`;
	const endsLabel = listing.endsAt ? formatEndsIn(new Date(listing.endsAt)) : 'No end date';
	const bidsCount = Array.isArray(listing.bids) ? listing.bids.length : listing._count?.bids ?? 0;
	const highest = getHighestBid(listing);

	li.innerHTML = `
   <a href="${linkHref}" class="block overflow-hidden rounded-t-3xl bg-zinc-50 aspect-4/3">
    <img
      src="${imgUrl}"
      alt="${imgAlt}"
      class="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
    />
  </a>


    <span
      class="absolute left-6 top-4 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm"
    >
      Featured
    </span>

    <span
      class="absolute right-6 top-4 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-medium text-white"
    >
      <span>${endsLabel}</span>
    </span>

    <div class="flex flex-col flex-1 px-4 py-3">
      <p class="mb-1 text-[11px] text-zinc-500">
        ${listing.seller?.name ? listing.seller.name : 'Unknown seller'}
      </p>

      <h2 class="text-sm font-semibold text-zinc-900 line-clamp-2">
        ${listing.title || 'Untitled listing'}
      </h2>

      <div class="mt-2 flex items-center justify-between text-[11px] text-zinc-700">
        <span class="flex items-center gap-1">
          <span>Current bid:</span>
          <span class="font-semibold">${highest}</span>
          <img src="/credits.svg" alt="Credits icon" class="w-4 h-4 opacity-80" />
        </span>

        <span class="text-[11px] text-zinc-500">
          Bids: ${bidsCount}
        </span>
      </div>

      <form
        data-bid-form
        data-listing-id="${listing.id}"
        class="mt-2 flex items-center gap-2"
      >
        <input
          type="number"
          name="bid-amount"
          min="1"
          step="1"
          class="w-24 rounded-full border border-zinc-300 px-3 py-1 text-[11px] text-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
          placeholder="Bid"
          required
        />
        <button
          type="submit"
          class="flex-1 rounded-full bg-[#4A3325] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3c281d] focus:outline-none focus:ring-2 focus:ring-[#4A3325]/50"
        >
          Place a bid
        </button>
      </form>

      <div class="mt-1 text-[11px] text-right">
        <p data-bid-success class="hidden text-emerald-600"></p>
        <p data-bid-error class="hidden text-red-600"></p>
      </div>

      <div class="mt-3">
        <a
          href="${linkHref}"
          class="inline-flex w-full items-center justify-center rounded-full border border-zinc-300 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:border-amber-500 hover:text-amber-700"
        >
          View listing
          <span class="ml-1 text-[13px] leading-none">→</span>
        </a>
      </div>
    </div>
  `;

	return li;
}

async function fetchFeaturedListings({ page, query, tag, activeOnly, sortChoice }) {
	const params = new URLSearchParams();

	params.set('page', page);
	params.set('limit', 8);
	params.set('_seller', 'true');
	params.set('_bids', 'true');

	if (tag) params.set('_tag', tag);
	if (activeOnly) params.set('_active', 'true');

	const sortConfig = mapSort(sortChoice || 'newest');

	if (sortConfig.mode === 'server') {
		params.set('sort', sortConfig.sort);
		params.set('sortOrder', sortConfig.sortOrder);
	}

	let baseUrl;
	if (query && query.trim() !== '') {
		params.set('q', query.trim());
		baseUrl = `${AUCTION}/listings/search`;
	} else {
		baseUrl = `${AUCTION}/listings`;
	}

	const url = `${baseUrl}?${params.toString()}`;

	const { data, meta } = await apiRequest(url);
	let sortedData = Array.isArray(data) ? [...data] : [];

	if (sortConfig.mode === 'priceHigh') {
		sortedData.sort((a, b) => getHighestBid(b) - getHighestBid(a));
	} else if (sortConfig.mode === 'priceLow') {
		sortedData.sort((a, b) => getHighestBid(a) - getHighestBid(b));
	}

	return { data: sortedData, meta };
}

function renderFeatured(listings, { append = false } = {}) {
	if (!featuredGrid) return;

	if (!append) {
		featuredGrid.innerHTML = '<p class="col-span-full text-xs text-center text-zinc-400">Loading listings…</p>';
	}

	if (!Array.isArray(listings) || listings.length === 0) {
		if (!append) {
			featuredGrid.innerHTML = '<p class="col-span-full text-xs text-center text-zinc-400">No listings found.</p>';
		}
		return;
	}

	const fragment = document.createDocumentFragment();
	listings.forEach(listing => {
		const card = createFeaturedCard(listing);
		fragment.appendChild(card);
	});

	if (!append) {
		featuredGrid.innerHTML = '';
	}
	featuredGrid.appendChild(fragment);
}

function updateFeaturedLoadMore(meta) {
	if (!featuredLoadMoreBtn) return;

	if (!meta || meta.page === meta.pageCount || meta.pageCount === 0) {
		featuredLoadMoreBtn.classList.add('hidden');
		featuredState.lastPage = meta?.pageCount ?? null;
	} else {
		featuredLoadMoreBtn.classList.remove('hidden');
		featuredState.lastPage = meta.pageCount;
	}
}

async function loadFeaturedFirstPage() {
	featuredState.page = 1;

	if (featuredGrid) {
		featuredGrid.innerHTML = '<p class="col-span-full text-xs text-center text-zinc-400">Loading listings…</p>';
	}

	try {
		const { data, meta } = await fetchFeaturedListings({
			page: featuredState.page,
			query: featuredState.query,
			tag: featuredState.tag,
			activeOnly: featuredState.activeOnly,
			sortChoice: featuredState.sortChoice,
		});

		renderFeatured(data, { append: false });
		updateFeaturedLoadMore(meta);
	} catch (error) {
		console.error(error);
		if (featuredGrid) {
			showApiError(featuredGrid, 'Could not load listings. Please try again.');
		}
	}
}

async function loadFeaturedNextPage() {
	if (featuredState.lastPage && featuredState.page >= featuredState.lastPage) return;

	const nextPage = featuredState.page + 1;

	try {
		const { data, meta } = await fetchFeaturedListings({
			page: nextPage,
			query: featuredState.query,
			tag: featuredState.tag,
			activeOnly: featuredState.activeOnly,
			sortChoice: featuredState.sortChoice,
		});

		featuredState.page = nextPage;
		renderFeatured(data, { append: true });
		updateFeaturedLoadMore(meta);
	} catch (error) {
		console.error(error);
	}
}

async function loadEndingSoon() {
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

			
			const badgeEl = card.querySelector('span.absolute.left-6.top-4');
			if (badgeEl) {
				badgeEl.textContent = 'Soon to end';
				badgeEl.className =
					'absolute left-6 top-4 inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-[10px] font-semibold shadow-sm';
			}

			fragment.appendChild(card);
		});

		endingSoonGrid.innerHTML = '';
		endingSoonGrid.appendChild(fragment);
	} catch (error) {
		console.error(error);
		if (endingSoonGrid) {
			showApiError(endingSoonGrid, 'Could not load auctions. Please try again.');
		}
	}
}

async function placeBid(listingId, rawAmount) {
	const amount = Number(rawAmount);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error('INVALID_AMOUNT');
	}

	const token = getToken();
	if (!token) {
		throw new Error('AUTH_REQUIRED');
	}

	const url = `${AUCTION}/listings/${encodeURIComponent(listingId)}/bids`;

	await apiRequest(url, {
		method: 'POST',
		body: JSON.stringify({ amount }),
	});
}

function setupBidding() {
	document.addEventListener('submit', async e => {
		const form = e.target;
		if (!(form instanceof HTMLFormElement)) return;
		if (!form.matches('[data-bid-form]')) return;

		e.preventDefault();

		const card = form.closest('[data-card]');
		if (!card) return;

		const listingId = form.dataset.listingId;
		const amountInput = form.querySelector('input[name="bid-amount"]');
		const successEl = card.querySelector('[data-bid-success]');
		const errorEl = card.querySelector('[data-bid-error]');

		if (!listingId || !(amountInput instanceof HTMLInputElement)) return;

		const user = getUser();
		const sellerName = card.dataset.sellerName || '';

		if (user && sellerName && user.name === sellerName) {
			if (errorEl) {
				errorEl.classList.remove('hidden');
				errorEl.textContent = 'You cannot bid on your own listing.';
			}
			if (successEl) {
				successEl.classList.add('hidden');
				successEl.textContent = '';
			}
			return;
		}

		const rawAmount = amountInput.value.trim();
		const numericAmount = Number(rawAmount);

		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			if (errorEl) {
				errorEl.classList.remove('hidden');
				errorEl.textContent = 'Please enter a valid bid amount.';
			}
			if (successEl) {
				successEl.classList.add('hidden');
				successEl.textContent = '';
			}
			return;
		}

		if (errorEl) {
			errorEl.classList.add('hidden');
			errorEl.textContent = '';
		}
		if (successEl) {
			successEl.classList.add('hidden');
			successEl.textContent = '';
		}

		const submitBtn = form.querySelector('button[type="submit"]');
		if (submitBtn) submitBtn.disabled = true;

		try {
			await placeBid(listingId, numericAmount);

			if (successEl) {
				successEl.classList.remove('hidden');
				successEl.textContent = 'Bid placed successfully.';
			}

			amountInput.value = '';

			if (successEl) {
				setTimeout(() => {
					successEl.classList.add('hidden');
					if (successEl.textContent === 'Bid placed successfully.') {
						successEl.textContent = '';
					}
				}, 4000);
			}
		} catch (error) {
			console.error('Bid error:', error);
			const message =
				error instanceof Error
					? error.message === 'AUTH_REQUIRED'
						? 'Please log in to place a bid.'
						: error.message
					: 'Could not place bid.';

			if (errorEl) {
				errorEl.classList.remove('hidden');
				errorEl.textContent = message;
			}
		} finally {
			if (submitBtn) {
				submitBtn.disabled = false;
			}
		}
	});
}

function initSearchAndFeatured() {
	if (!featuredGrid) return;

	const applyFormState = () => {
		featuredState.query = (searchInput?.value ?? '').trim();
		featuredState.tag = tagFilter?.value ?? '';
		featuredState.activeOnly = activeOnlyCheckbox?.checked ?? true;
		featuredState.sortChoice = sortSelect?.value ?? 'newest';
	};

	const reloadFromForm = () => {
		applyFormState();
		loadFeaturedFirstPage();
	};

	applyFormState();

	if (searchForm) {
		searchForm.addEventListener('submit', event => {
			event.preventDefault();
			reloadFromForm();
		});
	}

	if (tagFilter) {
		tagFilter.addEventListener('change', () => {
			reloadFromForm();
		});
	}

	if (activeOnlyCheckbox) {
		activeOnlyCheckbox.addEventListener('change', () => {
			reloadFromForm();
		});
	}

	if (sortSelect) {
		sortSelect.addEventListener('change', () => {
			reloadFromForm();
		});
	}

	if (featuredLoadMoreBtn) {
		featuredLoadMoreBtn.addEventListener('click', () => {
			loadFeaturedNextPage();
		});
	}

	loadFeaturedFirstPage();
}

document.addEventListener('DOMContentLoaded', () => {
	initMobileNav();

	initSearchAndFeatured();

	setTimeout(() => loadEndingSoon(), 50);
	setTimeout(() => setupBidding(), 100);
});
