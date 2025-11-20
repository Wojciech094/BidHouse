
import '../style.css';
const API = 'https://v2.api.noroff.dev/auth';

function showMsg(el, msg, type = 'error') {
	el.className = '';
	el.textContent = msg;

	el.classList.add('mt-2', 'px-4', 'py-2', 'rounded-xl', 'text-sm', 'font-medium', 'border');

	if (type === 'success') {
		el.classList.add('bg-green-100', 'border-green-300', 'text-green-700');
	} else {
		el.classList.add('bg-red-100', 'border-red-300', 'text-red-700');
	}
}



const regForm = document.getElementById('register-form');
if (regForm) {
	regForm.addEventListener('submit', async e => {
		e.preventDefault();

		const name = document.getElementById('reg-name').value.trim();
		const email = document.getElementById('reg-email').value.trim();
		const password = document.getElementById('reg-password').value;
		const msg = document.getElementById('register-message');

		msg.textContent = '';

		if (!email.endsWith('@stud.noroff.no')) {
			showMsg(msg, 'Email must be @stud.noroff.no');
			return;
		}

		if (password.length < 8) {
			showMsg(msg, 'Password must be at least 8 characters');
			return;
		}

		try {
			const res = await fetch(`${API}/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				showMsg(msg, data.errors?.[0]?.message || 'Registration failed');
				return;
			}

			showMsg(msg, 'Registered! You can now log in.', 'success');
			regForm.reset();
		} catch {
			showMsg(msg, 'Network error. Try again');
		}
	});
}



const loginForm = document.getElementById('login-form');
if (loginForm) {
	loginForm.addEventListener('submit', async e => {
		e.preventDefault();

		const email = document.getElementById('login-email').value.trim();
		const password = document.getElementById('login-password').value;
		const msg = document.getElementById('login-message');

		msg.textContent = '';

		if (password.length < 8) {
			showMsg(msg, 'Password must be at least 8 characters');
			return;
		}

		try {
			const res = await fetch(`${API}/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				showMsg(msg, data.errors?.[0]?.message || 'Login failed');
				return;
			}

			localStorage.setItem('token', data.data.accessToken);
			localStorage.setItem('user', JSON.stringify(data.data));

			showMsg(msg, 'Login successful! Redirecting…', 'success');

			setTimeout(() => (window.location.href = './index.html'), 800);
		} catch {
			showMsg(msg, 'Network error. Try again');
		}
	});
}
