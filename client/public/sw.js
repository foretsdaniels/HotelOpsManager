const CACHE_NAME = 'hotel-ops-v1';
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

const API_CACHE_NAME = 'hotel-ops-api-v1';
const CACHEABLE_API_ROUTES = [
  '/api/auth/me',
  '/api/rooms',
  '/api/users'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.log('Service Worker: Cache failed', err))
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET' && CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
      // Network first strategy for cacheable API routes
      event.respondWith(
        fetch(request)
          .then(response => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(API_CACHE_NAME)
                .then(cache => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // Return cached version if network fails
            return caches.match(request);
          })
      );
    } else {
      // Network only for non-cacheable API requests (POST, PUT, DELETE, etc.)
      event.respondWith(fetch(request));
    }
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Fetch from network if not in cache
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache successful responses
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));

            return response;
          });
      })
      .catch(() => {
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Background sync for offline task updates
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-tasks') {
    event.waitUntil(
      // Handle background sync logic here
      // This could sync pending task updates when connection is restored
      console.log('Service Worker: Processing background task sync')
    );
  }
});

// Push notification handling for panic alerts
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Emergency alert triggered',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: data.tag || 'panic-alert',
      requireInteraction: true,
      actions: [
        {
          action: 'acknowledge',
          title: 'Acknowledge'
        },
        {
          action: 'respond',
          title: 'Respond'
        }
      ],
      data: data
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Hotel Operations Alert',
        options
      )
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'acknowledge') {
    // Handle acknowledge action
    console.log('Service Worker: Alert acknowledged');
  } else if (event.action === 'respond') {
    // Handle respond action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync for data updates (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered', event.tag);
  
  if (event.tag === 'update-tasks') {
    event.waitUntil(
      // Update critical task data in background
      updateCriticalData()
    );
  }
});

// Helper function to update critical data
async function updateCriticalData() {
  try {
    // Fetch and cache critical data like pending tasks, urgent work orders
    const responses = await Promise.all([
      fetch('/api/tasks?status=pending'),
      fetch('/api/workorders?status=urgent'),
      fetch('/api/panic/log')
    ]);
    
    const cache = await caches.open(API_CACHE_NAME);
    responses.forEach((response, index) => {
      if (response.ok) {
        const urls = ['/api/tasks?status=pending', '/api/workorders?status=urgent', '/api/panic/log'];
        cache.put(urls[index], response.clone());
      }
    });
    
    console.log('Service Worker: Critical data updated');
  } catch (error) {
    console.error('Service Worker: Failed to update critical data', error);
  }
}
