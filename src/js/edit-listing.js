import { AUCTION, apiRequest, getUser, ensureApiKey, showApiError } from './auth.js';
import { getListingIdFromUrl, toLocalInputValue, toIsoFromLocal } from './utils.js';

const form = document.getElementById('edit-listing-form');
const msgEl = document.getElementById('edit-listing-message');

const titleInput = document.getElementById('edit-title');
const descInput = document.getElementById('edit-description');
const mediaInput = document.getElementById('edit-media');


const endDateInput = document.getElementById('create-end-date');
const endTimeInput = document.getElementById('create-end-time');


const mediaPreview = document.getElementById('edit-media-preview');

let currentListingId = null;
let currentListing = null;

function showMessage(msg, type = 'error') {
	if (!msgEl) return;
	msgEl.textContent = msg || '';

	msgEl.className = 'mb-2 text-sm';

	if (type === 'success') {
		msgEl.classList.add('text-emerald-600');
	} else if (type === 'info') {
		msgEl.classList.add('text-zinc-500');
	} else {
		msgEl.classList.add('text-red-600');
	}
}

function setFormDisabled(disabled) {
	if (!form) return;
	const btn = form.querySelector('button[type="submit"]');
	if (btn) {
		btn.disabled = disabled;
		btn.textContent = disabled ? 'Saving…' : 'Save changes';
	}
	Array.from(form.elements).forEach(el => {
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
			el.disabled = disabled;
		}
	});
}


function updateMediaPreview() {
	if (!mediaPreview || !mediaInput) return;

	const url = mediaInput.value.trim();

	if (!url) {
		
		mediaPreview.innerHTML = 'Image preview';
		
		return;
	}

	mediaPreview.innerHTML = '';

	const img = document.createElement('img');
	img.src = url;
	img.alt = 'Listing image preview';
	img.className = 'object-cover w-full h-full';

	mediaPreview.appendChild(img);
}


function fillForm(listing) {
	if (titleInput) titleInput.value = listing.title || '';
	if (descInput) descInput.value = listing.description || '';

	const media = Array.isArray(listing.media) ? listing.media : [];
	const firstMedia = media[0];
	const url =
		(typeof firstMedia === 'string' && firstMedia) ||
		(firstMedia && typeof firstMedia === 'object' && firstMedia.url) ||
		'';

	if (mediaInput) {
		mediaInput.value = url;
		updateMediaPreview();
	}

	
	if (listing.endsAt && (endDateInput || endTimeInput)) {
		const local = toLocalInputValue(listing.endsAt);
		if (local) {
			const [datePart, timePart] = local.split('T');
			if (endDateInput) endDateInput.value = datePart || '';
			if (endTimeInput) endTimeInput.value = timePart || '';
		}
	}
}

async function loadListing() {
	const user = getUser();
	if (!user) {
		showMessage('You must be logged in.', 'error');
		window.location.href = './login.html';
		return;
	}

	const id = getListingIdFromUrl('id');
	if (!id) {
		showMessage('Missing listing id.', 'error');
		return;
	}

	currentListingId = id;

	try {
		showMessage('Loading listing…', 'info');
		await ensureApiKey();

		const { data } = await apiRequest(`${AUCTION}/listings/${encodeURIComponent(id)}?_bids=true&_seller=true`);

		if (data.seller?.name && data.seller.name !== user.name) {
			showMessage('You can only edit your own listings.', 'error');
			return;
		}

		if (data._count?.bids > 0) {
			showMessage('You cannot edit a listing that already has bids.', 'error');
			if (form) {
				Array.from(form.elements).forEach(el => {
					if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
						el.disabled = true;
					}
				});
			}
			return;
		}

		currentListing = data;
		fillForm(data);
		showMessage('', 'info');
	} catch (error) {
		console.error('Edit listing load error:', error);
		showApiError(document.getElementById('edit-listing-form'), 'Could not load this listing. Please try again.');
	}
}

async function handleSubmit(event) {
	event.preventDefault();

	if (!currentListingId) {
		showMessage('Missing listing id.', 'error');
		return;
	}

	const user = getUser();
	if (!user) {
		showMessage('You must be logged in.', 'error');
		window.location.href = './login.html';
		return;
	}

	const title = titleInput?.value.trim() || '';
	const description = descInput?.value.trim() || '';
	const mediaUrl = mediaInput?.value.trim() || '';

	
	const datePart = endDateInput?.value || '';
	const timePart = endTimeInput?.value || '';

	if (!title) {
		showMessage('Title is required.', 'error');
		return;
	}

	if (!datePart) {
		showMessage('Please choose a valid end date.', 'error');
		return;
	}

	
	const localDateTime = `${datePart}T${timePart || '00:00'}`;
	const endsAt = toIsoFromLocal(localDateTime);

	if (!endsAt) {
		showMessage('Please choose a valid end date.', 'error');
		return;
	}

	const payload = {
		title,
		description,
		endsAt,
		media: mediaUrl
			? [
					{
						url: mediaUrl,
						alt: title || 'Listing image',
					},
			  ]
			: [],
	};

	try {
		setFormDisabled(true);
		showMessage('Saving changes…', 'info');

		await ensureApiKey();

		await apiRequest(`${AUCTION}/listings/${encodeURIComponent(currentListingId)}`, {
			method: 'PUT',
			body: JSON.stringify(payload),
		});

		showMessage('Listing updated. Redirecting…', 'success');

		setTimeout(() => {
			window.location.href = './my-listings.html';
		}, 800);
	} catch (error) {
		console.error('Edit listing save error:', error);
		showApiError(document.getElementById('edit-listing-form'), 'Could not update this listing. Please try again.');
		setFormDisabled(false);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	loadListing();

	if (form) {
		form.addEventListener('submit', handleSubmit);
	}

	if (mediaInput) {
		mediaInput.addEventListener('input', updateMediaPreview);
	}
});
