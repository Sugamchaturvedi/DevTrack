/**
 * DevTrack Agile & Sprints View
 * Sprint Planning, Product Backlog, and Burndown Velocity Chart
 */

const SprintsView = {
  currentProjectId: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Agile & Scrum Hub</h1>
          <p class="page-subtitle">Iterative development cycles, sprint goals, and velocity burndown charts</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <select id="sprint-project-select" class="select-input" onchange="SprintsView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="SprintsView.openCreateSprintModal()">+ New Sprint</button>
        </div>
      </div>

      <div id="sprints-main-container">
        <div style="padding: 2rem; text-align: center;">Loading Agile Hub...</div>
      </div>
    `;
  },

  async afterRender() {
    const container = document.getElementById("sprints-main-container");
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("sprint-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadSprintData(this.currentProjectId, "sprints-main-container");
      } else {
        if (container) {
          container.innerHTML = `
            <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🏃</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project or get assigned to one to manage sprint cycles.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center; color: var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Agile Hub: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="SprintsView.afterRender()">🔄 Retry</button>
        </div>`;
      }
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadSprintData(projectId, "sprints-main-container");
  },

  async renderInContainer(projectId, containerId) {
    this.currentProjectId = projectId;
    await this.loadSprintData(projectId, containerId);
  },

  async loadSprintData(projectId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const [sprints, stories, tasks] = await Promise.all([
        API.get(`/projects/${projectId}/sprints`),
        API.get(`/projects/${projectId}/stories`),
        API.get(`/projects/${projectId}/tasks`),
      ]);

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700;">Active & Planned Sprints (${sprints.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="SprintsView.openCreateSprintModal()">+ Plan Sprint</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${sprints.length === 0 ? `
            <div class="card" style="text-align: center; color: var(--text-muted); padding: 3rem;">
              No sprints scheduled yet. Plan your first academic sprint!
            </div>
          ` : ""}

          ${sprints.map(s => `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <h4 style="font-size: 1.1rem; font-weight: 700;">${UI.escapeHtml(s.name)}</h4>
                    <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}">${UI.escapeHtml(s.status)}</span>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
                    🎯 Goal: ${UI.escapeHtml(s.goal || "No stated sprint goal")}
                  </p>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                  📅 ${new Date(s.start_date).toLocaleDateString()} – ${new Date(s.end_date).toLocaleDateString()}
                </div>
              </div>

              <!-- Metrics Row -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Tasks</div>
                  <div style="font-weight: 700; font-size: 1.1rem;">${s.completed_tasks} / ${s.total_tasks}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Logged Hours</div>
                  <div style="font-weight: 700; font-size: 1.1rem;">${s.completed_hours}h / ${s.total_hours}h</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Sprint Completion</div>
                  <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary);">${s.progress_percentage}%</div>
                </div>
              </div>

              <!-- Burndown Canvas Chart -->
              <div style="margin-top: 1rem;">
                <h5 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem;">Sprint Burndown (Ideal vs Actual Remaining Hours)</h5>
                <canvas id="burndown-canvas-${s.id}" width="550" height="180" style="width: 100%; max-width: 600px; height: 180px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm);"></canvas>
              </div>
            </div>
          `).join("")}

          <!-- Product Backlog & User Stories -->
          <div class="card" style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h4 style="font-size: 1.1rem; font-weight: 700;">Product Backlog & User Stories (${stories.length})</h4>
              <button class="btn btn-secondary btn-sm" onclick="SprintsView.openCreateStoryModal()">+ Add Story</button>
            </div>
            ${stories.length === 0 ? `<div style="font-size: 0.85rem; color: var(--text-muted);">No user stories in product backlog.</div>` : ""}
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              ${stories.map(st => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
                  <div>
                    <span style="font-weight: 600; font-size: 0.875rem;">${UI.escapeHtml(st.title)}</span>
                    <span class="badge badge-neutral" style="margin-left: 0.5rem;">${st.story_points} pts</span>
                  </div>
                  <span class="badge badge-info">${st.status}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;

      // Render Burndown Charts for active sprints
      for (const s of sprints) {
        try {
          const bd = await API.get(`/projects/${projectId}/sprints/${s.id}/burndown`);
          UI.renderBurndownCanvas(`burndown-canvas-${s.id}`, bd.labels, bd.ideal, bd.actual);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load Agile data: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  openCreateSprintModal() {
    const formHtml = `
      <form id="create-sprint-form" onsubmit="SprintsView.submitCreateSprint(event)">
        <div class="form-group">
          <label class="form-label">Sprint Name *</label>
          <input type="text" id="cs-name" class="form-control" required placeholder="e.g. Sprint 1 - Core Architecture & Auth">
        </div>
        <div class="form-group">
          <label class="form-label">Sprint Goal</label>
          <input type="text" id="cs-goal" class="form-control" placeholder="What is the key deliverable of this sprint?">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input type="date" id="cs-start" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">End Date *</label>
            <input type="date" id="cs-end" class="form-control" required>
          </div>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Start Sprint</button>
        </div>
      </form>
    `;
    UI.showModal("Plan New Academic Sprint", formHtml);
  },

  async submitCreateSprint(e) {
    e.preventDefault();
    const name = document.getElementById("cs-name").value;
    const goal = document.getElementById("cs-goal").value;
    const startVal = document.getElementById("cs-start").value;
    const endVal = document.getElementById("cs-end").value;

    const payload = {
      name,
      goal,
      start_date: new Date(startVal).toISOString(),
      end_date: new Date(endVal).toISOString(),
    };

    try {
      await API.post(`/projects/${this.currentProjectId}/sprints`, payload);
      UI.success("Sprint created successfully!");
      UI.closeModal();
      this.loadSprintData(this.currentProjectId, "sprints-main-container" in document ? "sprints-main-container" : "sprints-view-container");
    } catch (err) {
      UI.error(err.message);
    }
  },

  openCreateStoryModal() {
    const formHtml = `
      <form id="create-story-form" onsubmit="SprintsView.submitCreateStory(event)">
        <div class="form-group">
          <label class="form-label">Story Title *</label>
          <input type="text" id="cst-title" class="form-control" required placeholder="As a student, I want to upload files...">
        </div>
        <div class="form-group">
          <label class="form-label">Acceptance Criteria</label>
          <textarea id="cst-criteria" class="form-control" rows="2" placeholder="Given... When... Then..."></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Story Points</label>
            <input type="number" id="cst-points" class="form-control" value="3" min="1" max="13">
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="cst-priority" class="form-control">
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add to Backlog</button>
        </div>
      </form>
    `;
    UI.showModal("Create User Story", formHtml);
  },

  async submitCreateStory(e) {
    e.preventDefault();
    const title = document.getElementById("cst-title").value;
    const criteria = document.getElementById("cst-criteria").value;
    const points = parseInt(document.getElementById("cst-points").value || "3");
    const priority = document.getElementById("cst-priority").value;

    try {
      await API.post(`/projects/${this.currentProjectId}/stories`, {
        title,
        acceptance_criteria: criteria,
        story_points: points,
        priority,
      });
      UI.success("Story added to Backlog!");
      UI.closeModal();
      this.loadSprintData(this.currentProjectId, "sprints-main-container" in document ? "sprints-main-container" : "sprints-view-container");
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.SprintsView = SprintsView;
