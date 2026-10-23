/**
 * TradeFox — Modern Paper Trading Auth Script
 * STRICT BACKEND API INTEGRATION (No simulated logins)
 * Connects directly to Spring Boot backend:
 *   - POST /api/auth/login
 *   - POST /api/auth/signup
 *   - GET  /api/market/quotes
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. DOM Elements
  // --------------------------------------------------------------------------
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeStatusText = document.getElementById('theme-status-text');

  // Tabs
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const tabSlider = document.getElementById('tab-slider');
  const panelLogin = document.getElementById('panel-login');
  const panelSignup = document.getElementById('panel-signup');
  const switchToSignup = document.getElementById('switch-to-signup');
  const switchToLogin = document.getElementById('switch-to-login');
  const socialBtnLabel = document.getElementById('social-btn-label');

  // Forms
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const signupSubmitBtn = document.getElementById('signup-submit-btn');

  // Inputs
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const signupName = document.getElementById('signup-name');
  const signupEmail = document.getElementById('signup-email');
  const signupPassword = document.getElementById('signup-password');

  // Password toggle & meter
  const togglePassButtons = document.querySelectorAll('.toggle-password');
  const passwordMeterWrap = document.getElementById('password-meter-wrap');
  const strengthText = document.getElementById('strength-text');
  const meterSegments = [
    document.getElementById('meter-1'),
    document.getElementById('meter-2'),
    document.getElementById('meter-3'),
    document.getElementById('meter-4')
  ];

  // Feedback & Toasts
  const formAlert = document.getElementById('form-alert');
  const toastContainer = document.getElementById('toast-container');
  const googleAuthBtn = document.getElementById('google-auth-btn');

  // Backend API Configuration
  // Uses same-origin /api when accessed via web server (proxying to 8080 without CORS issues),
  // or falls back to direct http://localhost:8080/api if opened directly as a file.
  const API_BASE_URL = window.location.protocol.startsWith('http') 
    ? '/api' 
    : 'http://localhost:8080/api';

  // --------------------------------------------------------------------------
  // 2. Theme Management (Light / Dark Mode)
  // --------------------------------------------------------------------------
  const STORAGE_KEY_THEME = 'tradefox_theme_pref';

  function applyTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (themeStatusText) {
      themeStatusText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlRoot.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme} theme`, 'info');
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY_THEME)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  initTheme();

  // --------------------------------------------------------------------------
  // 3. Tab Switching: Login vs Sign Up
  // --------------------------------------------------------------------------
  function switchTab(mode) {
    hideAlert();
    clearErrors();

    if (mode === 'signup') {
      tabLogin.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'false');
      tabSignup.classList.add('active');
      tabSignup.setAttribute('aria-selected', 'true');
      tabSlider.classList.add('slide-right');

      panelLogin.classList.add('hidden');
      panelSignup.classList.remove('hidden');

      if (socialBtnLabel) socialBtnLabel.textContent = 'Sign up with Google';
      signupName.focus();
    } else {
      tabSignup.classList.remove('active');
      tabSignup.setAttribute('aria-selected', 'false');
      tabLogin.classList.add('active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabSlider.classList.remove('slide-right');

      panelSignup.classList.add('hidden');
      panelLogin.classList.remove('hidden');

      if (socialBtnLabel) socialBtnLabel.textContent = 'Continue with Google';
      loginEmail.focus();
    }
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabSignup.addEventListener('click', () => switchTab('signup'));
  switchToSignup.addEventListener('click', () => switchTab('signup'));
  switchToLogin.addEventListener('click', () => switchTab('login'));

  if (window.location.hash === '#signup') {
    switchTab('signup');
  }

  // --------------------------------------------------------------------------
  // 4. Password Show / Hide Toggle
  // --------------------------------------------------------------------------
  togglePassButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');

      if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Password Strength Meter
  // --------------------------------------------------------------------------
  function evaluatePassword(pwd) {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  }

  function updateStrengthMeter(score) {
    const colors = [
      'var(--border-subtle)',
      '#EF4444', // Weak
      '#F59E0B', // Fair
      '#10B981', // Good
      '#00D09C'  // Strong
    ];
    const labels = [
      'Password strength',
      'Weak (add uppercase or numbers)',
      'Fair (add special symbol)',
      'Good password',
      'Strong & secure'
    ];

    meterSegments.forEach((seg, idx) => {
      if (idx < score) {
        seg.style.background = colors[score];
      } else {
        seg.style.background = 'var(--border-subtle)';
      }
    });

    strengthText.textContent = labels[score];
    strengthText.style.color = score > 0 ? colors[score] : 'var(--text-muted)';
  }

  signupPassword.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length > 0) {
      passwordMeterWrap.classList.add('active');
      const score = evaluatePassword(val);
      updateStrengthMeter(score);
    } else {
      passwordMeterWrap.classList.remove('active');
      updateStrengthMeter(0);
    }
  });

  // --------------------------------------------------------------------------
  // 6. Validation Helpers
  // --------------------------------------------------------------------------
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setError(inputElem, errorElem, message) {
    inputElem.classList.add('input-error');
    if (errorElem) {
      errorElem.textContent = message;
      errorElem.classList.add('visible');
    }
  }

  function clearError(inputElem, errorElem) {
    inputElem.classList.remove('input-error');
    if (errorElem) {
      errorElem.textContent = '';
      errorElem.classList.remove('visible');
    }
  }

  function clearErrors() {
    document.querySelectorAll('.form-input').forEach(input => input.classList.remove('input-error'));
    document.querySelectorAll('.field-error').forEach(err => {
      err.textContent = '';
      err.classList.remove('visible');
    });
  }

  [loginEmail, loginPassword, signupName, signupEmail, signupPassword].forEach(input => {
    input.addEventListener('input', () => {
      const errorElem = document.getElementById(`${input.id}-error`);
      clearError(input, errorElem);
      hideAlert();
    });
  });

  // --------------------------------------------------------------------------
  // 7. Alert Banner & Toast System
  // --------------------------------------------------------------------------
  function showAlert(message, type = 'error') {
    formAlert.textContent = message;
    formAlert.className = `form-alert ${type}`;
    formAlert.classList.remove('hidden');
  }

  function hideAlert() {
    formAlert.classList.add('hidden');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D09C" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EB5B56" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  }

  function setBtnLoading(btn, isLoading, defaultText) {
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');

    if (isLoading) {
      btn.disabled = true;
      if (btnText) btnText.textContent = 'Connecting to server...';
      if (spinner) spinner.classList.remove('hidden');
    } else {
      btn.disabled = false;
      if (btnText) btnText.textContent = defaultText;
      if (spinner) spinner.classList.add('hidden');
    }
  }

  // Parse backend error messages according to Spring Boot formats
  async function parseBackendError(response) {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
        const json = await response.json();
        return json.detail || json.message || json.error || `Error ${response.status}: ${response.statusText}`;
      } else {
        const text = await response.text();
        return text || `Error ${response.status}: ${response.statusText}`;
      }
    } catch {
      return `Error ${response.status}: ${response.statusText}`;
    }
  }

  // --------------------------------------------------------------------------
  // 8. Strict Backend Integration: Login
  // --------------------------------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    clearErrors();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    let hasError = false;

    if (!email) {
      setError(loginEmail, document.getElementById('login-email-error'), 'Please enter your email address');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setError(loginEmail, document.getElementById('login-email-error'), 'Enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setError(loginPassword, document.getElementById('login-password-error'), 'Please enter your password');
      hasError = true;
    }

    if (hasError) return;

    setBtnLoading(loginSubmitBtn, true, 'Log In to TradeFox');

    try {
      // Call actual Spring Boot backend AuthApi endpoint
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store actual JWT token and user info from Spring Boot backend
        if (data.token) {
          localStorage.setItem('tradefox_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('tradefox_user', JSON.stringify(data.user));
        }

        const userName = data.user?.name || email.split('@')[0];
        showAlert(`Login successful! Redirecting to TradeFox Terminal...`, 'success');
        showToast(`Welcome back, ${userName}! Opening terminal...`, 'success');

        loginPassword.value = '';

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 900);
      } else if (response.status === 401 || response.status === 400) {
        const errMsg = await parseBackendError(response);
        setError(loginPassword, document.getElementById('login-password-error'), errMsg);
        showAlert(errMsg, 'error');
        showToast(errMsg, 'error');
      } else {
        const errMsg = await parseBackendError(response);
        showAlert(errMsg, 'error');
        showToast(errMsg, 'error');
      }
    } catch (networkError) {
      // Direct, honest report that backend is not reachable. NO simulated login.
      console.error('Failed to connect to backend server at ' + API_BASE_URL, networkError);
      const offlineMsg = `Cannot connect to TradeFox backend at ${API_BASE_URL}. Please ensure the Spring Boot server is running on port 8080.`;
      showAlert(offlineMsg, 'error');
      showToast('Connection failed: Spring Boot server offline at port 8080.', 'error');
    } finally {
      setBtnLoading(loginSubmitBtn, false, 'Log In to TradeFox');
    }
  });

  // --------------------------------------------------------------------------
  // 9. Strict Backend Integration: Sign Up
  // --------------------------------------------------------------------------
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    clearErrors();

    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    let hasError = false;

    if (!name) {
      setError(signupName, document.getElementById('signup-name-error'), 'Please enter your full name');
      hasError = true;
    } else if (name.length < 2) {
      setError(signupName, document.getElementById('signup-name-error'), 'Name must be at least 2 characters');
      hasError = true;
    }

    if (!email) {
      setError(signupEmail, document.getElementById('signup-email-error'), 'Please enter your email address');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setError(signupEmail, document.getElementById('signup-email-error'), 'Enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setError(signupPassword, document.getElementById('signup-password-error'), 'Please enter a password');
      hasError = true;
    } else if (password.length < 8) {
      setError(signupPassword, document.getElementById('signup-password-error'), 'Password must be between 8 and 72 characters');
      hasError = true;
    } else if (password.length > 72) {
      setError(signupPassword, document.getElementById('signup-password-error'), 'Password cannot exceed 72 characters');
      hasError = true;
    }

    if (hasError) return;

    setBtnLoading(signupSubmitBtn, true, 'Create Free Paper Account');

    try {
      // Call actual Spring Boot backend AuthApi endpoint
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (response.status === 201 || response.ok) {
        const data = await response.json();
        
        // Store actual JWT token and user info from Spring Boot backend
        if (data.token) {
          localStorage.setItem('tradefox_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('tradefox_user', JSON.stringify(data.user));
        }

        showAlert(`Account created successfully! ₹10,00,000 virtual balance credited. Opening terminal...`, 'success');
        showToast(`Welcome to TradeFox, ${name}! Your account is active.`, 'success');

        signupPassword.value = '';

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 900);
      } else if (response.status === 409) {
        // Conflict: Email already registered
        const errMsg = await parseBackendError(response);
        setError(signupEmail, document.getElementById('signup-email-error'), errMsg || 'Email is already registered');
        showAlert(errMsg || 'Email is already registered. Please log in.', 'error');
        showToast(errMsg || 'Email is already registered.', 'error');
      } else if (response.status === 400) {
        const errMsg = await parseBackendError(response);
        showAlert(errMsg, 'error');
        showToast(errMsg, 'error');
      } else {
        const errMsg = await parseBackendError(response);
        showAlert(errMsg, 'error');
        showToast(errMsg, 'error');
      }
    } catch (networkError) {
      // Direct, honest report that backend is not reachable. NO simulated signup.
      console.error('Failed to connect to backend server at ' + API_BASE_URL, networkError);
      const offlineMsg = `Cannot connect to TradeFox backend at ${API_BASE_URL}. Please ensure the Spring Boot server is running on port 8080.`;
      showAlert(offlineMsg, 'error');
      showToast('Connection failed: Spring Boot server offline at port 8080.', 'error');
    } finally {
      setBtnLoading(signupSubmitBtn, false, 'Create Free Paper Account');
    }
  });

  // --------------------------------------------------------------------------
  // 10. Real Market Quotes Integration from /api/market/quotes
  // --------------------------------------------------------------------------
  async function fetchLiveMarketQuotes() {
    try {
      const response = await fetch(`${API_BASE_URL}/market/quotes`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const status = await response.json();
        if (status && status.indices) {
          // If the backend has live quotes from IndstocksMarketDataService, update the ticker
          updateTickerDisplay(status.indices);
        }
      }
    } catch {
      // Backend not running or market data not available; keep default ticker
    }
  }

  function updateTickerDisplay(indices) {
    if (!indices || typeof indices !== 'object') return;
    
    // Check for Nifty
    if (indices['NIFTY 50']) {
      const nifty = indices['NIFTY 50'];
      const elem = document.querySelector('.market-ticker-item:nth-child(1)');
      if (elem && nifty.lastPrice) {
        elem.querySelector('.ticker-val').textContent = Number(nifty.lastPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
    }
    // Check for Bank Nifty
    if (indices['BANK NIFTY']) {
      const bank = indices['BANK NIFTY'];
      const elem = document.querySelector('.market-ticker-item:nth-child(2)');
      if (elem && bank.lastPrice) {
        elem.querySelector('.ticker-val').textContent = Number(bank.lastPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
    }
    // Check for Sensex
    if (indices['SENSEX']) {
      const sensex = indices['SENSEX'];
      const elem = document.querySelector('.market-ticker-item:nth-child(3)');
      if (elem && sensex.lastPrice) {
        elem.querySelector('.ticker-val').textContent = Number(sensex.lastPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
    }
  }

  // Poll real market quotes every 10 seconds if backend is up
  fetchLiveMarketQuotes();
  setInterval(fetchLiveMarketQuotes, 10000);

  // --------------------------------------------------------------------------
  // 11. Social Login & Forgot Password Placeholders
  // --------------------------------------------------------------------------
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', () => {
      showToast('Google OAuth is configured as an SSO placeholder.', 'info');
    });
  }

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Please contact your administrator or enter your email to request a reset.', 'info');
    });
  }
});
