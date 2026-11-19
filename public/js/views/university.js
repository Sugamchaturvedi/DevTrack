/**
 * DevTrack University & Academic Administration View
 * Departments, Academic Programs, Sessions, Semesters, Structure
 */

const UniversityView = {
  activeTab: "departments",

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">University Administration</h1>
          <p class="page-subtitle">Configure academic hierarchy, departments, degree programs, and sessions</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" onclick="UniversityView.openAddDeptModal()">+ New Department</button>
          <button class="btn btn-primary" onclick="UniversityView.openAddProgramModal()">+ New Program</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" id="btn-tab-departments" onclick="UniversityView.switchTab('departments')">🏛️ Departments</button>
        <button class="tab-btn" id="btn-tab-programs" onclick="UniversityView.switchTab('programs')">🎓 Degree Programs</button>
        <button class="tab-btn" id="btn-tab-sessions" onclick="UniversityView.switchTab('sessions')">📅 Sessions & Semesters</button>
      </div>

      <div id="university-tab-content">
        <div style="padding: 2rem; text-align: center;">Loading university records...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.loadTabContent();
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    const btn = document.getElementById(`btn-tab-${tab}`);
    if (btn) btn.classList.add("active");
    this.loadTabContent();
  },

  async loadTabContent() {
    const container = document.getElementById("university-tab-content");
    if (!container) return;

    try {
      if (this.activeTab === "departments") {
        const depts = await API.get("/university/departments");
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Department Code</th>
                  <th>Department Name</th>
                  <th>Head of Department</th>
                  <th>Programs</th>
                  <th>Projects Count</th>
                </tr>
              </thead>
              <tbody>
                ${depts.map(d => `
                  <tr>
                    <td><span class="badge badge-info">${UI.escapeHtml(d.code)}</span></td>
                    <td style="font-weight: 600;">${UI.escapeHtml(d.name)}</td>
                    <td>${UI.escapeHtml(d.hod_name || "Unassigned")}</td>
                    <td>${d.program_count || 0}</td>
                    <td>${d.project_count || 0}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;
      } else if (this.activeTab === "programs") {
        const programs = await API.get("/university/programs");
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Degree / Program</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                ${programs.map(pr => `
                  <tr>
                    <td><span class="badge badge-neutral">${UI.escapeHtml(pr.code)}</span></td>
                    <td style="font-weight: 600;">${UI.escapeHtml(pr.name)}</td>
                    <td><span class="badge badge-info">${UI.escapeHtml(pr.degree_type)}</span></td>
                    <td>${pr.duration_years} Years</td>
                    <td>${UI.escapeHtml(pr.department_name || "General")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;
      } else if (this.activeTab === "sessions") {
        const [sessions, semesters] = await Promise.all([
          API.get("/university/sessions"),
          API.get("/university/semesters"),
        ]);
        container.innerHTML = `
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem;">
            <div class="card">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Academic Sessions</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${sessions.map(s => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
                    <div>
                      <div style="font-weight: 700;">${UI.escapeHtml(s.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${s.start_year} – ${s.end_year}</div>
                    </div>
                    ${s.is_current ? `<span class="badge badge-success">Current Session</span>` : ""}
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="card">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Semesters</h4>
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Sem #</th>
                      <th>Semester Name</th>
                      <th>Program</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${semesters.map(sm => `
                      <tr>
                        <td><strong>${sm.semester_number}</strong></td>
                        <td>${UI.escapeHtml(sm.name)}</td>
                        <td>${UI.escapeHtml(sm.program_name || "")}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  openAddDeptModal() {
    const formHtml = `
      <form id="add-dept-form" onsubmit="UniversityView.submitAddDept(event)">
        <div class="form-group">
          <label class="form-label">Department Name *</label>
          <input type="text" id="dept-name" class="form-control" required placeholder="e.g. Electrical and Electronics Engineering">
        </div>
        <div class="form-group">
          <label class="form-label">Department Code *</label>
          <input type="text" id="dept-code" class="form-control" required placeholder="e.g. EEE">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="dept-desc" class="form-control" rows="2" placeholder="Academic department details..."></textarea>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Department</button>
        </div>
      </form>
    `;
    UI.showModal("Add University Department", formHtml);
  },

  async submitAddDept(e) {
    e.preventDefault();
    const name = document.getElementById("dept-name").value;
    const code = document.getElementById("dept-code").value.toUpperCase();
    const description = document.getElementById("dept-desc").value;

    try {
      await API.post("/university/departments", { name, code, description });
      UI.success("Department added!");
      UI.closeModal();
      this.loadTabContent();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async openAddProgramModal() {
    try {
      const depts = await API.get("/university/departments");
      const formHtml = `
        <form id="add-prog-form" onsubmit="UniversityView.submitAddProgram(event)">
          <div class="form-group">
            <label class="form-label">Program Name *</label>
            <input type="text" id="prog-name" class="form-control" required placeholder="e.g. B.Tech in Artificial Intelligence">
          </div>
          <div class="form-group">
            <label class="form-label">Program Code *</label>
            <input type="text" id="prog-code" class="form-control" required placeholder="e.g. BTECH-AI">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Degree Type</label>
              <select id="prog-degree" class="form-control">
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
                <option value="BCA">BCA</option>
                <option value="MCA">MCA</option>
                <option value="MBA">MBA</option>
                <option value="BBA">BBA</option>
                <option value="BA">BA</option>
                <option value="MA">MA</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Duration (Years)</label>
              <input type="number" id="prog-duration" class="form-control" value="4" min="1" max="6">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Department *</label>
            <select id="prog-dept" class="form-control" required>
              ${depts.map(d => `<option value="${d.id}">${UI.escapeHtml(d.name)} (${d.code})</option>`).join("")}
            </select>
          </div>
          <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
            <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Program</button>
          </div>
        </form>
      `;
      UI.showModal("Add Academic Degree Program", formHtml);
    } catch (e) {
      UI.error(e.message);
    }
  },

  async submitAddProgram(e) {
    e.preventDefault();
    const name = document.getElementById("prog-name").value;
    const code = document.getElementById("prog-code").value.toUpperCase();
    const degree_type = document.getElementById("prog-degree").value;
    const duration_years = parseInt(document.getElementById("prog-duration").value || "4");
    const department_id = parseInt(document.getElementById("prog-dept").value);

    try {
      await API.post("/university/programs", {
        name,
        code,
        degree_type,
        duration_years,
        department_id,
      });
      UI.success("Academic program added!");
      UI.closeModal();
      this.loadTabContent();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.UniversityView = UniversityView;
