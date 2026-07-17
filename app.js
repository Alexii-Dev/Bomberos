(() => {
  const root = document.documentElement;
  const STORAGE_KEY = "splectron-demo-state-v2";
  const THEME_KEY = "splectron-theme-v2";
  const routes = ["central", "operacional", "despacho", "cuartel", "confirmacion"];

  const defaultState = () => ({
    incident: null,
    status: "Sin registrar",
    stationAvailable: true,
    activity: [
      { time: currentTime(), code: "DEMO", text: "Demostración local iniciada." }
    ]
  });

  function currentTime() {
    return new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function readState() {
    try {
      return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return defaultState();
    }
  }

  let state = readState();
  let dispatchSeconds = 0;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderDynamicData();
  }

  function addActivity(code, text) {
    state.activity.unshift({ time: currentTime(), code, text });
    state.activity = state.activity.slice(0, 8);
  }

  function setRoute(route) {
    if (!routes.includes(route)) route = "central";
    document.querySelectorAll("[data-screen]").forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === route));
    document.querySelectorAll("[data-route]").forEach((link) => {
      const active = link.dataset.route === route;
      link.classList.toggle("active", active);
      link.setAttribute("aria-current", active ? "page" : "false");
    });
    if (location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
    const names = { central: "Central de Alarmas", operacional: "Panel Operacional", despacho: "Despacho", cuartel: "Cuartel", confirmacion: "Confirmación" };
    document.title = `SPLECTRON — ${names[route]}`;
    window.scrollTo({ top: 0, behavior: "instant" });
    renderDynamicData();
  }

  window.addEventListener("hashchange", () => setRoute(location.hash.slice(1) || "central"));

  function updateClock() {
    const el = document.getElementById("clock");
    if (el) el.textContent = currentTime();
  }
  updateClock();
  setInterval(updateClock, 1000);

  function applyTheme(theme) {
    theme = theme === "dark" ? "dark" : "light";
    root.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const label = document.getElementById("theme-label");
    if (label) label.textContent = theme === "dark" ? "Claro" : "Oscuro";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111316" : "#ffffff");
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  document.getElementById("theme-toggle")?.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));

  const toast = document.getElementById("toast");
  function showToast(title, message) {
    if (!toast) return;
    toast.querySelector("strong").textContent = title;
    toast.querySelector("small").textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__splectronToast);
    window.__splectronToast = setTimeout(() => toast.classList.remove("show"), 3500);
  }
  toast?.querySelector("button")?.addEventListener("click", () => toast.classList.remove("show"));

  const form = document.getElementById("emergency-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.incident = {
      id: "10-0-1",
      type: document.getElementById("incident-type").value,
      address: document.getElementById("incident-address").value.trim(),
      reference: document.getElementById("incident-reference").value.trim(),
      caller: document.getElementById("caller-name").value.trim(),
      phone: document.getElementById("caller-phone").value.trim(),
      createdAt: currentTime()
    };
    state.status = "Pendiente de despacho";
    dispatchSeconds = 0;
    addActivity(state.incident.id, "Emergencia registrada y enviada a revisión de despacho.");
    saveState();
    showToast("Emergencia registrada", "Ahora puede revisar la unidad sugerida.");
    location.hash = "despacho";
  });

  document.getElementById("incident-address")?.addEventListener("input", (event) => {
    const address = event.target.value || "Ubicación sin especificar";
    const mapAddress = document.getElementById("map-address");
    if (mapAddress) mapAddress.textContent = address;
  });

  document.getElementById("center-map")?.addEventListener("click", () => {
    const map = document.getElementById("map-canvas");
    map?.classList.remove("pulse");
    requestAnimationFrame(() => map?.classList.add("pulse"));
    showToast("Mapa centrado", "El marcador del incidente está visible.");
  });

  document.getElementById("dispatch-button")?.addEventListener("click", (event) => {
    if (!state.incident) {
      showToast("Faltan datos", "Primero registre una emergencia en Central.");
      location.hash = "central";
      return;
    }
    state.status = "Despachado";
    state.dispatchedAt = currentTime();
    addActivity("B-1", `Primera Compañía despachada hacia ${state.incident.address}.`);
    saveState();
    event.currentTarget.disabled = true;
    event.currentTarget.innerHTML = 'Despacho registrado <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
    showToast("Despacho confirmado", "Primera Compañía fue asignada correctamente.");
    setTimeout(() => { location.hash = "confirmacion"; }, 700);
  });

  document.getElementById("station-toggle")?.addEventListener("change", (event) => {
    state.stationAvailable = event.target.checked;
    addActivity("1ª", state.stationAvailable ? "Cuartel marcado como operativo." : "Cuartel marcado fuera de servicio.");
    saveState();
    showToast(state.stationAvailable ? "Cuartel operativo" : "Cuartel desactivado", state.stationAvailable ? "Puede recibir nuevos despachos." : "No recibirá nuevos despachos.");
  });

  document.getElementById("confirm-departure")?.addEventListener("click", () => {
    if (!state.incident || state.status !== "Despachado") {
      showToast("Sin despacho activo", "Primero confirme el despacho desde la Central.");
      return;
    }
    state.status = "Unidad en ruta";
    addActivity("B-1", `Salida confirmada. OBAC: ${document.getElementById("obac-select").value}.`);
    saveState();
    showToast("Salida confirmada", "La unidad B-1 figura ahora en ruta.");
  });

  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { location.hash = button.dataset.go; }));

  document.getElementById("new-incident")?.addEventListener("click", () => {
    state.incident = null;
    state.status = "Sin registrar";
    dispatchSeconds = 0;
    addActivity("DEMO", "Formulario preparado para una nueva emergencia.");
    saveState();
    form?.reset();
    document.getElementById("incident-type").value = "Incendio estructural";
    document.getElementById("incident-address").value = "Av. Providencia 1234, Providencia";
    document.getElementById("incident-reference").value = "Humo visible desde un departamento, piso 7";
    document.getElementById("caller-name").value = "María González";
    document.getElementById("caller-phone").value = "+56 9 1234 5678";
    location.hash = "central";
  });

  document.getElementById("reset-demo")?.addEventListener("click", () => {
    if (!confirm("¿Reiniciar todos los datos de esta demostración local?")) return;
    state = defaultState();
    dispatchSeconds = 0;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.hash = "central";
    renderDynamicData();
    showToast("Demostración reiniciada", "Todos los datos locales fueron eliminados.");
  });

  document.getElementById("refresh-operational")?.addEventListener("click", () => {
    renderDynamicData();
    showToast("Panel actualizado", "Los datos locales están al día.");
  });

  function renderDynamicData() {
    const incident = state.incident;
    const safe = (value, fallback = "Sin información") => value || fallback;

    document.getElementById("dispatch-type").textContent = safe(incident?.type, "Sin emergencia registrada");
    document.getElementById("dispatch-address").textContent = safe(incident?.address);
    document.getElementById("dispatch-reference").textContent = safe(incident?.reference);
    document.getElementById("dispatch-caller").textContent = safe(incident?.caller);
    document.getElementById("stat-incidents").textContent = incident ? "1" : "0";
    document.getElementById("operation-marker-label").textContent = incident ? `${incident.id} · ${incident.type}` : "Sin incidentes";

    const dispatchButton = document.getElementById("dispatch-button");
    if (dispatchButton) {
      const done = ["Despachado", "Unidad en ruta"].includes(state.status);
      dispatchButton.disabled = done;
      dispatchButton.innerHTML = done
        ? 'Despacho registrado <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>'
        : 'Despachar B-1 <svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>';
    }

    const list = document.getElementById("incident-list");
    if (list) {
      list.innerHTML = incident
        ? `<button class="incident-card" type="button" data-open-incident><i></i><span><strong>${escapeHTML(incident.id)} · ${escapeHTML(incident.type)}</strong><small>${escapeHTML(incident.address)} · ${escapeHTML(state.status)}</small></span><time>${escapeHTML(incident.createdAt)}</time></button>`
        : '<div class="empty-state">Todavía no hay emergencias registradas en esta demostración.</div>';
      list.querySelector("[data-open-incident]")?.addEventListener("click", () => { location.hash = state.status === "Pendiente de despacho" ? "despacho" : "confirmacion"; });
    }

    const activityList = document.getElementById("activity-list");
    if (activityList) {
      activityList.innerHTML = state.activity.map((item) => `<div class="activity-row"><time>${escapeHTML(item.time)}</time><strong>${escapeHTML(item.code)}</strong><span>${escapeHTML(item.text)}</span></div>`).join("");
    }

    const stationToggle = document.getElementById("station-toggle");
    if (stationToggle) stationToggle.checked = state.stationAvailable;

    const alert = document.getElementById("station-alert");
    if (alert) {
      const active = incident && ["Despachado", "Unidad en ruta"].includes(state.status);
      alert.classList.toggle("active", !!active);
      alert.querySelector("strong").textContent = active ? `Despacho activo · ${incident.type}` : "Sin despacho pendiente";
      alert.querySelector("small").textContent = active ? `${incident.address} · Estado: ${state.status}` : "El cuartel se encuentra disponible.";
    }

    const confirmation = document.getElementById("confirmation-message");
    if (confirmation) confirmation.textContent = incident ? `La Primera Compañía fue asignada al incidente en ${incident.address}.` : "Todavía no existe un despacho en esta demostración.";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  setInterval(() => {
    if (state.incident && state.status === "Pendiente de despacho") dispatchSeconds += 1;
    const timer = document.getElementById("dispatch-timer");
    if (timer) timer.textContent = `${String(Math.floor(dispatchSeconds / 60)).padStart(2, "0")}:${String(dispatchSeconds % 60).padStart(2, "0")}`;
  }, 1000);

  setRoute(location.hash.slice(1) || "central");
})();
