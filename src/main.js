import './style.css';
import { fetchFeatured } from './js/listings.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="p-8 bg-gray-800 rounded-xl text-center shadow-lg max-w-lg mx-auto">
    <h1 class="text-4xl font-bold text-blue-400 mb-4">BidHouse API Test</h1>
    <p class="text-gray-300 mb-6">Click the button below to check connection.</p>
    <button id="testBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium">
      Test API
    </button>
    <div id="output" class="mt-6 text-gray-200"></div>
  </div>
`;

const btn = document.querySelector('#testBtn');
const output = document.querySelector('#output');

btn.addEventListener('click', async () => {
	output.textContent = 'Loading...';
	try {
		const listings = await fetchFeatured(3);
		output.innerHTML = `
      ✅🤠 API connected successfully!
      <ul class="mt-4 list-disc list-inside text-left mx-auto inline-block">
        ${listings.map(l => `<li>${l.title}</li>`).join('')}
      </ul>
    `;
	} catch (err) {
		output.textContent = `❌😢 API Error: ${err.message}`;
	}
});
