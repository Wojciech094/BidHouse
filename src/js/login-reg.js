// code from another project 

document.addEventListener('DOMContentLoaded', () => {
	//    register
	const regForm = document.getElementById('register-form');
	const regMsg = document.getElementById('register-message');

	regForm?.addEventListener('submit', async e => {
		e.preventDefault();

		const name = document.getElementById('reg-name').value.trim();
		const email = document.getElementById('reg-email').value.trim();
		const password = document.getElementById('reg-password').value;

		if (name.length < 3) {
			regMsg.textContent = 'Username must be at least 3 characters.';
			regMsg.classList.remove('success');
			return;
		}
		if (!email.includes('@')) {
			regMsg.textContent = 'Please enter a valid email address.';
			regMsg.classList.remove('success');
			return;
		}
		if (password.length < 8) {
			regMsg.textContent = 'Password must be at least 8 characters.';
			regMsg.classList.remove('success');
			return;
		}
		try {
			const res = await fetch('https://v2.api.noroff.dev/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password }),
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.errors?.[0]?.message || 'Registration failed');

			regMsg.textContent = ' Registered! You can now log in.';
			regMsg.classList.add('success');
			regForm.reset();
		} catch (err) {
			regMsg.textContent = err.message;
			regMsg.classList.remove('success');
		}
	});

	//    login
	const loginForm = document.getElementById('login-form');
	const loginMsg = document.getElementById('login-message');

	loginForm?.addEventListener('submit', async e => {
		e.preventDefault();

		const email = document.getElementById('login-email').value.trim();
		const password = document.getElementById('login-password').value;
		if (!email || !password || password.length < 8) {
			loginMsg.textContent = 'Please enter valid email and password (min 8 characters)';
			loginMsg.classList.add('fail');
			return;
		}

		try {
			const res = await fetch('https://v2.api.noroff.dev/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.errors?.[0]?.message || 'Login failed');

			const isAdmin = result.data.name === 'VooDoo';
			localStorage.setItem('token', result.data.accessToken);
			localStorage.setItem('user', JSON.stringify({ ...result.data, isAdmin }));

			loginMsg.textContent = ' Login successful! ';
			loginMsg.classList.add('success');

			setTimeout(() => {
				window.location.href = '../index.html';
			}, 1500);
		} catch (err) {
			loginMsg.textContent = err.message;
			loginMsg.classList.remove('success');
		}
	});
});
