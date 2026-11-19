/**
 * DevTrack Authentication & RBAC Service
 */

const Auth = {
  currentUser: null,

  isAuthenticated() {
    return !!API.getToken();
  },

  async checkAuth() {
    if (!this.isAuthenticated()) {
      return null;
    }
    try {
      this.currentUser = await API.get("/auth/me");
      return this.currentUser;
    } catch (e) {
      this.currentUser = null;
      API.setToken(null);
      return null;
    }
  },

  async login(email, password) {
    const data = await API.post("/auth/login", { email, password });
    API.setToken(data.access_token);
    this.currentUser = data.user;
    return data.user;
  },

  async register(formData) {
    return await API.post("/auth/register", formData);
  },

  logout() {
    API.setToken(null);
    this.currentUser = null;
    window.location.hash = "#/login";
  },

  getUser() {
    return this.currentUser;
  },

  getRole() {
    return this.currentUser ? this.currentUser.role : null;
  },

  // Role Checker Utilities
  hasRole(allowedRoles) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === "super_admin") return true;
    return allowedRoles.includes(this.currentUser.role);
  },

  isSuperAdmin() {
    return this.currentUser && this.currentUser.role === "super_admin";
  },

  isUniversityAdmin() {
    return this.hasRole(["super_admin", "university_admin"]);
  },

  isHOD() {
    return this.hasRole(["super_admin", "university_admin", "hod"]);
  },

  isFaculty() {
    return this.hasRole(["super_admin", "university_admin", "hod", "faculty", "reviewer"]);
  },

  isStudent() {
    return this.currentUser && ["student", "team_leader"].includes(this.currentUser.role);
  },
};

window.Auth = Auth;
