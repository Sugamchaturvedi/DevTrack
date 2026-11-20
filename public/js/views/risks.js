/**
 * DevTrack Project Risk Management Module
 * Risk Matrix (Probability vs Impact), Risk Register, and Mitigation Tracking
 */

const RisksView = {
  currentProjectId: null,
  risksList: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Project Management</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Risks</span>
          </div>
          <h1 class="page-title">Project Risk Management & Heatmap</h1>
          <p class="page-subtitle">Identify vulnerabilities, quantify probability & impact, and track mitigation contingencies</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="risk-project-select" class="select-input" onchange="RisksView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="RisksView.openCreateRiskModal()">+ Add Risk</button>
        </div>
      </div>

      <div id="risks-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Risk Register...</div>
      </div>
    `;
  },

  async afterRender() {
    const container = document.getElementById("risks-main-container");
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("risk-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadRisks();
      } else {
        if (container) {
          container.innerHTML = `
            <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🛡️</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project to assess risks, probabilities, and mitigation matrices.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center; color: var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Risk Register: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="RisksView.afterRender()">🔄 Retry</button>
        </div>`;
      }
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadRisks();
  },

  async loadRisks() {
    const container = document.getElementById("risks-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      this.risksList = await API.get(`/pm/projects/${this.currentProjectId}/risks`);
      this.renderRisksHtml(container, this.risksList);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load risks: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderRisksHtml(container, risks) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Risk Heatmap Matrix -->
        <div class="card" style="padding: 1.25rem;">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">Risk Heatmap Matrix (Probability vs Impact)</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; text-align: center;">
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); padding: 0.85rem;">
              <strong style="color: #10b981;">Low Severity</strong>
              <div style="font-size: 1.5rem; font-weight: 800; margin-top: 0.25rem;">${risks.filter(r => r.severity === 'Low').length}</div>
            </div>
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 0.85rem;">
              <strong style="color: #f59e0b;">Medium Severity</strong>
              <div style="font-size: 1.5rem; font-weight: 800; margin-top: 0.25rem;">${risks.filter(r => r.severity === 'Medium').length}</div>
            </div>
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); padding: 0.85rem;">
              <strong style="color: #ef4444;">High / Critical</strong>
              <div style="font-size: 1.5rem; font-weight: 800; margin-top: 0.25rem;">${risks.filter(r => ['High', 'Critical'].includes(r.severity)).length}</div>
            </div>
          </div>
        </div>

        <!-- Risk Register Table -->
        <div class="card" style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700;">Project Risk Register (${risks.length})</h3>
            <button class="btn btn-secondary btn-sm" onclick="RisksView.openCreateRiskModal()">+ Add Risk</button>
          </div>

          ${risks.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">No risks identified for this project yet.</div>
          ` : `
            <div class="table-container" style="padding: 0;">
              <table class="table">
                <thead>
                  <tr>
                    <th>RISK TITLE</th>
                    <th>CATEGORY</th>
                    <th>PROBABILITY</th>
                    <th>IMPACT</th>
                    <th>SEVERITY</th>
                    <th>MITIGATION PLAN</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  ${risks.map(r => `
                    <tr>
                      <td style="font-weight: 600;">
                        ${UI.escapeHtml(r.title)}
                        ${r.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">${UI.escapeHtml(r.description)}</div>` : ""}
                      </td>
                      <td><span class="badge badge-neutral">${r.category}</span></td>
                      <td>${r.probability}</td>
                      <td>${r.impact}</td>
                      <td>
                        <span class="badge ${r.severity === 'Critical' ? 'badge-danger' : (r.severity === 'High' ? 'badge-warning' : 'badge-neutral')}">
                          ${r.severity}
                        </span>
                      </td>
                      <td style="font-size: 0.825rem; color: var(--text-secondary); max-width: 280px;">
                        ${UI.escapeHtml(r.mitigation_plan || "Pending definition")}
                      </td>
                      <td><span class="badge ${r.status === 'closed' ? 'badge-success' : 'badge-info'}">${r.status}</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  openCreateRiskModal() {
    const html = `
      <form id="create-risk-form" onsubmit="RisksView.handleCreateRisk(event)">
        <div class="form-group">
          <label class="form-label">Risk Title *</label>
          <input type="text" id="risk-title" class="form-control" required placeholder="e.g. Postgres connection exhaustion under high concurrent load">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="risk-cat" class="select-input" style="width: 100%;">
            <option value="Technical">Technical</option>
            <option value="Schedule">Schedule / Deadline</option>
            <option value="Resource">Resource & Workload</option>
            <option value="Security">Security & Compliance</option>
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Probability</label>
            <select id="risk-prob" class="select-input" style="width: 100%;">
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Impact</label>
            <select id="risk-impact" class="select-input" style="width: 100%;">
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Severity</label>
            <select id="risk-sev" class="select-input" style="width: 100%;">
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Mitigation Plan & Contingency</label>
          <textarea id="risk-mitigation" class="form-control" rows="3" placeholder="Steps to prevent or minimize damage..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Register Project Risk</button>
      </form>
    `;
    UI.showModal("Add Project Risk", html);
  },

  async handleCreateRisk(e) {
    e.preventDefault();
    const title = document.getElementById("risk-title").value;
    const cat = document.getElementById("risk-cat").value;
    const prob = document.getElementById("risk-prob").value;
    const impact = document.getElementById("risk-impact").value;
    const sev = document.getElementById("risk-sev").value;
    const mitigation = document.getElementById("risk-mitigation").value;

    try {
      await API.post(`/pm/projects/${this.currentProjectId}/risks`, {
        title: title,
        category: cat,
        probability: prob,
        impact: impact,
        severity: sev,
        mitigation_plan: mitigation,
      });
      UI.success("Risk registered!");
      UI.closeModal();
      await this.loadRisks();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.RisksView = RisksView;

