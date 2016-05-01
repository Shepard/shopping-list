const CACHE_VERSION = 3;
const CACHE_KEY = "shopping-list-v" + CACHE_VERSION;

self.addEventListener("install", function(event) {
	console.log("Service Worker installed.");

	// Cache our main assets. Additional ones like fonts that the browser may or may not request
	// (and that we don't depend on for running the app) are not initially cached but only on request.
	event.waitUntil(
		caches.open(CACHE_KEY).then(function(cache) {
			return cache.addAll([
				"css/main.css",
				"css/libs/material.min.css",
				"css/libs/material-icons.css",
				"js/main.js",
				"js/libs/material.min.js",
				"js/libs/slip.js"
			]);
		})
	);
});

self.addEventListener("activate", function(event) {
	console.log("Service Worker activated.");

	// Remove caches from older versions.
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(
				cacheNames.filter(function(cacheName) {
					return cacheName != CACHE_KEY;
				}).map(function(cacheName) {
					return caches.delete(cacheName);
				})
			);
		})
	);
});

self.addEventListener("fetch", function(event) {
	// When resources are requested, try to fetch them from the cache first.
	// If that fails, fetch them from the network and cache the result.
	// event.respondWith(
	// 	caches.open(CACHE_KEY).then(function(cache) {
	// 		return cache.match(event.request).then(function (response) {
	// 			return response || fetch(event.request).then(function(response) {
	// 				cache.put(event.request, response.clone());
	// 				return response;
	// 			});
	// 		});
	// 	})
	// );

	// For now go to network first, caching on success, and fall back to cache if network fails.
	event.respondWith(
		caches.open(CACHE_KEY).then(function(cache) {
			return fetch(event.request).then(function(response) {
				cache.put(event.request, response.clone());
				return response;
			}).catch(function() {
				return cache.match(event.request);
			});
		})
	);
});