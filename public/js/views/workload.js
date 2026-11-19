/**
 * DevTrack Workload & Team Capacity Management View
 * Resource allocation, capacity planning, estimated vs logged hours, and overloaded indicators
 */

const WorkloadView = {
  currentProjectId: null,
  workloadData: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Project Management</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Workload</span>
          </div>
          <h1 class="page-title">Team Workload & Capacity Planning</h1>
          <p class="page-subtitle">Balance work distribution, detect team bottlenecks, and monitor member effort</p>
        </div>
        <div>
          <select id="workload-project-select" class="select-input" onchange="WorkloadView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
        </div>
      </div>

      <div id="workload-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Team Workload...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("workload-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadWorkload();
      } else {
        const container = document.getElementById("workload-main-container");
        if (container) {
          container.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">👥</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project or switch to an Administrator account to track team capacity.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadWorkload();
  },

  async loadWorkload() {
    const container = document.getElementById("workload-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      this.workloadData = await API.get(`/pm/projects/${this.currentProjectId}/workload`);
      this.renderWorkloadHtml(container, this.workloadData);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load workload: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderWorkloadHtml(container, members) {
    if (!members || members.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No assigned team members or tasks found for this project.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${members.map(m => {
          const isOverloaded = m.is_overloaded;
          const barColor = isOverloaded ? "#ef4444" : (m.utilization_percentage > 70 ? "#f59e0b" : "#10b981");

          return `
            <div class="card" style="padding: 1.25rem; border-left: 4px solid ${barColor};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem;">
                    ${m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin: 0;">${UI.escapeHtml(m.name)}</h3>
                      <span class="badge badge-neutral" style="font-size: 0.7rem; text-transform: uppercase;">${UI.escapeHtml(m.role)}</span>
                      ${isOverloaded ? `<span class="badge badge-danger">⚠️ OVERLOADED</span>` : ""}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                      ✉️ ${UI.escapeHtml(m.email)} &bull; Active Tasks: <strong>${m.active_tasks_count}</strong> &bull; Total Points: <strong>${m.story_points} pts</strong>
                    </div>
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="font-size: 1.25rem; font-weight: 800; color: ${barColor};">
                    ${m.utilization_percentage}%
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">
                    ${m.estimated_hours}h estimated / ${m.capacity_hours}h cap
                  </div>
                </div>
              </div>

              <!-- Utilization Progress Bar -->
              <div style="width: 100%; height: 8px; background: var(--bg-surface-hover); border-radius: 4px; overflow: hidden; margin-bottom: 0.85rem;">
                <div style="height: 100%; width: ${Math.min(100, m.utilization_percentage)}%; background: ${barColor};"></div>
              </div>

              <!-- Stats Breakdown Chips -->
              <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
                <span>⏱ <strong>Logged Effort:</strong> ${m.logged_hours}h</span>
                <span>⏳ <strong>Remaining:</strong> ${m.remaining_hours}h</span>
              </div>

              <!-- Assigned Tasks Quick View -->
              ${m.tasks && m.tasks.length > 0 ? `
                <div style="border-top: 1px solid var(--border-color); padding-top: 0.65rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Assigned In-Flight Issues:</span>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem;">
                    ${m.tasks.map(t => `
                      <span class="badge badge-neutral" style="cursor: pointer; display: flex; align-items: center; gap: 0.35rem; padding: 4px 8px; font-size: 0.75rem;" onclick="IssuesView.openIssueDetailModal('${t.issue_key || t.id}')">
                        <strong style="color: #2563eb;">${t.issue_key}</strong> ${UI.escapeHtml(t.title)} (${t.estimated_hours}h)
                      </span>
                    `).join("")}
                  </div>
                </div>
              ` : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
  },
};

window.WorkloadView = WorkloadView;
