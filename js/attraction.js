// attraction.js
function showToast(message, type = "success") {
    let toast = document.createElement("div");
    toast.className = `toast ${type}`; // type = "success" or "warning"
    toast.textContent = message;

    // Basic positioning: top center
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = type === "warning" ? "#e53e3e" : "#4CAF50";
    toast.style.color = "#fff";
    toast.style.padding = "0.7rem 1.2rem";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    toast.style.zIndex = 9999;
    toast.style.opacity = 0;
    toast.style.transition = "opacity 0.3s ease";

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => { toast.style.opacity = 1; }, 50);

    // Fade out & remove after 2s
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}


(function () {
  // ------------------------------
  // AUTH UI (keep your existing code)
  // ------------------------------
  (function authUI() {
    if (window.__tg_auth_ui_initialized) return;
    window.__tg_auth_ui_initialized = true;

    function initAuth() {
      const loginToggle = document.querySelector('#loginToggle');
      const logoutBtn = document.querySelector('#logoutBtn');
      const userBadge = document.querySelector('#userBadge');
      const userNameEl = document.querySelector('#userName');

      const favLinks = Array.from(document.querySelectorAll(
        'nav a[href="favorites.html"], nav a[href="./favorites.html"], nav a[href="/favorites.html"]'
      ));

      function normalizeEmail(e) { return e ? String(e).toLowerCase() : ''; }

      function refreshUI() {
        const TG = window.TGAuth;
        const rawEmail = (TG && typeof TG.getLogged === 'function') ? TG.getLogged() : localStorage.getItem('tg_logged_in');
        const email = normalizeEmail(rawEmail);
        const signedIn = !!email;

        if (signedIn) {
          if (userBadge) userBadge.style.display = 'inline-block';
          if (logoutBtn) logoutBtn.style.display = 'inline-block';
          if (loginToggle) loginToggle.style.display = 'none';

          if (userNameEl && TG && typeof TG.getUsers === 'function') {
            const users = TG.getUsers() || [];
            const me = users.find(u => normalizeEmail(u.email) === email) || { name: 'Traveler' };
            userNameEl.textContent = me.name || 'Traveler';
          }

          favLinks.forEach(a => { a.style.display = ''; a.removeAttribute('aria-hidden'); });
        } else {
          if (userBadge) userBadge.style.display = 'none';
          if (logoutBtn) logoutBtn.style.display = 'none';
          if (loginToggle) loginToggle.style.display = 'inline-block';

          favLinks.forEach(a => { a.style.display = 'none'; a.setAttribute('aria-hidden', 'true'); });
        }
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.TGAuth && typeof window.TGAuth.clearLogged === 'function') {
            window.TGAuth.clearLogged();
          } else {
            localStorage.removeItem('tg_logged_in');
          }
          window.dispatchEvent(new Event('tg:authchange'));
          refreshUI();
        });
      }

      if (loginToggle) {
        loginToggle.addEventListener('click', (e) => {
          e.preventDefault();
          const overlay = document.querySelector('#loginOverlay');
          if (overlay) {
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
            setTimeout(() => {
              const emailEl = document.querySelector('#lg-email');
              if (emailEl) emailEl.focus();
            }, 80);
          }
        });
      }

      window.addEventListener('tg:authchange', refreshUI);
      refreshUI();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAuth);
    } else {
      initAuth();
    }
  })();

  // ------------------------------
  // ATTRACTION DETAIL LOGIC
  // ------------------------------
  function initAttraction() {
    const detailsContainer = document.querySelector('#attraction-details');
    const mapContainer = document.querySelector('#map');

    if (!detailsContainer || !mapContainer) return;

    // get attraction id from query string
    const params = new URLSearchParams(window.location.search);
    const attractionId = params.get('id');

    if (!attractionId) {
      detailsContainer.innerHTML = '<p>Invalid attraction ID.</p>';
      return;
    }

    // wait until attractions data is loaded
    function render() {
      const attraction = attractions.find(a => String(a.id) === String(attractionId));
      if (!attraction) {
        detailsContainer.innerHTML = '<p>Attraction not found.</p>';
        return;
      }

      // render details
      detailsContainer.innerHTML = `
        <h2>${attraction.title}</h2>
        <div class="detail-row">
          <img src="${attraction.image}" alt="${attraction.title}" class="detail-image">
          <div class="detail-meta">
            <p><strong>Location:</strong> ${attraction.city}</p>
            <p><strong>Description:</strong> ${attraction.description}</p>
            <button id="favoriteBtn">Add to Favorites</button>
            <button id="directionsBtn">Get Directions</button>
          </div>
        </div>
      `;

      // initialize map
      const map = L.map(mapContainer).setView([attraction.lat, attraction.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.marker([attraction.lat, attraction.lng]).addTo(map)
        .bindPopup(attraction.title)
        .openPopup();

      const favoriteBtn = document.querySelector('#favoriteBtn');

      // Helper: replicate favorites.js key logic so both files use the same storage key
      function _favoritesKeyForCurrentUser() {
        try {
          if (window.TGAuth && typeof window.TGAuth.getLogged === 'function') {
            const email = window.TGAuth.getLogged();
            if (email) return `favorites_${String(email).toLowerCase()}`;
          }
        } catch (e) { /* ignore */ }
        // fallback legacy key (matches favorites.js fallback)
        return 'favorites';
      }

      function getLoggedIdentifier() {
        try {
          if (window.TGAuth && typeof window.TGAuth.getLogged === 'function') {
            return window.TGAuth.getLogged() || null;
          }
        } catch (e) { /* ignore */ }
        // fallback: your login might store tg_logged_in (string/email) or a JSON currentUser
        const raw = localStorage.getItem('tg_logged_in');
        if (raw) return raw;
        try {
          const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (cu && (cu.email || cu.id)) return cu.email || cu.id;
        } catch (e) { /* ignore */ }
        return null;
      }

      function addToFavorites(attractionId) {
        if (!attractionId) { showToast('Attraction id missing', 'warning'); return; }
        const logged = getLoggedIdentifier();
        if (!logged) { showToast('Please sign in to add favorites', 'warning'); return; }
        const key = _favoritesKeyForCurrentUser();
        let favs = [];
        try { favs = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { favs = []; }
        favs = Array.isArray(favs) ? favs.map(x => String(x)) : [];
        if (favs.includes(String(attractionId))) {
          showToast('Already in favorites', 'warning');
          return;
        }
        favs.push(String(attractionId));
        localStorage.setItem(key, JSON.stringify(favs));
        // notify listeners (favorites.js listens for storage and custom event)
        window.dispatchEvent(new Event('favorites:changed'));
        showToast('Added to favorites!');
        if (favoriteBtn) { favoriteBtn.textContent = 'Added'; favoriteBtn.disabled = true; }
      }

      if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
          const logged = getLoggedIdentifier();
          if (logged) {
            // pass the real id (from the loaded attraction object or the query param)
            addToFavorites(attraction.id || attractionId);
          } else {
            showToast('Please sign in to add favorites', 'warning');
          }
        });
      }


      // directions button handler
      const dirBtn = document.getElementById('directionsBtn');
      dirBtn.addEventListener('click', () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${attraction.lat},${attraction.lng}`, '_blank');
      });
    }

    // wait for attractions to load if not ready yet
    if (attractions.length === 0) {
      const checkInterval = setInterval(() => {
        if (attractions.length > 0) {
          clearInterval(checkInterval);
          render();
        }
      }, 50);
    } else {
      render();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAttraction);
  } else {
    initAttraction();
  }
})();
