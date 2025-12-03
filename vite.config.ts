import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss()],
	build: {
		rollupOptions: {
			input: {
				main: './index.html',
				login: './login.html',
				register: './register.html',
				profile: './profile.html',
				edit: './edit-profile.html',
				create: './create.html',
				editListing: './edit-listing.html',
				myBids: './my-bids.html',
				myListing: './my-listings.html',
				
				single: './single.html',
				wins: './my-wins.html',
				about: './about.html',
				contact: './contact.html',
			},
		},
	},
});
