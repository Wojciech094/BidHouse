import { getUser, getToken } from './home-api.js';
export function setupHeader() {
	const user = getUser();
	const token = getToken();

	const out = document.getElementById('auth-logged-out');
	const inn = document.getElementById('auth-logged-in');
	const nameEl = document.getElementById('user-name');
	const avatar = document.getElementById('user-avatar');
	const logoutBtn = document.getElementById('logout-btn');

	if (!out || !inn) return;

	if (user && token) {
		out.classList.add('hidden');
		inn.classList.remove('hidden');

		const name = user.name || 'User';
		if (nameEl) nameEl.textContent = name;

		if (avatar) {
			const initials = name
				.split(' ')
				.map(p => p[0]?.toUpperCase() || '')
				.join('')
				.slice(0, 2);

			avatar.textContent = initials || 'U';
		}

		if (logoutBtn) {
			logoutBtn.addEventListener('click', () => {
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				localStorage.removeItem('apiKey');
				location.reload();
			});
		}
	} else {
		out.classList.remove('hidden');
		inn.classList.add('hidden');
	}
}


export function initMobileNav() {
	const toggle = document.getElementById('mobile-menu-toggle');
	const menu = document.getElementById('mobile-menu');

	if (!toggle || !menu) return;

	const openIcon = toggle.querySelector('[data-icon="open"]');
	const closeIcon = toggle.querySelector('[data-icon="close"]');

	function setState(open) {
		if (open) {
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
		const isOpen = !menu.classList.contains('hidden');
		setState(!isOpen);
	});

	window.addEventListener('resize', () => {
		if (window.innerWidth >= 768) {
			setState(false);
		}
	});
}
