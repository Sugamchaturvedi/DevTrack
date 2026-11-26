/**
 * DevTrack API Client
 * Centralized Fetch wrapper with JWT authentication and error handling
 */

// In Live Server (e.g. port 5501 / 5500) or file://, direct API requests to FastAPI backend on :8000
const isLocalDevHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const isExternalPort = isLocalDevHost && window.location.port && window.location.port !== "8000";
const isFileProtocol = window.location.protocol === "file:";
const API_BASE = (isExternalPort || isFileProtocol)
  ? "http://127.0.0.1:8000" 
  : window.location.origin;

const API = {
  getToken() {
    return localStorage.getItem("devtrack_token");
  },

  setToken(token) {
    if (token) {
      localStorage.setItem("devtrack_token", token);
    } else {
      localStorage.removeItem("devtrack_token");
    }
  },

  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    const headers = {
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        // Token expired or invalid
        this.setToken(null);
        if (!window.location.hash.includes("login") && !window.location.hash.includes("register")) {
          window.location.hash = "#/login";
        }
        const authErr = new Error("Session expired. Please log in again.");
        authErr.status = 401;
        authErr.endpoint = endpoint;
        throw authErr;
      }

      if (response.status === 204) {
        return null;
      }

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { detail: text || "Unexpected server response" };
      }

      if (!response.ok) {
        let msg = `Request failed (${response.status})`;
        if (typeof data.detail === "string") {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map(d => d.msg || "Validation error").join(", ");
        } else if (data.message) {
          msg = data.message;
        }
        const httpErr = new Error(msg);
        httpErr.status = response.status;
        httpErr.endpoint = endpoint;
        throw httpErr;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        const timeoutErr = new Error(`Request timed out on ${endpoint}`);
        timeoutErr.status = 408;
        timeoutErr.endpoint = endpoint;
        throw timeoutErr;
      }
      if (err.status === undefined) {
        err.status = 0;
        err.isNetworkError = true;
        err.endpoint = endpoint;
      }
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  formatErrorHtml(err, title = "Failed to load data", retryFnCall = "") {
    const status = err && typeof err.status === "number" ? err.status : 0;
    let badgeText = "ERROR";
    let hint = err && err.message ? err.message : "An unexpected error occurred.";

    if (status === 401) {
      badgeText = "401 UNAUTHORIZED";
      hint = `${hint} Please sign in again to refresh your session.`;
    } else if (status === 403) {
      badgeText = "403 ACCESS DENIED";
      hint = `${hint} You do not have permission to access this project's resources.`;
    } else if (status === 404) {
      badgeText = "404 NOT FOUND";
      hint = `API endpoint or resource not found (${err.endpoint || ""}). Verify the backend server is up to date and running.`;
    } else if (status >= 500) {
      badgeText = `${status} SERVER ERROR`;
      hint = `${hint} Please check the FastAPI backend logs and PostgreSQL connection.`;
    } else if (status === 408) {
      badgeText = "408 TIMEOUT";
    } else if (status === 0 || (err && err.isNetworkError)) {
      badgeText = "NETWORK ERROR";
      hint = `Unable to reach the backend server at ${API_BASE}. Ensure the FastAPI service is running.`;
    }

    const esc = (s) => (window.UI ? UI.escapeHtml(s) : String(s || ""));
    return `
      <div class="card" style="padding: 2rem; text-align: center; border: 1px solid var(--border-color);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
        <div style="margin-bottom: 0.5rem;">
          <span class="badge badge-danger">${esc(badgeText)}</span>
        </div>
        <h3 style="margin: 0 0 0.4rem 0; font-size: 1.05rem; color: var(--text-primary);">${esc(title)}</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 auto 1.25rem auto; max-width: 540px;">${esc(hint)}</p>
        <div style="display: flex; gap: 0.65rem; justify-content: center; flex-wrap: wrap;">
          ${retryFnCall ? `<button class="btn btn-primary btn-sm" onclick="${retryFnCall}">🔄 Retry</button>` : ""}
          ${status === 401 ? `<button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/login'">🔑 Sign In</button>` : ""}
        </div>
      </div>
    `;
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, v);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request(`${endpoint}${qs}`, { method: "GET" });
  },

  post(endpoint, data = {}, isFormData = false) {
    return this.request(endpoint, {
      method: "POST",
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  put(endpoint, data = {}, isFormData = false) {
    return this.request(endpoint, {
      method: "PUT",
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },

  async getProjects(forceRefresh = false) {
    if (window.App && typeof window.App.getProjects === "function") {
      return window.App.getProjects(forceRefresh);
    }
    const res = await this.get("/projects/");
    return Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : []);
  },
};

window.API = API;

// Early registration of App project repository to prevent uninitialized view calls
window.App = window.App || {};
window.App._cachedProjects = null;
window.App._cachedProjectsTime = 0;
window.App.getProjects = async function(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && window.App._cachedProjects && (now - window.App._cachedProjectsTime < 30000)) {
    return window.App._cachedProjects;
  }
  const res = await API.get("/projects/");
  const projects = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : []);
  window.App._cachedProjects = projects;
  window.App._cachedProjectsTime = now;
  return projects;
};
window.App.invalidateProjectsCache = function() {
  window.App._cachedProjects = null;
  window.App._cachedProjectsTime = 0;
};
