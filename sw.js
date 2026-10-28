/* HEY! CHAR · service worker
 * ---------------------------------------------------------------------------
 * Hace que la app abra sin red y que se pueda instalar. Tres reglas:
 *
 *   0. La APP es /piloto.html. La landing (/) no se precarga: es la
 *      vidriera y se sirve siempre de la red.
 *   1. Navegacion (abrir una pagina): RED PRIMERO. Si hay internet, siempre
 *      ves la version mas nueva; si no hay, sale la guardada. Asi un deploy
 *      tuyo se ve enseguida y no queda nadie con una version vieja pegada.
 *   2. Estaticos (fuentes, imagenes, la libreria): CACHE PRIMERO, y se
 *      actualizan en segundo plano. Son los que hacen que abra instantaneo.
 *   3. La API y Supabase: NUNCA se cachean. Un brief o un canje de ticket
 *      servido desde cache seria una respuesta vieja presentada como nueva.
 *
 * Subir este archivo A LA RAIZ del repo. Si queda adentro de una carpeta,
 * solo controla esa carpeta y la app no funciona offline.
 *
 * Para publicar un cambio: subir el archivo nuevo y tocar VERSION abajo.
 * ------------------------------------------------------------------------- */

const VERSION = 'v1';
const CACHE_SHELL = `heychar-shell-${VERSION}`;
const CACHE_FUENTES = `heychar-fuentes-${VERSION}`;

// Inter y Playfair viven en Google. Son archivos fijos y versionados, asi que
// se pueden guardar sin riesgo: sin esto, offline la pagina se ve con la
// fuente del sistema y cambia de aspecto.
const DOMINIOS_FUENTES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Lo minimo para que la app abra sin red.
const PRECARGA = [
  // Solo el shell de la APP. La landing NO se precarga a proposito: es la
  // vidriera, vive en el navegador y siempre se quiere ver la version nueva.
  '/piloto.html',
  '/offline.html',
  '/supabase.js',
  '/manifest.json',
  '/favicon.ico',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/icon-maskable-512.png',
  '/img/apple-touch-icon.png',
  '/img/logo-mark-ink.png',
  '/img/logo-paper.png',
  '/fonts/WhyteInktrap-Regular.woff2',
  '/fonts/WhyteInktrap-Heavy.woff2'
];

// Clave de guardado. En nuestro dominio se descarta el ?query, para que
// "/" y "/?origen=app" sean la misma pagina. En dominios ajenos NO se
// descarta: en Google Fonts el ?family=... es justamente lo que distingue
// una fuente de otra, y sin el se pisarian entre si.
const clave = req => {
  const u = new URL(req.url);
  return u.origin === self.location.origin ? u.origin + u.pathname : u.href;
};

// Una respuesta "opaca" es la que vuelve de otro dominio sin permisos CORS:
// no se puede leer su contenido, pero si guardarla y volver a entregarla.
// Asi funcionan las fuentes de Google.
const sirve = r => !!r && (r.ok || r.type === 'opaque');

self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);
    // Uno por uno: si falta un archivo, no se cae toda la instalacion.
    await Promise.allSettled(PRECARGA.map(async ruta => {
      const destino = new URL(ruta, self.location.origin).href;
      const r = await fetch(destino, { cache: 'reload' });
      if (r.ok) await cache.put(destino, r.clone());
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const vigentes = [CACHE_SHELL, CACHE_FUENTES];
    const viejas = (await caches.keys()).filter(n => n.startsWith('heychar-') && !vigentes.includes(n));
    await Promise.all(viejas.map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function redPrimero(req) {
  const cache = await caches.open(CACHE_SHELL);
  try {
    const red = await fetch(req);
    if (red && red.ok) cache.put(clave(req), red.clone());
    return red;
  } catch (e) {
    const guardada = await cache.match(clave(req));
    if (guardada) return guardada;
    // Una pagina que nunca se visito: se avisa. Mostrar la home en su lugar
    // confunde, porque la direccion dice una cosa y la pantalla otra.
    return (await cache.match(self.location.origin + '/offline.html'))
        || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function cachePrimero(req, cual) {
  const cache = await caches.open(cual || CACHE_SHELL);
  const guardada = await cache.match(clave(req));
  // Si estaba, se devuelve ya y se refresca por detras para la proxima.
  const red = fetch(req).then(r => {
    if (sirve(r)) cache.put(clave(req), r.clone());
    return r;
  }).catch(() => null);
  if (guardada) return guardada;
  const r = await red;
  return r || new Response('', { status: 504 });
}

self.addEventListener('fetch', ev => {
  const req = ev.request;

  // Solo GET: un POST nunca se cachea ni se repite.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Las fuentes de Google si se guardan: son archivos fijos y sin ellas la
  // pagina cambia de aspecto cuando no hay red.
  if (DOMINIOS_FUENTES.includes(url.hostname)) {
    ev.respondWith(cachePrimero(req, CACHE_FUENTES));
    return;
  }

  // Cualquier otro dominio (Supabase, el Apps Script del formulario):
  // de largo, sin tocar. Que lo resuelva el navegador como siempre.
  if (url.origin !== self.location.origin) return;

  // La API genera briefs: su respuesta depende de quien pregunta y nunca
  // se reutiliza.
  if (url.pathname.startsWith('/api/')) return;

  // El video es grande y se pide por tramos (Range). Cachearlo a medias
  // rompe la reproduccion, asi que va siempre a la red.
  if (url.pathname.startsWith('/video/')) return;

  if (req.mode === 'navigate') {
    ev.respondWith(redPrimero(req));
    return;
  }

  ev.respondWith(cachePrimero(req));
});

// Por si alguna vez hay que desactivarlo desde la consola del navegador:
//   navigator.serviceWorker.controller.postMessage('limpiar')
self.addEventListener('message', ev => {
  if (ev.data === 'limpiar') {
    ev.waitUntil((async () => {
      for (const n of await caches.keys()) await caches.delete(n);
      await self.registration.unregister();
    })());
  }
});
