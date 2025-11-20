
import { setupHeader, initMobileNav } from './home-header.js';
import { initSearchAndFeatured, loadEndingSoon } from './home-listings.js';
import { setupBidding } from './home-bidding.js';

document.addEventListener('DOMContentLoaded', () => {
	setupHeader();
	initMobileNav();
	initSearchAndFeatured();
	loadEndingSoon();
	setupBidding();
});
