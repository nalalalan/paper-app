(() => {
  const STORAGE_KEY = "sarrus.auth.sha256.v1";
  const PASSWORD_HASH = "4dc690cb4ff3ac84b9366a931d40b66b6e518fa5deabc1c7b640070c797d843a";

  const emitAuthorized = () => {
    window.dispatchEvent(new CustomEvent("sarrus:authorized"));
  };

  const unlock = () => {
    const gate = document.querySelector(".auth-gate");
    if (gate) gate.remove();
    document.documentElement.classList.remove("auth-pending", "auth-locked");
    document.documentElement.classList.add("auth-unlocked");
    emitAuthorized();
  };

  const toHex = (buffer) => (
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );

  const digest = async (value) => {
    const encoded = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    return toHex(hash);
  };

  const renderGate = () => {
    document.documentElement.classList.remove("auth-pending");
    document.documentElement.classList.add("auth-locked");

    if (document.querySelector(".auth-gate")) return;

    const gate = document.createElement("section");
    gate.className = "auth-gate";
    gate.setAttribute("aria-label", "Password required");
    gate.innerHTML = `
      <form class="auth-panel" autocomplete="off">
        <h1>sarrus.aolabs.io</h1>
        <label for="sarrus-password">Password</label>
        <input id="sarrus-password" name="password" type="password" inputmode="numeric" autocomplete="current-password" required autofocus>
        <button type="submit">Enter</button>
        <p class="auth-error" aria-live="polite"></p>
      </form>
    `;

    gate.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = gate.querySelector("input");
      const error = gate.querySelector(".auth-error");
      const candidate = await digest(input.value.trim());
      if (candidate === PASSWORD_HASH) {
        localStorage.setItem(STORAGE_KEY, candidate);
        unlock();
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      input.value = "";
      input.focus();
      error.textContent = "Access denied.";
    });

    document.body.appendChild(gate);
    gate.querySelector("input").focus();
  };

  const boot = async () => {
    if (!window.crypto || !crypto.subtle) {
      renderGate();
      document.querySelector(".auth-error").textContent = "Secure browser context required.";
      return;
    }

    if (localStorage.getItem(STORAGE_KEY) === PASSWORD_HASH) {
      unlock();
      return;
    }

    renderGate();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
