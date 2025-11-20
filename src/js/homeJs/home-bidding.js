
import { placeBid } from './home-api.js';
import { loadFeaturedFirstPage, loadEndingSoon } from './home-listings.js';

export function setupBidding() {
	document.addEventListener('submit', async event => {
		const form = event.target;
		if (!(form instanceof HTMLFormElement)) return;
		if (!form.matches('[data-bid-form]')) return;

		event.preventDefault();

		const listingId = form.getAttribute('data-listing-id');
		const amountInput = form.querySelector('input[name="bid-amount"]');

		const successEl = form.closest('article')?.querySelector('[data-bid-success]');
		const errorEl = form.closest('article')?.querySelector('[data-bid-error]');

		if (!listingId || !amountInput) return;

		const amount = amountInput.value;

		if (successEl) successEl.classList.add('hidden');
		if (errorEl) errorEl.classList.add('hidden');

		const btn = form.querySelector('button[type="submit"]');
		if (btn) {
			btn.disabled = true;
			btn.textContent = 'Bidding...';
		}

		try {
			await placeBid(listingId, amount);

			amountInput.value = '';

			if (successEl) {
				successEl.textContent = 'Bid placed successfully.';
				successEl.classList.remove('hidden');
			}

			loadFeaturedFirstPage();
			loadEndingSoon();
		} catch (err) {
			console.error(err);

			if (err.message === 'AUTH_REQUIRED') {
				if (errorEl) {
					errorEl.textContent = 'You must be logged in to bid.';
					errorEl.classList.remove('hidden');
				} else {
					alert('You must be logged in to bid.');
				}
			} else {
				if (errorEl) {
					errorEl.textContent = 'Could not place bid.';
					errorEl.classList.remove('hidden');
				} else {
					alert('Could not place bid.');
				}
			}
		} finally {
			if (btn) {
				btn.disabled = false;
				btn.textContent = 'Bid';
			}
		}
	});
}
