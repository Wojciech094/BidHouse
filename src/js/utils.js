export function getListingIdFromUrl(paramName = 'id') {
	const params = new URLSearchParams(window.location.search);
	return params.get(paramName);
}

export function getHighestBid(listing) {
	if (!listing) return 0;

	const base = typeof listing.price === 'number' ? listing.price : 0;
	const bids = Array.isArray(listing.bids) ? listing.bids : [];

	if (!bids.length) return base;

	return bids.reduce((max, bid) => {
		const amt = typeof bid.amount === 'number' ? bid.amount : 0;
		return amt > max ? amt : max;
	}, base);
}

export function toLocalInputValue(isoString) {
	if (!isoString) return '';
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return '';

	const pad = n => String(n).padStart(2, '0');
	const year = d.getFullYear();
	const month = pad(d.getMonth() + 1);
	const day = pad(d.getDate());
	const hours = pad(d.getHours());
	const minutes = pad(d.getMinutes());

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toIsoFromLocal(inputValue) {
	if (!inputValue) return null;
	const d = new Date(inputValue);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}

export function setStatusMessage(el, msg, type = 'info') {
	if (!el) return;

	el.textContent = msg || '';

	el.classList.remove('text-red-600', 'text-emerald-600', 'text-zinc-500');
	el.classList.add('text-sm');

	if (type === 'error') {
		el.classList.add('text-red-600');
	} else if (type === 'success') {
		el.classList.add('text-emerald-600');
	} else {
		el.classList.add('text-zinc-500');
	}
}
