/**
 * DevTrack Projects List & Management View
 */

const ProjectsView = {
  currentProjects: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">University Projects</h1>
          <p class="page-subtitle">Academic project repository, supervision, and team tracking</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" onclick="ProjectsView.exportCSV()">📥 Export CSV</button>
          <button class="btn btn-primary" onclick="ProjectsView.openCreateModal()">+ New Project</button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="project-search-input" placeholder="Search by name, code, or description..." oninput="ProjectsView.applyFilters()">
        </div>
        <div class="filter-controls">
          <select id="project-status-filter" class="select-input" onchange="ProjectsView.applyFilters()">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Under Review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select id="project-category-filter" class="select-input" onchange="ProjectsView.applyFilters()">
            <option value="">All Categories</option>
            <option value="Capstone">Capstone Project</option>
            <option value="Major Project">Major Project</option>
            <option value="Minor Project">Minor Project</option>
            <option value="Research">Research Project</option>
            <option value="Internship">Industry Internship</option>
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code / Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Owner / Mentor</th>
              <th>Progress</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="projects-table-body">
            <tr><td colspan="8" style="text-align:center; padding: 2rem;">Loading projects...</td></tr>
          </tbody>
        </table>
      </div>
    `;
  },

  async afterRender() {
    await this.loadProjects();
  },

  async loadProjects(forceRefresh = false) {
    const tbody = document.getElementById("projects-table-body");
    try {
      this.currentProjects = await App.getProjects(forceRefresh);
      this.renderTable(this.currentProjects);
    } catch (e) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--danger);">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚠️</div>
          <p style="margin-bottom: 0.75rem;">Failed to load projects: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" onclick="ProjectsView.loadProjects(true)">🔄 Retry</button>
        </td></tr>`;
      }
      UI.error("Failed to load projects: " + e.message);
    }
  },

  renderTable(projects) {
    const tbody = document.getElementById("projects-table-body");
    if (!tbody) return;

    if (projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No projects found. Create one to get started!</td></tr>`;
      return;
    }

    tbody.innerHTML = projects.map(p => {
      const statusClass = {
        active: "badge-success",
        "in progress": "badge-info",
        completed: "badge-success",
        planning: "badge-warning",
        on_hold: "badge-neutral",
        under_review: "badge-warning",
      }[(p.status || "").toLowerCase()] || "badge-neutral";

      const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString() : "No deadline";

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); cursor: pointer;" onclick="window.location.hash='#/projects/${p.id}'">
              ${UI.escapeHtml(p.name)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${UI.escapeHtml(p.code || `PRJ-${p.id}`)}</div>
          </td>
          <td><span class="badge badge-neutral">${UI.escapeHtml(p.category || "Capstone")}</span></td>
          <td><span class="badge ${statusClass}">${UI.escapeHtml(p.status || "active")}</span></td>
          <td><span class="badge badge-neutral">${UI.escapeHtml(p.priority || "medium")}</span></td>
          <td>
            <div style="font-size: 0.85rem;">${UI.escapeHtml(p.owner_name || "Unknown")}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${UI.escapeHtml(p.faculty_mentor_name || p.department_name || "")}</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="flex: 1; height: 6px; background: var(--border-color); border-radius: var(--radius-full); width: 60px;">
                <div style="height: 100%; width: ${p.completion_percentage || 0}%; background: var(--primary); border-radius: var(--radius-full);"></div>
              </div>
              <span style="font-size: 0.75rem;">${p.completion_percentage || 0}%</span>
            </div>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${deadline}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/projects/${p.id}'">Open</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  applyFilters() {
    const search = (document.getElementById("project-search-input")?.value || "").toLowerCase();
    const status = (document.getElementById("project-status-filter")?.value || "").toLowerCase();
    const category = (document.getElementById("project-category-filter")?.value || "").toLowerCase();

    const filtered = this.currentProjects.filter(p => {
      const matchSearch = !search || (p.name && p.name.toLowerCase().includes(search)) || (p.code && p.code.toLowerCase().includes(search)) || (p.description && p.description.toLowerCase().includes(search));
      const matchStatus = !status || (p.status && p.status.toLowerCase() === status);
      const matchCategory = !category || (p.category && p.category.toLowerCase() === category);
      return matchSearch && matchStatus && matchCategory;
    });

    this.renderTable(filtered);
  },

  exportCSV() {
    window.open(`${API_BASE}/projects/export/csv`, "_blank");
  },

  openCreateModal() {
    const formHtml = `
      <form id="create-project-form" onsubmit="ProjectsView.submitCreate(event)">
        <div class="form-group">
          <label class="form-label">Project Title *</label>
          <input type="text" id="cp-name" class="form-control" required placeholder="e.g. Autonomous Campus Navigation System">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="cp-category" class="form-control">
            <option value="Capstone">Capstone Project</option>
            <option value="Major Project">Major Project</option>
            <option value="Minor Project">Minor Project</option>
            <option value="Research">Research Project</option>
            <option value="Internship">Industry Internship</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description & Objectives</label>
          <textarea id="cp-desc" class="form-control" rows="3" placeholder="Outline the scope, objectives, and deliverables..."></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="cp-priority" class="form-control">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Deadline</label>
            <input type="date" id="cp-deadline" class="form-control">
          </div>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Project</button>
        </div>
      </form>
    `;
    UI.showModal("Create University Project", formHtml);
  },

  async submitCreate(e) {
    e.preventDefault();
    const name = document.getElementById("cp-name").value;
    const category = document.getElementById("cp-category").value;
    const description = document.getElementById("cp-desc").value;
    const priority = document.getElementById("cp-priority").value;
    const deadlineVal = document.getElementById("cp-deadline").value;

    const payload = {
      name,
      category,
      description,
      priority,
      deadline: deadlineVal ? new Date(deadlineVal).toISOString() : null,
    };

    try {
      await API.post("/projects/", payload);
      UI.success("Project created successfully!");
      UI.closeModal();
      if (window.App && typeof window.App.invalidateProjectsCache === "function") {
        window.App.invalidateProjectsCache();
      }
      await this.loadProjects(true);
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.ProjectsView = ProjectsView;

