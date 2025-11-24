
import { AUCTION, apiRequest, getUser, ensureApiKey } from './auth.js';

function setText(id, value) {
	const el = document.getElementById(id);
	if (el) el.textContent = value;
}

function renderListingsList(listId, items, emptyLabel) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	ul.innerHTML = '';

	if (!items || items.length === 0) {
		const li = document.createElement('li');
		li.textContent = emptyLabel;
		ul.appendChild(li);
		return;
	}

	for (const item of items) {
		const li = document.createElement('li');

		const a = document.createElement('a');
		a.href = `single.html?id=${encodeURIComponent(item.id)}`;
		a.className = 'flex items-center justify-between gap-3 hover:text-amber-700';

		const title = document.createElement('span');
		title.textContent = item.title ?? 'Untitled listing';

		const meta = document.createElement('span');
		meta.className = 'text-[11px] text-zinc-400';

		const dateSource = item.endsAt || item.created;
		if (dateSource) {
			const d = new Date(dateSource);
			meta.textContent = d.toLocaleDateString('nb-NO', {
				day: '2-digit',
				month: '2-digit',
				year: '2-digit',
			});
		} else {
			meta.textContent = 'No date';
		}

		a.appendChild(title);
		a.appendChild(meta);

		li.appendChild(a);
		ul.appendChild(li);
	}
}


function renderActiveBids(listId, items, emptyLabel) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	ul.innerHTML = '';

	if (!items || items.length === 0) {
		const li = document.createElement('li');
		li.textContent = emptyLabel;
		li.className = 'text-zinc-400';
		ul.appendChild(li);
		return;
	}

	for (const item of items) {
		const li = document.createElement('li');

		const a = document.createElement('a');
		a.href = `single.html?id=${encodeURIComponent(item.id)}`;
		a.className =
			'flex items-start justify-between gap-3 text-sm hover:text-amber-700';

		const left = document.createElement('div');
		left.className = 'flex flex-col gap-0.5';

		const title = document.createElement('span');
		title.className = 'font-medium';
		title.textContent = item.title ?? 'Untitled listing';

		const endsSpan = document.createElement('span');
		endsSpan.className = 'text-[11px] text-zinc-500';

		if (item.endsAt) {
			const d = new Date(item.endsAt);
			endsSpan.textContent =
				'Ends: ' +
				d.toLocaleDateString('nb-NO', {
					day: '2-digit',
					month: '2-digit',
					year: '2-digit',
				});
		} else {
			endsSpan.textContent = 'No end date';
		}

		left.appendChild(title);
		left.appendChild(endsSpan);

		
		const right = document.createElement('div');
		right.className = 'text-right text-[12px] space-y-0.5';

		const yourBidEl = document.createElement('div');
		yourBidEl.textContent = `Your highest bid: ${item.userBid}`;
		yourBidEl.className = 'text-zinc-600';

		const statusEl = document.createElement('div');
		const highest = typeof item.currentHighest === 'number' ? item.currentHighest : null;

		if (item.isLeading && highest !== null) {
			statusEl.textContent = 'You are currently winning';
			statusEl.className = 'font-medium text-emerald-600';
		} else if (!item.isLeading && highest !== null) {
			statusEl.textContent = `Outbid — highest: ${highest}`;
			statusEl.className = 'font-medium text-red-600';
		} else {
			
			statusEl.textContent = 'Status unknown';
			statusEl.className = 'text-zinc-400';
		}

		right.appendChild(yourBidEl);
		right.appendChild(statusEl);

		a.appendChild(left);
		a.appendChild(right);
		li.appendChild(a);
		ul.appendChild(li);
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
			apiRequest(
				`${baseProfileUrl}/bids?_listings=true&sort=created&sortOrder=desc`,
			),
		]);

		setText('profile-name', profile.name || '');
		setText('profile-email', profile.email || '');
		setText('profile-credits', String(profile.credits ?? 0));
		setText('profile-bio', profile.bio || 'No bio added yet.');

		const avatarEl = document.getElementById('profile-avatar');
		if (avatarEl) {
			const avatarUrl =
				profile.avatar?.url || 'https://placehold.co/200x200?text=No+Avatar';
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

		const latestListings = [...listings]
			.sort((a, b) => new Date(b.created) - new Date(a.created))
			.slice(0, 3);

		renderListingsList(
			'profile-latest-listings',
			latestListings,
			'No listings yet.',
		);

		const winsArr = Array.isArray(profile.wins) ? profile.wins : [];
		const winsCount =
			typeof profile._count?.wins === 'number'
				? profile._count.wins
				: winsArr.length;
		setText('profile-stat-wins', String(winsCount));

		const bids = Array.isArray(bidsRes?.data) ? bidsRes.data : [];
		const now = new Date();
		const activeBidMap = new Map();

		for (const bid of bids) {
			const listing = bid.listing;
			if (!listing || !listing.id) continue;

			const endsAt = listing.endsAt ? new Date(listing.endsAt) : null;
			const isActive = !endsAt || endsAt > now;

			if (!isActive) continue;

			const current =
				activeBidMap.get(listing.id) || {
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
					apiRequest(
						`${AUCTION}/listings/${encodeURIComponent(
							item.id,
						)}?_bids=true`,
					).catch(() => null),
				),
			);

			activeBidItems = activeBidItems.map((item, idx) => {
				const res = details[idx];
				const listing = res?.data;
				const bidsArr = Array.isArray(listing?.bids) ? listing.bids : [];

				let highest = 0;
				for (const b of bidsArr) {
					const amt =
						typeof b.amount === 'number' && !Number.isNaN(b.amount)
							? b.amount
							: 0;
					if (amt > highest) highest = amt;
				}

				const isLeading =
					highest > 0 && item.userBid >= highest; 

				return {
					...item,
					currentHighest: highest,
					isLeading,
				};
			});
		}

		setText('profile-stat-active', String(activeBidItems.length));
		renderActiveBids('profile-active-bids', activeBidItems, 'No active bids.');

		if (msgEl) msgEl.textContent = '';
	} catch (error) {
		console.error('Profile page error:', error);
		if (msgEl) msgEl.textContent = 'Could not load profile.';
	}
}

document.addEventListener('DOMContentLoaded', loadProfile);
