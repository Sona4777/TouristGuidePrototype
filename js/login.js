/* js/login.js
   Fake login / register for TouristGuidePrototype
   - Stores fake users in localStorage under 'tg_fake_users'
   - Stores current logged-in email under 'tg_logged_in'
   - Exposes window.TGAuth API
   - Adds Register mode inside the same modal
   - Auto-opens when URL contains ?showLogin=1 or #showLogin
*/

(function () {
  const qs = (s) => document.querySelector(s);

  // Elements (present in index.html)
  const overlay = qs('#loginOverlay');
  const loginToggle = qs('#loginToggle');
  const closeBtn = qs('#closeLogin');
  const signinBtn = qs('#signinBtn');
  const goRegisterBtn = qs('#goRegister');
  const emailInput = qs('#lg-email');
  const passInput = qs('#lg-password');
  const msg = qs('#loginMessage');

  // We'll create register fields dynamically when needed
  let registerMode = false;
  let nameInput = null;
  let createBtn = null;
  let backToSignInBtn = null;

  // LocalStorage helpers
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem('tg_fake_users') || '[]');
    } catch (e) {
      console.error('tg: failed to parse users', e);
      return [];
    }
  }
  function saveUsers(users) {
    localStorage.setItem('tg_fake_users', JSON.stringify(users));
  }
  function setLogged(email) {
    localStorage.setItem('tg_logged_in', email);
    window.dispatchEvent(new Event('tg:authchange'));
  }
  function getLogged() {
    return localStorage.getItem('tg_logged_in') || null;
  }
  function clearLogged() {
    localStorage.removeItem('tg_logged_in');
    window.dispatchEvent(new Event('tg:authchange'));
  }

  // Seed a demo user if none exist (makes first-run easier)
  (function seedDemo() {
    const users = getUsers();
    if (users.length === 0) {
      users.push({ name: 'Demo Traveler', email: 'demo@tourist.local', password: 'demo' });
      saveUsers(users);
    }
  })();

  // Simple validators
  function isValidEmail(s) {
    return /^\S+@\S+\.\S+$/.test(s);
  }
  function isStrongEnough(p) {
    return p && p.length >= 4;
  }

  // Show / hide modal
  function showLogin() {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    // ensure sign-in mode by default
    if (registerMode) toggleRegisterMode(false);
    // small delay to ensure focusable
    setTimeout(() => emailInput && emailInput.focus(), 80);
  }
  function hideLogin() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    msg.textContent = 'This is a fake login for demo purposes only.';
    msg.className = 'small muted';
    // clear inputs (but preserve email maybe)
    // emailInput.value = '';
    passInput.value = '';
    if (registerMode) toggleRegisterMode(false);
  }

  // Toggle register mode: true => show registration fields; false => login fields
  function toggleRegisterMode(enable) {
    if (enable === registerMode) return;
    registerMode = !!enable;

    // If enabling: add a name input at top and switch buttons
    if (registerMode) {
      // create name input
      const nameLabel = document.createElement('label');
      nameLabel.setAttribute('for', 'lg-name');
      nameLabel.textContent = 'Name';
      nameLabel.style.marginTop = '10px';

      nameInput = document.createElement('input');
      nameInput.id = 'lg-name';
      nameInput.type = 'text';
      nameInput.placeholder = 'Your name';
      nameInput.style.marginTop = '6px';
      nameInput.style.width = '100%';
      nameInput.style.padding = '10px 12px';
      nameInput.style.borderRadius = '8px';
      nameInput.style.border = '1px solid #e6e9ef';
      nameInput.autocomplete = 'name';

      // insert before email label (email label is the previous sibling of email input)
      const emailLabel = emailInput.previousElementSibling;
      emailLabel.parentNode.insertBefore(nameLabel, emailLabel);
      emailLabel.parentNode.insertBefore(nameInput, emailLabel);

      // replace signin/goRegister buttons with Create / Back buttons
      const actions = document.querySelector('.login-actions');
      // hide existing sign in and register buttons (we'll re-add when leaving register mode)
      actions.style.display = 'none';

      // create a new actions container for register mode
      const regActions = document.createElement('div');
      regActions.className = 'login-actions register-actions';
      regActions.style.marginTop = '12px';

      createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.textContent = 'Create account';
      createBtn.style.flex = '1';
      createBtn.style.padding = '10px';
      createBtn.style.borderRadius = '8px';
      createBtn.style.cursor = 'pointer';
      createBtn.style.fontWeight = '700';

      backToSignInBtn = document.createElement('button');
      backToSignInBtn.type = 'button';
      backToSignInBtn.textContent = 'Back to sign in';
      backToSignInBtn.className = 'ghost';
      backToSignInBtn.style.flex = '1';
      backToSignInBtn.style.padding = '10px';
      backToSignInBtn.style.borderRadius = '8px';
      backToSignInBtn.style.cursor = 'pointer';
      backToSignInBtn.style.fontWeight = '600';

      regActions.appendChild(createBtn);
      regActions.appendChild(backToSignInBtn);

      // insert regActions after the password input
      passInput.parentNode.insertBefore(regActions, passInput.nextSibling);

      // wire events
      createBtn.addEventListener('click', handleCreateAccount);
      backToSignInBtn.addEventListener('click', () => toggleRegisterMode(false));
      // focus name input
      setTimeout(() => nameInput.focus(), 60);
    } else {
      // leaving register mode: remove created DOM nodes and restore original actions
      const nameLabel = qs('label[for="lg-name"]');
      if (nameLabel) nameLabel.remove();
      if (nameInput) nameInput.remove();
      nameInput = null;

      const regActions = document.querySelector('.register-actions');
      if (regActions) regActions.remove();
      createBtn = null;
      backToSignInBtn = null;

      // show default actions again
      const actions = document.querySelector('.login-actions');
      if (actions) actions.style.display = 'flex';
      // focus email
      setTimeout(() => emailInput && emailInput.focus(), 60);
    }
  }

  // Sign-in handler
  function handleSignIn() {
    const email = (emailInput.value || '').trim();
    const pass = passInput.value || '';
    if (!isValidEmail(email)) {
      msg.textContent = 'Please enter a valid email address.';
      msg.className = 'error';
      return;
    }
    const users = getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      // Smooth demo: create a quick demo account and sign in
      const demoUser = { name: 'Traveler', email, password: pass || 'demo' };
      users.push(demoUser);
      saveUsers(users);
      setLogged(email);
      msg.textContent = 'No account found — demo account created and signed in.';
      msg.className = 'success';
      setTimeout(hideLogin, 400);
      return;
    }
    if (found.password !== pass) {
      msg.textContent = 'Incorrect password for that fake account.';
      msg.className = 'error';
      return;
    }
    // success
    setLogged(found.email);
    msg.textContent = 'Signed in (fake).';
    msg.className = 'success';
    setTimeout(hideLogin, 300);
  }

  // Registration handler (Create account)
  function handleCreateAccount() {
    const name = (nameInput && nameInput.value.trim()) || 'Traveler';
    const email = (emailInput.value || '').trim();
    const pass = passInput.value || '';

    if (!isValidEmail(email)) {
      msg.textContent = 'Please enter a valid email.';
      msg.className = 'error';
      return;
    }
    if (!isStrongEnough(pass)) {
      msg.textContent = 'Password must be at least 4 characters.';
      msg.className = 'error';
      return;
    }

    const users = getUsers();
    const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      msg.textContent = 'An account with that email already exists in this browser.';
      msg.className = 'error';
      return;
    }

    users.push({ name, email, password: pass });
    saveUsers(users);
    setLogged(email);
    msg.textContent = 'Account created and signed in (fake).';
    msg.className = 'success';
    setTimeout(hideLogin, 350);
  }

  // Event wiring
  if (loginToggle) loginToggle.addEventListener('click', showLogin);
  if (closeBtn) closeBtn.addEventListener('click', hideLogin);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideLogin();
    });
  }
  if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
  if (goRegisterBtn) goRegisterBtn.addEventListener('click', () => toggleRegisterMode(true));

  // Keyboard accessibility: Esc to close; Enter to submit when modal open
  document.addEventListener('keydown', (e) => {
    if (overlay && overlay.classList.contains('show')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideLogin();
      } else if (e.key === 'Enter') {
        // if register mode, pressing Enter triggers create; else sign-in
        if (registerMode) {
          if (createBtn) createBtn.click();
        } else {
          if (signinBtn) signinBtn.click();
        }
      }
    }
  });

  // Auto-open modal if URL contains ?showLogin=1 or #showLogin
  (function autoOpenCheck() {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('showLogin') === '1' || window.location.hash === '#showLogin') {
        // small timeout so the page can finish layout
        setTimeout(showLogin, 120);
      }
    } catch (e) {
      // ignore URL parsing errors in older browsers
    }
  })();

  // Expose TGAuth API for other scripts (main.js)
  window.TGAuth = {
    getUsers,
    saveUsers,
    getLogged,
    setLogged,
    clearLogged,
  };

  // Optional: refresh UI if someone else changes localStorage in another tab
  window.addEventListener('storage', (e) => {
    if (e.key === 'tg_logged_in') {
      window.dispatchEvent(new Event('tg:authchange'));
    }
  });
})();
