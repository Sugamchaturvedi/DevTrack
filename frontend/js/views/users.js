/**
 * DevTrack User & Academic Identity Management View
 * Faculty, Students, Role Assignment, CSV Bulk Import & Export
 */

const UsersView = {
  currentUsers: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">University User Directory</h1>
          <p class="page-subtitle">Manage student enrollment, faculty rosters, administrative roles, and accounts</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" onclick="UsersView.exportUsersCSV()">📥 Export CSV</button>
          <button class="btn btn-secondary" onclick="UsersView.openBulkImportModal()">📁 Bulk CSV Import</button>
          <button class="btn btn-primary" onclick="UsersView.openAddUserModal()">+ Add User</button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="user-search-input" placeholder="Search by name or email..." oninput="UsersView.applyFilters()">
        </div>
        <div class="filter-controls">
          <select id="user-role-filter" class="select-input" onchange="UsersView.applyFilters()">
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="university_admin">University Admin</option>
            <option value="hod">HOD</option>
            <option value="faculty">Faculty</option>
            <option value="reviewer">Reviewer</option>
            <option value="project_manager">Project Manager</option>
            <option value="team_leader">Team Leader</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Account Actions</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading user roster...</td></tr>
          </tbody>
        </table>
      </div>
    `;
  },

  async afterRender() {
    await this.loadUsers();
  },

  async loadUsers() {
    try {
      this.currentUsers = await API.get("/users/");
      this.renderTable(this.currentUsers);
    } catch (e) {
      UI.error("Failed to load users: " + e.message);
    }
  },

  renderTable(users) {
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No users match the criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleBadge = {
        super_admin: "badge-danger",
        university_admin: "badge-warning",
        hod: "badge-warning",
        faculty: "badge-info",
        reviewer: "badge-info",
        project_manager: "badge-neutral",
        team_leader: "badge-success",
        student: "badge-neutral",
      }[u.role] || "badge-neutral";

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${UI.escapeHtml(u.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${UI.escapeHtml(u.email)}</div>
          </td>
          <td><span class="badge ${roleBadge}">${UI.escapeHtml(u.role.replace("_", " "))}</span></td>
          <td>${UI.escapeHtml(u.department_id ? `Dept #${u.department_id}` : "Unassigned")}</td>
          <td>
            <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
              ${u.is_active ? "Active" : "Deactivated"}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(u.created_at).toLocaleDateString()}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="UsersView.toggleStatus(${u.id}, ${!u.is_active})">
                ${u.is_active ? "Deactivate" : "Activate"}
              </button>
              ${Auth.isSuperAdmin() ? `<button class="btn btn-danger btn-sm" onclick="UsersView.deleteUser(${u.id}, '${UI.escapeHtml(u.name)}')">Delete</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  applyFilters() {
    const search = (document.getElementById("user-search-input")?.value || "").toLowerCase();
    const role = (document.getElementById("user-role-filter")?.value || "").toLowerCase();

    const filtered = this.currentUsers.filter(u => {
      const matchSearch = !search || (u.name && u.name.toLowerCase().includes(search)) || (u.email && u.email.toLowerCase().includes(search));
      const matchRole = !role || (u.role && u.role.toLowerCase() === role);
      return matchSearch && matchRole;
    });

    this.renderTable(filtered);
  },

  async toggleStatus(userId, newActiveStatus) {
    try {
      await API.put(`/users/${userId}/status`, { is_active: newActiveStatus });
      UI.success("Account status updated.");
      await this.loadUsers();
    } catch (e) {
      UI.error(e.message);
    }
  },

  async deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to permanently delete user '${userName}'? This cannot be undone.`)) return;
    try {
      await API.delete(`/users/${userId}`);
      UI.success("User deleted successfully.");
      await this.loadUsers();
    } catch (e) {
      UI.error(e.message);
    }
  },

  exportUsersCSV() {
    window.open(`${API_BASE}/users/export`, "_blank");
  },

  async openAddUserModal() {
    try {
      const depts = await API.get("/university/departments");
      const formHtml = `
        <form id="create-user-form" onsubmit="UsersView.submitAddUser(event)">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="au-name" class="form-control" required placeholder="e.g. Dr. Ramesh Kumar">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" id="au-email" class="form-control" required placeholder="e.g. ramesh.kumar@devtrack.edu">
          </div>
          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="password" id="au-password" class="form-control" required placeholder="Temporary initial password">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Role *</label>
              <select id="au-role" class="form-control">
                <option value="student">Student</option>
                <option value="team_leader">Team Leader</option>
                <option value="faculty">Faculty</option>
                <option value="reviewer">Reviewer</option>
                <option value="hod">HOD</option>
                <option value="project_manager">Project Manager</option>
                <option value="university_admin">University Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Department</label>
              <select id="au-dept" class="form-control">
                <option value="">None / General</option>
                ${depts.map(d => `<option value="${d.id}">${UI.escapeHtml(d.name)} (${d.code})</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
            <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create User</button>
          </div>
        </form>
      `;
      UI.showModal("Add University User", formHtml);
    } catch (e) {
      UI.error(e.message);
    }
  },

  async submitAddUser(e) {
    e.preventDefault();
    const name = document.getElementById("au-name").value;
    const email = document.getElementById("au-email").value;
    const password = document.getElementById("au-password").value;
    const role = document.getElementById("au-role").value;
    const deptVal = document.getElementById("au-dept").value;

    const payload = {
      name,
      email,
      password,
      role,
      department_id: deptVal ? parseInt(deptVal) : null,
    };

    try {
      await API.post("/users/", payload);
      UI.success("User created successfully!");
      UI.closeModal();
      await this.loadUsers();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openBulkImportModal() {
    const formHtml = `
      <form id="bulk-import-form" onsubmit="UsersView.submitBulkImport(event)">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
          Upload a CSV file containing columns: <strong>name, email, role, department_code, enrollment_number/employee_id</strong>.
          <br>Sample roles: <code>student</code>, <code>faculty</code>, <code>hod</code>, <code>reviewer</code>.
        </p>
        <div class="form-group">
          <label class="form-label">Select CSV File *</label>
          <input type="file" id="bi-file" class="form-control" accept=".csv" required>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Process Import</button>
        </div>
      </form>
    `;
    UI.showModal("Bulk Import Users (CSV)", formHtml);
  },

  async submitBulkImport(e) {
    e.preventDefault();
    const fileInput = document.getElementById("bi-file");
    if (!fileInput.files.length) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
      const res = await API.post("/users/bulk-import", formData, true);
      UI.success(res.message || "Bulk import processed.");
      UI.closeModal();
      await this.loadUsers();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.UsersView = UsersView;
