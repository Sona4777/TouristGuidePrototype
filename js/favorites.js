// js/favorites.js
// Favorites page logic with simple auth-guard and per-user favorites storage.

// Map and marker state
let favMap;
let favMarkers = [];

// Utility: get the current storage key for favorites
function _favoritesKey() {
  try {
    if (window.TGAuth && typeof window.TGAuth.getLogged === 'function') {
      const email = window.TGAuth.getLogged();
      if (email) return `favorites_${email.toLowerCase()}`;
    }
  } catch (e) {
    // ignore
  }
  // fallback legacy key
  return 'favorites';
}

// Read favorites from localStorage (returns array of id strings)
function getFavorites() {
  const key = _favoritesKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    // normalize to array of strings
    return Array.isArray(arr) ? arr.map(x => String(x)) : [];
  } catch (e) {
    console.error('favorites: failed to read favorites', e);
    return [];
  }
}

// Write favorites array (array of id-strings) to localStorage
function saveFavorites(arr) {
  const key = _favoritesKey();
  try {
    localStorage.setItem(key, JSON.stringify(arr));
    // also notify other tabs
    window.dispatchEvent(new Event('favorites:changed'));
  } catch (e) {
    console.error('favorites: failed to save favorites', e);
  }
}

// Protect page: if not signed in, redirect to index.html with flag to open modal
function ensureSignedInOrRedirect() {
  try {
    if (window.TGAuth && typeof window.TGAuth.getLogged === 'function') {
      const email = window.TGAuth.getLogged();
      if (!email) {
        // redirect to home and auto-open login
        window.location.href = '/index.html?showLogin=1';
        return false;
      }
      return true;
    } else {
      // TGAuth not available (defensive) — continue but use fallback key
      return true;
    }
  } catch (e) {
    console.error('favorites: auth check failed', e);
    return true;
  }
}

// Render favorites list (cards)
function renderFavoritesList() {
  const container = document.getElementById('favorites-list');
  if (!container) return;

  // If not signed in, redirect
  if (!ensureSignedInOrRedirect()) return;

  container.innerHTML = '';

  const favIds = getFavorites();
  if (!Array.isArray(favIds) || favIds.length === 0) {
    container.innerHTML = '<p>You have no favorites yet. Add some from the attraction details!</p>';
    // clear map if exists
    if (favMap) {
      favMap.remove();
      favMap = null;
      favMarkers = [];
    }
    return;
  }

  // defensive: ensure attractions array exists
  if (typeof attractions === 'undefined' || !Array.isArray(attractions)) {
    container.innerHTML = '<p>Loading attractions... please wait.</p>';
    return;
  }

  // find attraction objects for favorites — compare ids as strings
  const favAttractions = attractions.filter(a => favIds.includes(String(a.id)));

  if (favAttractions.length === 0) {
    container.innerHTML = '<p>Your favorites are currently not available.</p>';
    if (favMap) { favMap.remove(); favMap = null; favMarkers = []; }
    return;
  }

  favAttractions.forEach(attraction => {
    const card = document.createElement('div');
    card.className = 'attraction-card';
    card.innerHTML = `
      <h3>${attraction.title}</h3>
      <p>${attraction.city}</p>
      <img src="${attraction.image}" alt="${attraction.title}" width="200">
      <p>Rating: ${attraction.rating}</p>
      <a href="attraction.html?id=${attraction.id}">View Details</a>
      <button class="remove-fav" data-id="${attraction.id}">Remove</button>
    `;
    container.appendChild(card);
  });

  // attach remove handlers
  container.querySelectorAll('.remove-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      removeFavorite(id);
    });
  });
}

// Remove favorite by id (id may be number or string)
function removeFavorite(id) {
  if (typeof id === 'undefined' || id === null) return;
  let favs = getFavorites();
  favs = favs.filter(fid => String(fid) !== String(id));
  saveFavorites(favs);
  renderFavoritesList();
  renderFavoritesMap(); // update map
}

// Initialize / render map with favorite markers
function renderFavoritesMap() {
  const favIds = getFavorites();
  if (!favIds || favIds.length === 0) {
    if (favMap) { favMap.remove(); favMap = null; favMarkers = []; }
    return;
  }

  // defensive: ensure attractions exist
  if (typeof attractions === 'undefined' || !Array.isArray(attractions)) return;

  const favAttractions = attractions.filter(a => favIds.includes(String(a.id)));

  // if no attractions matched, clear map
  if (favAttractions.length === 0) {
    if (favMap) { favMap.remove(); favMap = null; favMarkers = []; }
    return;
  }

  // Create map if not exists
  if (favMap) {
    // remove existing markers
    favMarkers.forEach(m => {
      try { favMap.removeLayer(m); } catch (e) {}
    });
    favMarkers = [];
  } else {
    const mapEl = document.getElementById('favorites-map');
    if (!mapEl) return; // no map container in DOM
    favMap = L.map('favorites-map').setView([10.8505, 76.2711], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(favMap);
  }

  // add markers and collect latlngs for bounds
  const latlngs = [];
  favAttractions.forEach(attraction => {
    try {
      const marker = L.marker([attraction.lat, attraction.lng]).addTo(favMap)
        .bindPopup(`<b>${attraction.title}</b><br>${attraction.city}`);
      favMarkers.push(marker);
      latlngs.push([attraction.lat, attraction.lng]);
    } catch (e) {
      console.warn('favorites: skipping invalid lat/lng for', attraction);
    }
  });

  if (latlngs.length === 1) {
    favMap.setView(latlngs[0], 12);
  } else if (latlngs.length > 1) {
    favMap.fitBounds(latlngs, { padding: [50, 50] });
  }
}

// Entry point after data.js loads attractions
function initFavoritesPage() {
  // Protect page: if not signed in, redirect (ensureSignedInOrRedirect will handle redirect)
  if (!ensureSignedInOrRedirect()) return;

  renderFavoritesList();
  renderFavoritesMap();
}

// Wait for attractions to be available (data.js loads it)
const favInterval = setInterval(() => {
  if (typeof attractions !== 'undefined' && Array.isArray(attractions) && attractions.length > 0) {
    initFavoritesPage();
    clearInterval(favInterval);
  }
}, 100);

// Also handle storage changes (in case user removes favorites in another tab)
window.addEventListener('storage', (e) => {
  // detect both per-user key and legacy key changes
  if ((e.key && e.key.startsWith('favorites')) || e.key === null) {
    if (typeof attractions !== 'undefined' && Array.isArray(attractions) && attractions.length > 0) {
      renderFavoritesList();
      renderFavoritesMap();
    }
  }
});

// also listen for our custom favorites event (saveFavorites dispatches this)
window.addEventListener('favorites:changed', () => {
  if (typeof attractions !== 'undefined' && Array.isArray(attractions) && attractions.length > 0) {
    renderFavoritesList();
    renderFavoritesMap();
  }
});
