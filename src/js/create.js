import { AUCTION, apiRequest, getUser, ensureApiKey , showApiError } from './auth.js';
import { toIsoFromLocal } from './utils.js';

const form = document.getElementById('create-form');
const msgEl = document.getElementById('create-message');

function showMessage(msg, type = 'error') {
	if (!msgEl) return;
	msgEl.textContent = msg || '';

	msgEl.className = 'mt-2 text-sm';

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
		btn.textContent = disabled ? 'Creating…' : 'Create listing';
	}
	Array.from(form.elements).forEach(el => {
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
			el.disabled = disabled;
		}
	});
}

function isDataUrl(url) {
	return /^data:/i.test(url);
}

function buildPayload({ title, description, mediaUrl, endsAt }) {
	const payload = {
		title,
		description,
		endsAt,
		media: [],
	};

	if (mediaUrl) {
		payload.media.push({
			url: mediaUrl,
			alt: title || 'Listing image',
		});
	}

	return payload;
}

async function handleSubmit(event) {
	event.preventDefault();

	const user = getUser();
	if (!user) {
		showMessage('You must be logged in to create a listing.', 'error');
		window.location.href = './login.html';
		return;
	}

	if (!form) return;

	const titleInput = document.getElementById('create-title');
	const descInput = document.getElementById('create-description');
	const mediaInput = document.getElementById('create-media');
	const endsInput = document.getElementById('create-endsAt');
	const termsInput = document.getElementById('create-terms');

	const title = titleInput?.value.trim() || '';
	const description = descInput?.value.trim() || '';
	const mediaUrl = mediaInput?.value.trim() || '';
	const endsAtLocal = endsInput?.value || '';
	const termsAccepted = termsInput?.checked || false;

	if (!title) {
		showMessage('Title is required.', 'error');
		return;
	}

	const endsAt = toIsoFromLocal(endsAtLocal);
	if (!endsAt) {
		showMessage('Please choose a valid end date.', 'error');
		return;
	}

	if (mediaUrl && isDataUrl(mediaUrl)) {
		showMessage('Image URL cannot be a base64 data URL. Please use a regular HTTP/HTTPS URL.', 'error');
		return;
	}

	if (!termsAccepted) {
		showMessage('You must accept the terms before creating a listing.', 'error');
		return;
	}

	const payload = buildPayload({ title, description, mediaUrl, endsAt });

	try {
		setFormDisabled(true);
		showMessage('Creating listing…', 'info');

		await ensureApiKey();

		await apiRequest(`${AUCTION}/listings`, {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		showMessage('Listing created. Redirecting to My listings…', 'success');

		setTimeout(() => {
			window.location.href = './my-listings.html';
		}, 800);
	} catch (error) {
		console.error('Create listing error:', error);
		showApiError(document.getElementById('create-form'), 'Could not create listing. Please try again.');
		setFormDisabled(false);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	if (form) {
		form.addEventListener('submit', handleSubmit);
	}
});
