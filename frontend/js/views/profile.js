/**
 * DevTrack Profile & Account Settings View
 */

const ProfileView = {
  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Account & Academic Profile</h1>
          <p class="page-subtitle">Personal credentials, institutional affiliation, and security preferences</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
        <div class="card" style="text-align: center; display: flex; flex-direction: column; align-items: center;">
          <div class="user-avatar" style="width: 84px; height: 84px; font-size: 2.2rem; margin-bottom: 1rem;">
            ${user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <h2 style="font-size: 1.35rem; font-weight: 700;">${UI.escapeHtml(user.name)}</h2>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">${UI.escapeHtml(user.email)}</div>
          <span class="badge badge-info" style="font-size: 0.85rem; padding: 4px 12px;">${user.role.replace("_", " ").toUpperCase()}</span>
          
          <div style="margin-top: 1.5rem; width: 100%; border-top: 1px solid var(--border-color); padding-top: 1rem; text-align: left; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; color: var(--text-secondary);">
            <div><strong>Account ID:</strong> #${user.id}</div>
            <div><strong>Department:</strong> ${user.department_id ? `Dept #${user.department_id}` : "Unassigned"}</div>
            <div><strong>Status:</strong> ${user.is_active ? "Active" : "Suspended"}</div>
            <div><strong>Member Since:</strong> ${new Date(user.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1.25rem;">Update Profile Information</h3>
          <form id="profile-update-form" onsubmit="ProfileView.submitProfileUpdate(event)">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="prof-name" class="form-control" value="${UI.escapeHtml(user.name)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address (Read-Only)</label>
              <input type="email" class="form-control" value="${UI.escapeHtml(user.email)}" disabled style="opacity: 0.7;">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" id="prof-phone" class="form-control" value="${UI.escapeHtml(user.phone || '')}" placeholder="+91 ...">
            </div>
            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async afterRender() {},

  async submitProfileUpdate(e) {
    e.preventDefault();
    const user = Auth.getUser();
    const name = document.getElementById("prof-name").value;
    const phone = document.getElementById("prof-phone").value;

    try {
      await API.put(`/users/${user.id}`, { name, phone });
      UI.success("Profile updated successfully!");
      await Auth.checkAuth();
      window.location.reload();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.ProfileView = ProfileView;
