import { AUCTION, apiRequest, getUser, ensureApiKey, showApiError } from './auth.js';

function setText(id, value) {
	const el = document.getElementById(id);
	if (el) el.textContent = value;
}

function renderListingsList(listId, items, emptyLabel) {
	const container = document.getElementById(listId);
	if (!container) return;

	container.innerHTML = '';

	if (!items || items.length === 0) {
		const p = document.createElement('p');
		p.textContent = emptyLabel;
		p.className = 'text-xs text-zinc-400';
		container.appendChild(p);
		return;
	}

	for (const item of items) {
		const media = Array.isArray(item.media) ? item.media : [];
		const first = media[0];

		const imgUrl =
			(typeof first === 'string' && first) ||
			(first && typeof first === 'object' && first.url) ||
			'https://placehold.co/600x400?text=No+image';

		const dateSource = item.endsAt || item.created;
		let dateLabel = 'No date';
		if (dateSource) {
			const d = new Date(dateSource);
			dateLabel = d.toLocaleDateString('nb-NO', {
				day: '2-digit',
				month: '2-digit',
				year: '2-digit',
			});
		}

		
		const card = document.createElement('a');
		card.href = `single.html?id=${encodeURIComponent(item.id)}`;
		card.className =
			'flex flex-col overflow-hidden transition bg-white border shadow-sm rounded-2xl border-zinc-200 hover:border-amber-500 hover:shadow-md';

		
		const imageWrap = document.createElement('div');
		imageWrap.className = 'relative w-full overflow-hidden bg-zinc-100 aspect-3/4';

		const img = document.createElement('img');
		img.src = imgUrl;
		img.alt = item.title ?? 'Listing image';
		img.className = 'object-cover w-full h-full';
		img.loading = 'lazy';

		imageWrap.appendChild(img);

	
		const body = document.createElement('div');
		body.className = 'flex flex-col gap-1 px-3 py-3 text-xs text-zinc-700';

		const titleEl = document.createElement('p');
		titleEl.textContent = item.title ?? 'Untitled listing';
		titleEl.className = 'text-sm font-semibold text-zinc-900 line-clamp-2';

		const metaEl = document.createElement('p');
		metaEl.textContent = dateLabel;
		metaEl.className = 'text-[11px] text-zinc-500';

		body.appendChild(titleEl);
		body.appendChild(metaEl);

		card.appendChild(imageWrap);
		card.appendChild(body);

		container.appendChild(card);
	}
}

function renderActiveBids(listId, items, emptyLabel) {
	const container = document.getElementById(listId);
	if (!container) return;

	container.innerHTML = '';

	if (!items || items.length === 0) {
		const p = document.createElement('p');
		p.textContent = emptyLabel;
		p.className = 'text-xs text-zinc-400';
		container.appendChild(p);
		return;
	}

	for (const item of items) {
		const media = Array.isArray(item.media) ? item.media : [];
		const first = media[0];

		const imgUrl =
			(typeof first === 'string' && first) ||
			(first && typeof first === 'object' && first.url) ||
			'https://placehold.co/600x400?text=No+image';

		let endsLabel = 'No end date';
		if (item.endsAt) {
			const d = new Date(item.endsAt);
			endsLabel =
				'Ends: ' +
				d.toLocaleDateString('nb-NO', {
					day: '2-digit',
					month: '2-digit',
					year: '2-digit',
				});
		}

		const highest = typeof item.currentHighest === 'number' ? item.currentHighest : null;

		let statusText = 'Status unknown';
		let statusClass = 'text-zinc-500';
		if (highest !== null) {
			if (item.isLeading) {
				statusText = 'You are currently winning';
				statusClass = 'text-emerald-600';
			} else {
				statusText = `Outbid — highest: ${highest}`;
				statusClass = 'text-red-600';
			}
		}

		const card = document.createElement('a');
		card.href = `single.html?id=${encodeURIComponent(item.id)}`;
		card.className =
			'flex flex-col overflow-hidden transition bg-white border shadow-sm rounded-2xl border-zinc-200 hover:border-amber-500 hover:shadow-md';

		
		const imageWrap = document.createElement('div');
		imageWrap.className = 'relative w-full overflow-hidden bg-zinc-100 aspect-3/4';

		const img = document.createElement('img');
		img.src = imgUrl;
		img.alt = item.title ?? 'Listing image';
		img.className = 'object-cover w-full h-full';
		img.loading = 'lazy';

		imageWrap.appendChild(img);

		
		const body = document.createElement('div');
		body.className = 'flex flex-col gap-1 px-3 py-3 text-xs text-zinc-700';

		const titleEl = document.createElement('p');
		titleEl.textContent = item.title ?? 'Untitled listing';
		titleEl.className = 'text-sm font-semibold text-zinc-900 line-clamp-2';

		const endsEl = document.createElement('p');
		endsEl.textContent = endsLabel;
		endsEl.className = 'text-[11px] text-zinc-500';

		const yourBidEl = document.createElement('p');
		yourBidEl.textContent = `Your highest bid: ${item.userBid}`;
		yourBidEl.className = 'text-[11px] text-zinc-600';

		const statusEl = document.createElement('p');
		statusEl.textContent = statusText;
		statusEl.className = 'text-[11px] font-semibold ' + statusClass;

		body.appendChild(titleEl);
		body.appendChild(endsEl);
		body.appendChild(yourBidEl);
		body.appendChild(statusEl);

		card.appendChild(imageWrap);
		card.appendChild(body);

		container.appendChild(card);
	}
}

