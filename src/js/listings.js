import { AUCTION } from './config.js';
import { apiRequest } from './apiClient.js';

export async function fetchFeatured(limit = 3) {
	const url = `${AUCTION}/listings?limit=${limit}`;
	const data = await apiRequest(url);
	return data?.data || [];
}
