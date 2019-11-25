// js/main.js
let map;

function initPage() {
    displayAttractions(attractions);
    loadMap(attractions);
    setupSearch();
}

// Display attraction cards
function displayAttractions(list) {
    const container = document.getElementById('attraction-list');
    container.innerHTML = '';
    list.forEach(attraction => {
        const card = document.createElement('div');
        card.className = 'attraction-card';
        card.innerHTML = `
            <h3>${attraction.title}</h3>
            <p>${attraction.city}</p>
            <img src="${attraction.image}" alt="${attraction.title}" width="200">
            <p>Rating: ${attraction.rating}</p>
            <a href="attraction.html?id=${attraction.id}">View Details</a>
        `;
        container.appendChild(card);
    });
}

// Initialize map and markers
function loadMap(list) {
    if (!list || list.length === 0) return;

    if (map) {
        map.remove();
    }

    map = L.map('map').setView([10.8505, 76.2711], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    list.forEach(attraction => {
        L.marker([attraction.lat, attraction.lng])
            .addTo(map)
            .bindPopup(`<b>${attraction.title}</b><br>${attraction.city}`);
    });
}

// Search filter
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        const filtered = attractions.filter(a =>
            a.title.toLowerCase().includes(term) || a.city.toLowerCase().includes(term)
        );
        displayAttractions(filtered);
        loadMap(filtered);
    });
}

/* ---------------------------
   Authentication UI wiring
   - uses window.TGAuth provided by js/login.js
   - shows/hides Login / Logout / userBadge in header
   - listens for `tg:authchange` custom event
--------------------------- */

(function authUI() {
    const loginToggle = document.querySelector('#loginToggle');
    const logoutBtn = document.querySelector('#logoutBtn');
    const userBadge = document.querySelector('#userBadge');
    const userNameEl = document.querySelector('#userName');

    // Defensive: TGAuth may not yet be defined when this script runs.
    // refreshUI handles that by checking availability and wiring an event
    function refreshUI() {
        const TG = window.TGAuth;
        if (!TG) {
            // If TGAuth not ready, wait for it (one-time)
            const onReady = () => {
                window.removeEventListener('tg:authchange', onReady);
                refreshUI();
            };
            // Also listen to storage updates as a fallback
            window.addEventListener('tg:authchange', onReady, { once: true });
            return;
        }

        const email = TG.getLogged();
        if (email) {
            const users = TG.getUsers ? TG.getUsers() : [];
            const me = users.find(u => u.email.toLowerCase() === email.toLowerCase()) || { name: 'Traveler', email };
            if (userNameEl) userNameEl.textContent = me.name || 'Traveler';
            if (userBadge) userBadge.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (loginToggle) loginToggle.style.display = 'none';
        } else {
            if (userBadge) userBadge.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (loginToggle) loginToggle.style.display = 'inline-block';
        }
    }

    // Wire logout action
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.TGAuth && window.TGAuth.clearLogged) {
                window.TGAuth.clearLogged();
            } else {
                // fallback: clear localStorage key (defensive)
                localStorage.removeItem('tg_logged_in');
                window.dispatchEvent(new Event('tg:authchange'));
            }
            refreshUI();
        });
    }

    // If user clicked "Login" button in header, open modal (login.js provides the modal show handler)
    if (loginToggle) {
        loginToggle.addEventListener('click', (e) => {
            e.preventDefault();
            // login.js exposes modal via DOM; just trigger its button
            const overlay = document.querySelector('#loginOverlay');
            if (overlay && overlay.classList) {
                overlay.classList.add('show');
                overlay.setAttribute('aria-hidden', 'false');
                const emailEl = document.querySelector('#lg-email');
                if (emailEl) setTimeout(() => emailEl.focus(), 80);
            } else {
                // If login.js exposes API in future, prefer calling that.
                if (window.TGAuth && window.TGAuth.showLogin) window.TGAuth.showLogin();
            }
        });
    }

    // Listen to auth change event and refresh UI
    window.addEventListener('tg:authchange', refreshUI);

    // Also refresh on DOMContentLoaded in case a user is already signed in
    document.addEventListener('DOMContentLoaded', refreshUI);
})();

/* ---------------------------
   Initialize page when DOM ready
--------------------------- */
document.addEventListener('DOMContentLoaded', function () {
    initPage();
});

// --- Intercept favorites nav click: open login modal if not signed in ----------------
(function interceptFavoritesClick() {
  // Find the favorites link in the header nav (defensive selector)
  const favLink = document.querySelector('nav a[href="favorites.html"], nav a[href="./favorites.html"]');

  if (!favLink) return;

  favLink.addEventListener('click', function (e) {
    // Check auth (TGAuth if available, otherwise fallback to localStorage)
    const TG = window.TGAuth;
    const logged = (TG && typeof TG.getLogged === 'function') ? TG.getLogged() : localStorage.getItem('tg_logged_in');

    if (!logged) {
      // prevent default navigation and open login modal
      e.preventDefault();

      // remember where to go after login (sessionStorage so it clears on tab close)
      try { sessionStorage.setItem('tg_after_login', '/favorites.html'); } catch (err) { /* ignore */ }

      // open modal if present in DOM
      const overlay = document.querySelector('#loginOverlay');
      if (overlay) {
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        // focus email input
        setTimeout(() => {
          const emailEl = document.querySelector('#lg-email');
          if (emailEl) emailEl.focus();
        }, 80);
      } else {
        // fallback: redirect to home with flag so index auto-opens modal
        window.location.href = '/index.html?showLogin=1';
      }
    }
    // if logged in, allow normal navigation (do nothing)
  });
})();
