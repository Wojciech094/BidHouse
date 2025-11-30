
import { AUCTION, apiRequest, getUser, showApiError } from './auth.js';

const avatarInput = document.getElementById('edit-avatar');
const bannerInput = document.getElementById('edit-banner');
const bioInput = document.getElementById('edit-bio');

const avatarPreview = document.getElementById('edit-avatar-preview');
const bannerPreview = document.getElementById('edit-banner-preview');

const form = document.getElementById('edit-profile-form');
const msgEl = document.getElementById('edit-message');

const AVATAR_FALLBACK = 'https://placehold.co/120x120?text=Avatar';

function showMessage(msg, type = 'error') {
	if (!msgEl) return;
	msgEl.textContent = msg;
	msgEl.className = 'mt-2 text-sm ' + (type === 'success' ? 'text-emerald-600' : 'text-red-600');
}

function updateAvatarPreview(url) {
	if (!avatarPreview) return;
	const clean = url.trim();
	avatarPreview.src = clean || AVATAR_FALLBACK;
}

function updateBannerPreview(url) {
	if (!bannerPreview) return;

	const clean = url.trim();
	if (!clean) {
		bannerPreview.style.backgroundImage = 'none';
		bannerPreview.textContent = 'Banner preview';
		return;
	}

	bannerPreview.style.backgroundImage = `url("${clean}")`;
	bannerPreview.textContent = '';
}

function isDataUrl(url) {
	return /^data:/i.test(url);
}

if (avatarInput) {
	avatarInput.addEventListener('input', () => {
		updateAvatarPreview(avatarInput.value);
	});
}

if (bannerInput) {
	bannerInput.addEventListener('input', () => {
		updateBannerPreview(bannerInput.value);
	});
}

async function loadExistingProfile(user) {
	try {
		const { data } = await apiRequest(`${AUCTION}/profiles/${encodeURIComponent(user.name)}`);

		if (avatarInput && data.avatar?.url) {
			avatarInput.value = data.avatar.url;
			updateAvatarPreview(data.avatar.url);
		} else {
			updateAvatarPreview('');
		}

		if (bannerInput && data.banner?.url) {
			bannerInput.value = data.banner.url;
			updateBannerPreview(data.banner.url);
		} else {
			updateBannerPreview('');
		}

		if (bioInput && data.bio) {
			bioInput.value = data.bio;
		}
	} catch (error) {
		console.error('Could not load profile for edit', error);
		
		showApiError(form || document.querySelector('main'), 'Could not load your profile data. Please try again.');
	}
}

async function handleSubmit(event) {
	event.preventDefault();

	const user = getUser();
	if (!user) {
		showMessage('You must be logged in.', 'error');
		window.location.href = './login.html';
		return;
	}

	const avatarUrl = avatarInput?.value.trim() || '';
	const bannerUrl = bannerInput?.value.trim() || '';
	const bio = bioInput?.value.trim() || '';

	if (avatarUrl && isDataUrl(avatarUrl)) {
		showMessage('Avatar URL cannot be a base64 data URL. Please paste a normal https image URL.', 'error');
		return;
	}

	if (bannerUrl && isDataUrl(bannerUrl)) {
		showMessage('Banner URL cannot be a base64 data URL. Please paste a normal https image URL.', 'error');
		return;
	}

	const body = {};

	if (avatarUrl) {
		body.avatar = {
			url: avatarUrl,
			alt: `${user.name} avatar`,
		};
	}

	if (bannerUrl) {
		body.banner = {
			url: bannerUrl,
			alt: `${user.name} banner`,
		};
	}

	if (bio) {
		body.bio = bio;
	}

	if (Object.keys(body).length === 0) {
		showMessage('Nothing to update.', 'error');
		return;
	}

	try {
		const submitBtn = form?.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.disabled = true;
			submitBtn.textContent = 'Saving...';
		}

		await apiRequest(`${AUCTION}/profiles/${encodeURIComponent(user.name)}`, {
			method: 'PUT',
			body: JSON.stringify(body),
		});

		showMessage('Profile updated. Redirecting...', 'success');

		if (avatarUrl) updateAvatarPreview(avatarUrl);
		if (bannerUrl) updateBannerPreview(bannerUrl);

		setTimeout(() => {
			window.location.href = './profile.html';
		}, 1200);
	} catch (error) {
		console.error('Error saving profile changes:', error);
		
		showApiError(form || document.querySelector('main'), 'Error saving changes. Please try again.');
	} finally {
		const submitBtn = form?.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.disabled = false;
			submitBtn.textContent = 'Save changes';
		}
	}
}

function initEditProfile() {
	const user = getUser();
	if (!user) {
		window.location.href = './login.html';
		return;
	}

	if (form) {
		form.addEventListener('submit', handleSubmit);
	}

	loadExistingProfile(user);
}

document.addEventListener('DOMContentLoaded', initEditProfile);
