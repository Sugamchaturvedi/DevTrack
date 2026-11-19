/**
 * DevTrack Custom Workflow Builder & Settings View
 * Status pipeline configuration, WIP limits, transition rules, and project type schemes
 */

const WorkflowsView = {
  workflowsData: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Administration</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Workflow Settings</span>
          </div>
          <h1 class="page-title">Custom Workflow Schemes & Statuses</h1>
          <p class="page-subtitle">Define lifecycle stages, approval transitions, and WIP limit rules across academic projects</p>
        </div>
      </div>

      <div id="workflows-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Workflows...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.loadWorkflows();
  },

  async loadWorkflows() {
    const container = document.getElementById("workflows-main-container");
    if (!container) return;

    try {
      this.workflowsData = await API.get("/pm/workflows");
      this.renderWorkflowsHtml(container, this.workflowsData);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load workflows: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderWorkflowsHtml(container, workflows) {
    if (!workflows || workflows.length === 0) {
      container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No workflows configured.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${workflows.map(wf => `
          <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0;">${UI.escapeHtml(wf.name)}</h3>
                  ${wf.is_default ? `<span class="badge badge-success">DEFAULT SCHEME</span>` : ""}
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">${UI.escapeHtml(wf.description || "")}</p>
              </div>
            </div>

            <!-- Visual Pipeline of Statuses -->
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Status Pipeline</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center;">
                ${wf.statuses.map((st, idx) => `
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <div style="display: flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.85rem; background: var(--bg-surface-hover); border-left: 3px solid ${st.color}; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;">
                      <span>${UI.escapeHtml(st.name)}</span>
                      ${st.wip_limit > 0 ? `<span class="badge badge-neutral" style="font-size: 0.65rem;">WIP: ${st.wip_limit}</span>` : ""}
                    </div>
                    ${idx < wf.statuses.length - 1 ? `<span style="color: var(--text-muted); font-size: 0.9rem;">➔</span>` : ""}
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Allowed Transitions Table -->
            <div>
              <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Transition Rules (${wf.transitions.length})</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${wf.transitions.map(tr => `
                  <span class="badge badge-neutral" style="padding: 4px 8px; font-size: 0.75rem;">
                    <code>${tr.from_status_code}</code> ➔ <code>${tr.to_status_code}</code> : <em>${UI.escapeHtml(tr.name || "Transition")}</em>
                  </span>
                `).join("")}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  },
};

window.WorkflowsView = WorkflowsView;