async function loadProfile() {
	const user = getUser();
	const msgEl = document.getElementById('profile-message');

	if (!user) {
		if (msgEl) msgEl.textContent = 'You must be logged in to view this page.';
		window.location.href = './login.html';
		return;
	}

	try {
		await ensureApiKey();

		const name = user.name;
		const baseProfileUrl = `${AUCTION}/profiles/${encodeURIComponent(name)}`;

		const [{ data: profile }, bidsRes] = await Promise.all([
			apiRequest(`${baseProfileUrl}?_listings=true&_wins=true`),
			apiRequest(`${baseProfileUrl}/bids?_listings=true&sort=created&sortOrder=desc`),
		]);

		
		setText('profile-name', profile.name || '');
		setText('profile-email', profile.email || '');
		setText('profile-credits', String(profile.credits ?? 0));
		setText('profile-bio', profile.bio || 'No bio added yet.');

		const avatarEl = document.getElementById('profile-avatar');
		if (avatarEl) {
			const avatarUrl = profile.avatar?.url || 'https://placehold.co/200x200?text=No+Avatar';
			avatarEl.src = avatarUrl;
			avatarEl.alt = `${profile.name} avatar`;
		}

		const bannerBg = document.getElementById('profile-banner-bg');
		if (bannerBg && profile.banner?.url) {
			bannerBg.style.backgroundImage = `url("${profile.banner.url}")`;
			bannerBg.classList.remove('hidden');
		} else if (bannerBg) {
			bannerBg.style.backgroundImage = 'none';
			bannerBg.classList.add('hidden');
		}

	
		const listings = Array.isArray(profile.listings) ? profile.listings : [];
		setText('profile-stat-listings', String(listings.length));

		const latestListings = [...listings].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 3);

		renderListingsList('profile-latest-listings', latestListings, 'No listings yet.');

	
		const winsArr = Array.isArray(profile.wins) ? profile.wins : [];
		const winsCount = typeof profile._count?.wins === 'number' ? profile._count.wins : winsArr.length;
		setText('profile-stat-wins', String(winsCount));

		const latestWins = [...winsArr]
			.sort((a, b) => {
				const da = a.endsAt ? new Date(a.endsAt) : a.created ? new Date(a.created) : new Date(0);
				const db = b.endsAt ? new Date(b.endsAt) : b.created ? new Date(b.created) : new Date(0);
				return db - da;
			})
			.slice(0, 3);

		renderListingsList('profile-latest-wins', latestWins, 'No wins yet.');

		
		const bids = Array.isArray(bidsRes?.data) ? bidsRes.data : [];

		const now = new Date();
		const activeBidMap = new Map();

		for (const bid of bids) {
			const listing = bid.listing;
			if (!listing || !listing.id) continue;

			const endsAt = listing.endsAt ? new Date(listing.endsAt) : null;
			const isActive = !endsAt || endsAt > now;
			if (!isActive) continue;

			const current = activeBidMap.get(listing.id) || {
				id: listing.id,
				title: listing.title,
				endsAt: listing.endsAt,
				userBid: 0,
			};

			const userAmount = typeof bid.amount === 'number' ? bid.amount : 0;
			if (userAmount > current.userBid) current.userBid = userAmount;

			activeBidMap.set(listing.id, current);
		}

		let activeBidItems = Array.from(activeBidMap.values()).sort((a, b) => {
			const da = a.endsAt ? new Date(a.endsAt) : new Date(8640000000000000);
			const db = b.endsAt ? new Date(b.endsAt) : new Date(8640000000000000);
			return da - db;
		});

		if (activeBidItems.length > 0) {
			const details = await Promise.all(
				activeBidItems.map(item =>
					apiRequest(`${AUCTION}/listings/${encodeURIComponent(item.id)}?_bids=true&_media=true`).catch(() => null)
				)
			);

			activeBidItems = activeBidItems.map((item, idx) => {
				const res = details[idx];
				const listing = res?.data;
				const bidsArr = Array.isArray(listing?.bids) ? listing.bids : [];

				let highest = 0;
				for (const b of bidsArr) {
					const amt = typeof b.amount === 'number' && !Number.isNaN(b.amount) ? b.amount : 0;
					if (amt > highest) highest = amt;
				}

				const isLeading = highest > 0 && item.userBid >= highest;
				const media = Array.isArray(listing?.media) ? listing.media : [];

				return {
					...item,
					currentHighest: highest,
					isLeading,
					media,
				};
			});
		}

		setText('profile-stat-active', String(activeBidItems.length));
		renderActiveBids('profile-active-bids', activeBidItems, 'No active bids.');

		if (msgEl) msgEl.textContent = '';
	} catch (error) {
		console.error('Profile page error:', error);

		const main = document.querySelector('main');
		showApiError(main, 'Could not load your profile. Please try again.');
	}
}

document.addEventListener('DOMContentLoaded', loadProfile);
