/* ============================================
   Vaultline — auth logic
   Storage: localStorage, key "vaultline_users"
   Passwords are SHA-256 hashed before storage.
   NOTE: this is a client-side demo. A real app
   must hash + verify passwords on a server
   (e.g. bcrypt/argon2 in Node/Express) — see the
   bottom of this file for how to swap that in.
   ============================================ */

const USERS_KEY = "vaultline_users";
const SESSION_KEY = "vaultline_session";

/* ---------- storage helpers ---------- */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }));
}

/* ---------- hashing (SHA-256 via SubtleCrypto) ---------- */
async function hashPassword(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- validation ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Okay", "Strong", "Very strong"];
const STRENGTH_COLORS = ["#f2735f", "#f2735f", "#f2b84b", "#5eead4", "#5eead4"];

/* ---------- small UI helpers ---------- */
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(inputId + "Error");
  if (!input || !errorEl) return;
  const field = input.closest(".field") || input.closest("form");
  if (message) {
    errorEl.textContent = message;
    if (field) field.classList.add("has-error");
  } else {
    errorEl.textContent = "";
    if (field) field.classList.remove("has-error");
  }
}

function showBanner(message, type) {
  const banner = document.getElementById("banner");
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
  banner.className = "banner " + (type || "");
}

function hideBanner() {
  const banner = document.getElementById("banner");
  if (banner) banner.hidden = true;
}

function setKeycardState(unlocked) {
  const card = document.getElementById("keycard");
  const status = document.getElementById("keycardStatus");
  if (!card || !status) return;
  card.classList.toggle("is-active", unlocked);
  status.textContent = unlocked ? "UNLOCKED" : "LOCKED";
  status.classList.toggle("unlocked", unlocked);
}

function setButtonLoading(button, isLoading, loadingText, restText) {
  if (!button) return;
  const label = button.querySelector(".btn-label");
  button.disabled = isLoading;
  if (label) label.textContent = isLoading ? loadingText : restText;
}

/* ---------- password visibility toggle ---------- */
document.querySelectorAll(".ghost-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.toggle;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

/* ============================================
   Register page
   ============================================ */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");
  const termsInput = document.getElementById("terms");
  const meterBars = document.querySelectorAll("#strengthMeter span");
  const strengthLabel = document.getElementById("strengthLabel");
  const submitBtn = document.getElementById("registerSubmit");

  passwordInput.addEventListener("input", () => {
    const score = scorePassword(passwordInput.value);
    meterBars.forEach((bar, i) => {
      bar.style.background = i < score ? STRENGTH_COLORS[score - 1] : "";
    });
    strengthLabel.textContent = passwordInput.value ? STRENGTH_LABELS[score] : "";
    strengthLabel.style.color = passwordInput.value ? STRENGTH_COLORS[score] : "";
    setKeycardState(score >= 3);
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    let hasError = false;

    if (name.length < 2) {
      setFieldError("name", "Enter your full name.");
      hasError = true;
    } else {
      setFieldError("name", "");
    }

    if (!EMAIL_RE.test(email)) {
      setFieldError("email", "Enter a valid email address.");
      hasError = true;
    } else if (getUsers()[email]) {
      setFieldError("email", "An account with this email already exists.");
      hasError = true;
    } else {
      setFieldError("email", "");
    }

    if (password.length < 8) {
      setFieldError("password", "Use at least 8 characters.");
      hasError = true;
    } else {
      setFieldError("password", "");
    }

    if (confirm !== password || confirm === "") {
      setFieldError("confirmPassword", "Passwords don't match.");
      hasError = true;
    } else {
      setFieldError("confirmPassword", "");
    }

    if (!termsInput.checked) {
      document.getElementById("termsError").textContent = "You must accept the terms to continue.";
      hasError = true;
    } else {
      document.getElementById("termsError").textContent = "";
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true, "Creating account…", "Create account");

    const passwordHash = await hashPassword(password);
    const users = getUsers();
    users[email] = { name, passwordHash, createdAt: Date.now() };
    saveUsers(users);
    setSession(email);

    showBanner("Account created. Redirecting you to sign in…", "success");
    setKeycardState(true);

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1100);
  });
}

/* ============================================
   Login page
   ============================================ */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("loginSubmit");
  const forgotLink = document.getElementById("forgotLink");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    let hasError = false;

    if (!EMAIL_RE.test(email)) {
      setFieldError("email", "Enter a valid email address.");
      hasError = true;
    } else {
      setFieldError("email", "");
    }

    if (!password) {
      setFieldError("password", "Enter your password.");
      hasError = true;
    } else {
      setFieldError("password", "");
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true, "Signing in…", "Sign in");

    const users = getUsers();
    const user = users[email];
    const attemptHash = await hashPassword(password);

    // Small delay so the loading state is visible — remove in production.
    await new Promise(r => setTimeout(r, 350));

    if (!user || user.passwordHash !== attemptHash) {
      setButtonLoading(submitBtn, false, "Signing in…", "Sign in");
      showBanner("Email or password is incorrect.", "error");
      setFieldError("password", " ");
      return;
    }

    setSession(email);
    setKeycardState(true);
    showBanner(`Welcome back, ${user.name.split(" ")[0]}.`, "success");
    setButtonLoading(submitBtn, false, "Signing in…", "Sign in");
  });

  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const users = getUsers();
    if (EMAIL_RE.test(email) && users[email]) {
      showBanner("This demo has no email server — but in a real app, a reset link would be sent now.", "");
    } else {
      showBanner("Enter the email on your account first, then click 'Forgot password?' again.", "");
    }
  });
}

/* ============================================
   Swapping in a real backend later
   ============================================
   Replace hashPassword() calls and the getUsers/
   saveUsers storage layer with fetch() calls to
   your API, e.g.:

   const res = await fetch("/api/register", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name, email, password })
   });

   Never hash passwords client-side for a real
   production app in place of server-side hashing
   (bcrypt/argon2) — client hashing alone does not
   protect against a stolen database, since the
   hash itself becomes the "password" an attacker
   needs. Do both: TLS in transit, real hashing
   with a salt on the server.
   ============================================ */
