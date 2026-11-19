/**
 * DevTrack Advanced Backlog Management View
 * Sprint Planning, Product Backlog, Drag & Drop Reordering, Story Points, and Epic Grouping
 */

const BacklogView = {
  currentProjectId: null,
  backlogData: null,
  selectedEpicId: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Core Operations</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Backlog</span>
          </div>
          <h1 class="page-title">Scrum & Product Backlog</h1>
          <p class="page-subtitle">Prioritize user stories, estimate story points, and plan iteration sprints</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="backlog-project-select" class="select-input" onchange="BacklogView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="BacklogView.openCreateSprintModal()">+ Create Sprint</button>
          <button class="btn btn-primary btn-sm" onclick="IssuesView.currentProjectId = BacklogView.currentProjectId; IssuesView.openCreateIssueModal()">+ Create Issue</button>
        </div>
      </div>

      <!-- Epics Horizontal Bar -->
      <div id="backlog-epics-bar" style="margin-bottom: 1.25rem; display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.35rem;"></div>

      <!-- Main Backlog Container -->
      <div id="backlog-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Backlog...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("backlog-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadBacklog();
      } else {
        const container = document.getElementById("backlog-main-container");
        if (container) {
          container.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📦</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project or switch to an Administrator account to manage product backlogs.</p>
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
    this.selectedEpicId = null;
    await this.loadBacklog();
  },

  async loadBacklog() {
    const container = document.getElementById("backlog-main-container");
    const epicsBar = document.getElementById("backlog-epics-bar");
    if (!container || !this.currentProjectId) return;

    try {
      this.backlogData = await API.get(`/pm/projects/${this.currentProjectId}/backlog`);
      const data = this.backlogData;

      // Render Epics filter chips
      if (epicsBar && data.epics) {
        epicsBar.innerHTML = `
          <button class="badge ${this.selectedEpicId === null ? 'badge-primary' : 'badge-neutral'}" style="cursor: pointer; padding: 6px 12px; font-size: 0.8rem;" onclick="BacklogView.filterByEpic(null)">
            All Epics (${data.epics.length})
          </button>
          ${data.epics.map(ep => `
            <button class="badge ${this.selectedEpicId === ep.id ? 'badge-purple' : 'badge-neutral'}" style="cursor: pointer; padding: 6px 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem;" onclick="BacklogView.filterByEpic(${ep.id})">
              🟣 ${UI.escapeHtml(ep.title)} &nbsp;<strong>${ep.progress_percentage}%</strong>
            </button>
          `).join("")}
        `;
      }

      this.renderBacklogHtml(container, data);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load backlog: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  filterByEpic(epicId) {
    this.selectedEpicId = epicId;
    this.loadBacklog();
  },

  renderBacklogHtml(container, data) {
    const allSprints = [...(data.active_sprints || []), ...(data.planned_sprints || [])];
    const productIssues = (data.product_backlog || []).filter(i => this.selectedEpicId === null || i.epic_id === this.selectedEpicId);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Active & Planned Sprints -->
        ${allSprints.map(s => {
          const sIssues = (s.issues || []).filter(i => this.selectedEpicId === null || i.epic_id === this.selectedEpicId);
          return `
            <div class="card" style="border: 1px solid var(--border-color); padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <span style="font-size: 1.05rem; font-weight: 700;">${UI.escapeHtml(s.name)}</span>
                    <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}">${s.status.toUpperCase()}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${sIssues.length} issues &bull; <strong>${s.total_story_points} pts</strong></span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
                    🎯 Goal: ${UI.escapeHtml(s.goal || "No goal specified")} &nbsp;|&nbsp; 📅 ${new Date(s.start_date).toLocaleDateString()} – ${new Date(s.end_date).toLocaleDateString()}
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  ${s.status === 'planning' ? `
                    <button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint(${s.id})">Start Sprint</button>
                  ` : `
                    <button class="btn btn-secondary btn-sm" onclick="BacklogView.completeSprint(${s.id})">Complete Sprint</button>
                  `}
                </div>
              </div>

              <!-- Sprint Issues List -->
              <div class="backlog-issue-list" ondragover="event.preventDefault()" ondrop="BacklogView.onDropIssue(event, ${s.id})">
                ${sIssues.length === 0 ? `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Drag issues here or plan backlog items into this sprint.</div>` : ""}
                ${sIssues.map(item => this.renderIssueRow(item, s.id, allSprints)).join("")}
              </div>
            </div>
          `;
        }).join("")}

        <!-- Product Backlog Box -->
        <div class="card" style="border: 1px solid var(--border-color); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <div>
              <span style="font-size: 1.05rem; font-weight: 700;">Product Backlog</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">${productIssues.length} issues &bull; <strong>${data.total_backlog_story_points} pts</strong></span>
            </div>
          </div>

          <!-- Quick Create in Backlog -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <input type="text" id="quick-backlog-input" class="form-control" placeholder="+ What needs to be done? Press enter to add to backlog..." onkeydown="if(event.key === 'Enter') BacklogView.quickCreateBacklogIssue()">
            <button class="btn btn-secondary btn-sm" onclick="BacklogView.quickCreateBacklogIssue()">Add</button>
          </div>

          <div class="backlog-issue-list" ondragover="event.preventDefault()" ondrop="BacklogView.onDropIssue(event, null)">
            ${productIssues.length === 0 ? `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Product backlog is empty. Great job!</div>` : ""}
            ${productIssues.map(item => this.renderIssueRow(item, null, allSprints)).join("")}
          </div>
        </div>
      </div>
    `;
  },

  renderIssueRow(item, currentSprintId, allSprints) {
    return `
      <div class="backlog-item-row" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', ${item.id})" style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.35rem; cursor: pointer; transition: var(--transition);" onclick="IssuesView.openIssueDetailModal('${item.issue_key || item.id}')">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="cursor: grab; color: var(--text-muted);">⋮⋮</span>
          <span class="badge badge-neutral" style="font-family: monospace; font-size: 0.8rem; font-weight: 700; color: #2563eb;">
            ${UI.escapeHtml(item.issue_key || `#${item.id}`)}
          </span>
          <span style="font-size: 0.85rem;">${IssuesView.getTypeIcon(item.issue_type)}</span>
          <span style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">${UI.escapeHtml(item.title)}</span>
          ${item.epic_title ? `<span style="font-size: 0.7rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 2px 6px; border-radius: 4px; font-weight: 600;">🟣 ${UI.escapeHtml(item.epic_title)}</span>` : ""}
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;" onclick="event.stopPropagation()">
          <span class="badge ${IssuesView.getStatusBadge(item.status)}" style="font-size: 0.7rem;">${item.status}</span>
          <span class="badge badge-neutral" style="font-weight: 700; font-size: 0.75rem;">${item.story_points || 0} pts</span>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${item.assigned_to_name ? `👤 ${UI.escapeHtml(item.assigned_to_name)}` : "Unassigned"}</span>

          <!-- Move to Sprint Dropdown -->
          <select class="select-input" style="padding: 2px 6px; font-size: 0.75rem;" onchange="BacklogView.moveIssueToSprint(${item.id}, this.value)">
            <option value="" disabled selected>Move to...</option>
            ${currentSprintId !== null ? `<option value="-1">📦 Product Backlog</option>` : ""}
            ${allSprints.filter(s => s.id !== currentSprintId).map(s => `
              <option value="${s.id}">🏃 ${UI.escapeHtml(s.name)}</option>
            `).join("")}
          </select>
        </div>
      </div>
    `;
  },

  async moveIssueToSprint(issueId, targetSprintId) {
    const sId = targetSprintId === "-1" ? null : parseInt(targetSprintId);
    try {
      await API.put(`/pm/projects/${this.currentProjectId}/issues/${issueId}/reorder`, {
        target_sprint_id: sId,
      });
      UI.success("Sprint assignment updated!");
      await this.loadBacklog();
    } catch (e) {
      UI.error(e.message);
    }
  },

  async onDropIssue(e, targetSprintId) {
    e.preventDefault();
    const issueId = e.dataTransfer.getData("text/plain");
    if (!issueId) return;
    await this.moveIssueToSprint(parseInt(issueId), targetSprintId === null ? "-1" : targetSprintId.toString());
  },

  async quickCreateBacklogIssue() {
    const input = document.getElementById("quick-backlog-input");
    if (!input || !input.value.trim()) return;

    try {
      await API.post(`/pm/projects/${this.currentProjectId}/issues`, {
        title: input.value.trim(),
        issue_type: "story",
        story_points: 3,
      });
      input.value = "";
      UI.success("Added to Product Backlog!");
      await this.loadBacklog();
    } catch (e) {
      UI.error(e.message);
    }
  },

  openCreateSprintModal() {
    const today = new Date().toISOString().split("T")[0];
    const next2Weeks = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

    const html = `
      <form id="create-sprint-form" onsubmit="BacklogView.handleCreateSprint(event)">
        <div class="form-group">
          <label class="form-label">Sprint Name *</label>
          <input type="text" id="new-sprint-name" class="form-control" required placeholder="e.g. Sprint 1 - Core Services">
        </div>
        <div class="form-group">
          <label class="form-label">Sprint Goal</label>
          <textarea id="new-sprint-goal" class="form-control" rows="2" placeholder="e.g. Deliver functional auth and database migrations"></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input type="date" id="new-sprint-start" class="form-control" required value="${today}">
          </div>
          <div class="form-group">
            <label class="form-label">End Date *</label>
            <input type="date" id="new-sprint-end" class="form-control" required value="${next2Weeks}">
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Create Sprint</button>
      </form>
    `;
    UI.showModal("Plan New Sprint", html);
  },

  async handleCreateSprint(e) {
    e.preventDefault();
    const name = document.getElementById("new-sprint-name").value;
    const goal = document.getElementById("new-sprint-goal").value;
    const start = document.getElementById("new-sprint-start").value;
    const end = document.getElementById("new-sprint-end").value;

    try {
      await API.post(`/projects/${this.currentProjectId}/sprints`, {
        name: name,
        goal: goal,
        start_date: new Date(start).toISOString(),
        end_date: new Date(end).toISOString(),
      });
      UI.success("Sprint created successfully!");
      UI.closeModal();
      await this.loadBacklog();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async startSprint(sprintId) {
    try {
      await API.put(`/projects/${this.currentProjectId}/sprints/${sprintId}`, {
        status: "active",
      });
      UI.success("Sprint is now ACTIVE!");
      await this.loadBacklog();
    } catch (e) {
      UI.error(e.message);
    }
  },

  async completeSprint(sprintId) {
    if (!confirm("Are you sure you want to complete this sprint? Incomplete issues will roll over.")) return;
    try {
      await API.put(`/projects/${this.currentProjectId}/sprints/${sprintId}`, {
        status: "completed",
      });
      UI.success("Sprint COMPLETED!");
      await this.loadBacklog();
    } catch (e) {
      UI.error(e.message);
    }
  },
};

window.BacklogView = BacklogView;
