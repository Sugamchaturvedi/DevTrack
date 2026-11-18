/**
 * DevTrack Visual Project Roadmap & Timeline Module
 * Epics as Timeline Bars, Milestones, Progress Tracking, and Zoom Modes
 */

const RoadmapView = {
  currentProjectId: null,
  roadmapData: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Core Operations</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Roadmap</span>
          </div>
          <h1 class="page-title">Project Roadmap & Release Timeline</h1>
          <p class="page-subtitle">Strategic epic timeline, major deliverables, and academic milestone forecasting</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="roadmap-project-select" class="select-input" onchange="RoadmapView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="IssuesView.currentProjectId = RoadmapView.currentProjectId; IssuesView.openCreateIssueModal()">+ Add Epic</button>
        </div>
      </div>

      <div id="roadmap-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Roadmap...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("roadmap-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadRoadmap();
      } else {
        const container = document.getElementById("roadmap-main-container");
        if (container) {
          container.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🗺️</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project or switch to an Administrator account to view Gantt roadmaps.</p>
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
    await this.loadRoadmap();
  },

  async loadRoadmap() {
    const container = document.getElementById("roadmap-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      this.roadmapData = await API.get(`/pm/projects/${this.currentProjectId}/roadmap`);
      this.renderRoadmapHtml(container, this.roadmapData);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load roadmap: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderRoadmapHtml(container, data) {
    const epics = data.epics || [];
    const milestones = data.milestones || [];

    if (epics.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No Epics configured for this project yet.
          <div style="margin-top: 1rem;">
            <button class="btn btn-primary btn-sm" onclick="IssuesView.currentProjectId = RoadmapView.currentProjectId; IssuesView.openCreateIssueModal()">+ Create First Epic</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Epics Timeline Container -->
        <div class="card" style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700;">Strategic Epics & Deliverable Phases</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${epics.length} Epics active</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${epics.map(ep => {
              const startStr = ep.start_date ? new Date(ep.start_date).toLocaleDateString() : "TBD";
              const endStr = ep.end_date ? new Date(ep.end_date).toLocaleDateString() : "TBD";

              return `
                <div style="background: var(--bg-surface-hover); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; cursor: pointer;" onclick="IssuesView.openIssueDetailModal('${ep.issue_key || ep.id}')">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                      <span class="badge badge-neutral" style="font-family: monospace; color: #8b5cf6; font-weight: 700;">
                        ${UI.escapeHtml(ep.issue_key || `#${ep.id}`)}
                      </span>
                      <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
                        🟣 ${UI.escapeHtml(ep.title)}
                      </span>
                      <span class="badge ${ep.status === 'done' ? 'badge-success' : 'badge-warning'}">${ep.status}</span>
                      ${ep.is_overdue ? `<span class="badge badge-danger">⚠️ Overdue</span>` : ""}
                    </div>
                    <div style="font-size: 0.825rem; font-weight: 600; color: var(--text-secondary);">
                      📅 ${startStr} &nbsp;➔&nbsp; ${endStr}
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                    <div style="flex: 1; height: 10px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden;">
                      <div style="height: 100%; width: ${ep.progress_percentage}%; background: linear-gradient(90deg, #8b5cf6, #2563eb); border-radius: 5px;"></div>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: 700; width: 45px; text-align: right; color: var(--text-primary);">${ep.progress_percentage}%</span>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 0.775rem; color: var(--text-muted); margin-top: 0.4rem;">
                    <span>Completed Child Issues: <strong>${ep.completed_count} / ${ep.child_count}</strong></span>
                    <span>Story Points: <strong>${ep.story_points} pts</strong></span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Academic Milestones Section -->
        <div class="card" style="padding: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Official Evaluation Milestones</h3>
          ${milestones.length === 0 ? `<div style="font-size: 0.85rem; color: var(--text-muted);">No university milestones specified for this project.</div>` : ""}
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            ${milestones.map(m => `
              <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-surface);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                  <strong style="font-size: 0.9rem;">📍 ${UI.escapeHtml(m.title)}</strong>
                  <span class="badge ${m.status === 'completed' ? 'badge-success' : 'badge-neutral'}">${m.status}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Due: 📅 ${m.due_date ? new Date(m.due_date).toLocaleDateString() : "Pending"}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  },
};

window.RoadmapView = RoadmapView;
