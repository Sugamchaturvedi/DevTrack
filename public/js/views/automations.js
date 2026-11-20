/**
 * DevTrack Project Automation Engine View
 * Configurable Trigger-Condition-Action automation rules and execution audit logs
 */

const AutomationsView = {
  currentProjectId: null,
  automationData: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Project Management</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Automation</span>
          </div>
          <h1 class="page-title">Project Automation Engine</h1>
          <p class="page-subtitle">Zero-code reactive rules to automate status changes, supervisor notifications, and progress calculation</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="auto-project-select" class="select-input" onchange="AutomationsView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="AutomationsView.openCreateRuleModal()">+ New Automation Rule</button>
        </div>
      </div>

      <div id="automations-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Automation Rules...</div>
      </div>
    `;
  },

  async afterRender() {
    const container = document.getElementById("automations-main-container");
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("auto-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadAutomations();
      } else {
        if (container) {
          container.innerHTML = `
            <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚡</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project to set up automated status transitions and alerts.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center; color: var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Automations: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="AutomationsView.afterRender()">🔄 Retry</button>
        </div>`;
      }
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadAutomations();
  },

  async loadAutomations() {
    const container = document.getElementById("automations-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      this.automationData = await API.get(`/pm/projects/${this.currentProjectId}/automations`);
      this.renderAutomationsHtml(container, this.automationData);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load automations: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderAutomationsHtml(container, data) {
    const rules = data.rules || [];
    const logs = data.logs || [];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
        <!-- Left: Configured Automation Rules -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Active Automation Rules (${rules.length})</h3>

          ${rules.map(r => `
            <div class="card" style="padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div>
                  <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem 0;">
                    ⚡ ${UI.escapeHtml(r.name)}
                  </h4>
                  <span class="badge ${r.is_active ? 'badge-success' : 'badge-neutral'}">
                    ${r.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Executed: <strong>${r.execution_count}</strong> times
                </div>
              </div>

              <div style="background: var(--bg-surface-hover); border-radius: var(--radius-sm); padding: 0.75rem; font-size: 0.825rem; font-family: monospace; color: var(--text-secondary); line-height: 1.6;">
                <div><strong>WHEN:</strong> <code>${UI.escapeHtml(r.trigger_event)}</code></div>
                <div><strong>IF:</strong> <code>${UI.escapeHtml(r.conditions_json || '{}')}</code></div>
                <div><strong>THEN:</strong> <code>${UI.escapeHtml(r.actions_json)}</code></div>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Right: Recent Execution Audit Logs -->
        <div class="card" style="padding: 1.25rem; height: fit-content;">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 1rem;">Automation Run History</h3>
          ${logs.length === 0 ? `<div style="font-size: 0.825rem; color: var(--text-muted);">No runs recorded yet.</div>` : ""}

          <div style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 500px; overflow-y: auto;">
            ${logs.map(l => `
              <div style="padding: 0.5rem 0.65rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); font-size: 0.775rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
                  <span class="badge ${l.status === 'success' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem;">${l.status}</span>
                  <span style="color: var(--text-muted); font-size: 0.7rem;">${new Date(l.executed_at).toLocaleTimeString()}</span>
                </div>
                <div style="color: var(--text-primary);">${UI.escapeHtml(l.details || l.trigger_event)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  },

  openCreateRuleModal() {
    const html = `
      <form id="create-rule-form" onsubmit="AutomationsView.handleCreateRule(event)">
        <div class="form-group">
          <label class="form-label">Rule Name *</label>
          <input type="text" id="rule-name" class="form-control" required placeholder="e.g. Notify faculty supervisor on deliverable submit">
        </div>
        <div class="form-group">
          <label class="form-label">Trigger Event *</label>
          <select id="rule-trigger" class="select-input" style="width: 100%;">
            <option value="status_changed">When an Issue / Task Status changes</option>
            <option value="task_created">When a new Issue / Task is created</option>
            <option value="submission_received">When a Project Submission is uploaded</option>
            <option value="task_overdue">When a Task passes its deadline</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Conditions (JSON filter)</label>
          <input type="text" id="rule-conds" class="form-control" value='{"target_status": "blocked"}' placeholder='e.g. {"target_status": "blocked"}'>
        </div>
        <div class="form-group">
          <label class="form-label">Actions (JSON)</label>
          <input type="text" id="rule-actions" class="form-control" value='{"notify": "supervisor", "alert": true}' required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Save Automation Rule</button>
      </form>
    `;
    UI.showModal("Create Automation Rule", html);
  },

  async handleCreateRule(e) {
    e.preventDefault();
    const name = document.getElementById("rule-name").value;
    const trigger = document.getElementById("rule-trigger").value;
    const conds = document.getElementById("rule-conds").value;
    const actions = document.getElementById("rule-actions").value;

    try {
      await API.post(`/pm/projects/${this.currentProjectId}/automations`, {
        name: name,
        trigger_event: trigger,
        conditions_json: conds,
        actions_json: actions,
        is_active: true,
      });
      UI.success("Automation rule configured!");
      UI.closeModal();
      await this.loadAutomations();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.AutomationsView = AutomationsView;

