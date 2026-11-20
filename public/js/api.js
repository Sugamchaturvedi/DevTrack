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
        throw new Error("Session expired. Please log in again.");
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
        let msg = "Request failed";
        if (typeof data.detail === "string") {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map(d => d.msg || "Validation error").join(", ");
        } else if (data.message) {
          msg = data.message;
        }
        throw new Error(msg);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out on ${endpoint}`);
      }
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
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
};

window.API = API;
