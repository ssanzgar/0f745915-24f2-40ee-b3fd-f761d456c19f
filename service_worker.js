// ==========================================
// BEYOND BRAIN.FM - SERVICE WORKER PWA
// Permite funcionamiento offline y instalación
// ==========================================

const CACHE_NAME = 'beyond-brainfm-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Recursos críticos para funcionamiento offline
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Íconos necesarios
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Fonts del sistema (si usas Google Fonts)
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Recursos opcionales (no críticos)
const OPTIONAL_RESOURCES = [
  '/icon-72x72.png',
  '/icon-96x96.png', 
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-384x384.png'
];

// ==========================================
// INSTALACIÓN DEL SERVICE WORKER
// ==========================================
self.addEventListener('install', event => {
  console.log('🔧 Beyond Brain.fm SW: Instalando...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache recursos críticos
        console.log('💾 Cacheando recursos críticos...');
        await cache.addAll(CRITICAL_RESOURCES);
        
        // Cache recursos opcionales (sin fallar si alguno falla)
        console.log('💾 Cacheando recursos opcionales...');
        await Promise.allSettled(
          OPTIONAL_RESOURCES.map(resource => cache.add(resource))
        );
        
        console.log('✅ Beyond Brain.fm SW: Instalación completada');
        
        // Activar inmediatamente
        self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Error durante instalación SW:', error);
      }
    })()
  );
});

// ==========================================
// ACTIVACIÓN DEL SERVICE WORKER  
// ==========================================
self.addEventListener('activate', event => {
  console.log('🚀 Beyond Brain.fm SW: Activando...');
  
  event.waitUntil(
    (async () => {
      try {
        // Limpiar caches viejos
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(cacheName => cacheName.startsWith('beyond-brainfm-') && cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('🗑️ Eliminando cache viejo:', cacheName);
              return caches.delete(cacheName);
            })
        );
        
        // Tomar control de todas las pestañas
        await self.clients.claim();
        
        console.log('✅ Beyond Brain.fm SW: Activado correctamente');
        
      } catch (error) {
        console.error('❌ Error durante activación SW:', error);
      }
    })()
  );
});

// ==========================================
// ESTRATEGIA DE CACHE: Network First con Cache Fallback
// ==========================================
self.addEventListener('fetch', event => {
  // Solo interceptar requests GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip requests externos no esenciales
  if (event.request.url.includes('analytics') || 
      event.request.url.includes('gtag') ||
      event.request.url.includes('facebook') ||
      event.request.url.includes('twitter')) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Estrategia Network First - intentar red primero
        const networkResponse = await fetch(event.request);
        
        // Si la respuesta es buena, cachearla para uso futuro
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone()).catch(() => {
            // Ignorar errores de cache silenciosamente
          });
        }
        
        return networkResponse;
        
      } catch (error) {
        console.log('🌐 Red no disponible, usando cache para:', event.request.url);
        
        // Si falla la red, intentar cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si es navegación (HTML) y no hay cache, mostrar página offline
        if (event.request.destination === 'document') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        
        // Como último recurso, crear respuesta básica
        return new Response(
          '🔌 Sin conexión. Beyond Brain.fm necesita conexión inicial.',
          { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }
        );
      }
    })()
  );
});

// ==========================================
// NOTIFICACIONES PUSH (para funcionalidad futura)
// ==========================================
self.addEventListener('push', event => {
  console.log('🔔 Push notification recibida');
  
  const options = {
    body: event.data ? event.data.text() : '¡Es hora de tu sesión de audio neurológico!',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'beyond-brainfm-reminder',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir App'
      },
      {
        action: 'dismiss', 
        title: 'Descartar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Beyond Brain.fm', options)
  );
});

// ==========================================
// HANDLE CLICK EN NOTIFICACIONES
// ==========================================
self.addEventListener('notificationclick', event => {
  console.log('🔔 Click en notificación:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        return self.clients.openWindow('/');
      })
    );
  }
});

// ==========================================
// BACKGROUND SYNC (para funcionalidad futura)
// ==========================================
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'session-sync') {
    event.waitUntil(
      // Aquí podrías sincronizar datos de sesiones cuando haya conexión
      syncSessionData()
    );
  }
});

async function syncSessionData() {
  try {
    console.log('📊 Sincronizando datos de sesiones...');
    // Implementar lógica de sync si es necesario
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error sincronizando datos:', error);
    throw error;
  }
}

// ==========================================
// MENSAJE DEL SERVICE WORKER
// ==========================================
self.addEventListener('message', event => {
  console.log('💬 Mensaje recibido en SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🧠 Beyond Brain.fm Service Worker cargado correctamente');