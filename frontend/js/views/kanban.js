/**
 * DevTrack Advanced Jira-Inspired Kanban Board View
 * Customizable Columns, WIP Limits, Story Points, Issue Key Badges, Drag & Drop, and Filters
 */

const KanbanView = {
  activeProjectId: null,
  boardData: null,
  filterType: "",
  filterPriority: "",
  searchQuery: "",

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Core Operations</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Kanban Board</span>
          </div>
          <h1 class="page-title">Agile Kanban Board</h1>
          <p class="page-subtitle">Interactive visual pipeline across full development stages with WIP limits and story points</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="kanban-project-select" class="select-input" onchange="KanbanView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="IssuesView.currentProjectId = KanbanView.activeProjectId; IssuesView.openCreateIssueModal()">+ Create Issue</button>
        </div>
      </div>

      <!-- Quick Filter Strip -->
      <div class="card" style="padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <input type="text" id="kanban-search" class="form-control" style="width: 220px; padding: 0.4rem 0.65rem; font-size: 0.825rem;" placeholder="Filter board cards..." oninput="KanbanView.onSearch(this.value)">

        <select id="kanban-type-filter" class="select-input" style="font-size: 0.8rem;" onchange="KanbanView.onTypeFilter(this.value)">
          <option value="">All Types</option>
          <option value="story">🟢 Stories</option>
          <option value="task">🔵 Tasks</option>
          <option value="bug">🔴 Bugs</option>
          <option value="feature">🟡 Features</option>
          <option value="improvement">🔷 Improvements</option>
        </select>

        <select id="kanban-priority-filter" class="select-input" style="font-size: 0.8rem;" onchange="KanbanView.onPriorityFilter(this.value)">
          <option value="">All Priorities</option>
          <option value="highest">Highest</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button class="btn btn-secondary btn-sm" onclick="KanbanView.clearFilters()">Clear</button>
      </div>

      <div id="kanban-board-container" style="overflow-x: auto; padding-bottom: 1rem;">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Kanban Board...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.initProjectSelector();
  },

  async initProjectSelector() {
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("kanban-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.activeProjectId = projects[0].id;
        select.value = this.activeProjectId;
        await this.loadBoard(this.activeProjectId, "kanban-board-container");
      } else {
        const container = document.getElementById("kanban-board-container");
        if (container) {
          container.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📋</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">You do not have any active projects assigned. Switch to an Admin account or create a project to start.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      UI.error(e.message);
      const container = document.getElementById("kanban-board-container");
      if (container) {
        container.innerHTML = `<div style="padding: 2.5rem; text-align: center; color: var(--danger); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Kanban Board: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="KanbanView.initProjectSelector()">Retry</button>
        </div>`;
      }
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.activeProjectId = projectId;
    await this.loadBoard(projectId, "kanban-board-container");
  },

  onSearch(val) {
    this.searchQuery = val.toLowerCase().trim();
    this.renderBoardHtml(document.getElementById("kanban-board-container"));
  },

  onTypeFilter(val) {
    this.filterType = val;
    this.renderBoardHtml(document.getElementById("kanban-board-container"));
  },

  onPriorityFilter(val) {
    this.filterPriority = val;
    this.renderBoardHtml(document.getElementById("kanban-board-container"));
  },

  clearFilters() {
    this.searchQuery = "";
    this.filterType = "";
    this.filterPriority = "";
    document.getElementById("kanban-search").value = "";
    document.getElementById("kanban-type-filter").value = "";
    document.getElementById("kanban-priority-filter").value = "";
    this.renderBoardHtml(document.getElementById("kanban-board-container"));
  },

  async loadBoard(projectId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      this.boardData = await API.get(`/projects/${projectId}/tasks/kanban`);
      this.renderBoardHtml(container);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load Kanban board: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderBoardHtml(container) {
    if (!container) return;
    const data = this.boardData;
    if (!data || !data.lanes) return;

    container.innerHTML = `
      <div class="kanban-board" style="display: flex; gap: 1rem; align-items: flex-start; min-width: 1400px;">
        ${data.lanes.map(lane => {
          let tasks = lane.tasks || [];
          if (this.filterType) tasks = tasks.filter(t => t.issue_type === this.filterType);
          if (this.filterPriority) tasks = tasks.filter(t => (t.priority || "").toLowerCase() === this.filterPriority);
          if (this.searchQuery) {
            tasks = tasks.filter(t => 
              (t.title || "").toLowerCase().includes(this.searchQuery) || 
              (t.issue_key || "").toLowerCase().includes(this.searchQuery)
            );
          }

          const laneStoryPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
          const isOverWip = lane.wip_limit > 0 && tasks.length > lane.wip_limit;

          return `
            <div class="kanban-column" id="lane-${lane.status}" style="flex: 1; min-width: 200px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);" ondragover="KanbanView.onDragOver(event)" ondrop="KanbanView.onDrop(event, '${lane.status}')">
              <!-- Lane Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; padding-bottom: 0.5rem; border-bottom: 2px solid ${lane.color || '#3b82f6'};">
                <div style="display: flex; align-items: center; gap: 0.45rem;">
                  <span style="font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--text-primary);">${UI.escapeHtml(lane.title)}</span>
                  <span class="badge ${isOverWip ? 'badge-danger' : 'badge-neutral'}" style="font-size: 0.7rem; font-weight: 700;">
                    ${tasks.length}${lane.wip_limit > 0 ? ` / ${lane.wip_limit}` : ""}
                  </span>
                </div>
                <span style="font-size: 0.725rem; font-weight: 600; color: var(--text-muted);">
                  ${laneStoryPoints} pts
                </span>
              </div>

              <!-- Lane Cards Container -->
              <div class="kanban-cards" style="display: flex; flex-direction: column; gap: 0.65rem; min-height: 250px;">
                ${tasks.map(t => this.renderCard(t)).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  renderCard(task) {
    const priorityBadge = {
      lowest: "badge-neutral",
      low: "badge-neutral",
      medium: "badge-info",
      high: "badge-warning",
      highest: "badge-danger",
      urgent: "badge-danger",
    }[(task.priority || "").toLowerCase()] || "badge-neutral";

    return `
      <div class="kanban-card card" id="task-card-${task.id}" draggable="true" ondragstart="KanbanView.onDragStart(event, ${task.id})" onclick="IssuesView.openIssueDetailModal('${task.issue_key || task.id}')" style="cursor: pointer; padding: 0.85rem; margin: 0; border: 1px solid var(--border-color); border-radius: var(--radius-sm); transition: var(--transition);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <span class="badge badge-neutral" style="font-family: monospace; font-size: 0.75rem; font-weight: 700; color: #2563eb;">
            ${UI.escapeHtml(task.issue_key || `#${task.id}`)}
          </span>
          <span style="font-size: 0.75rem;">${IssuesView.getTypeIcon(task.issue_type)}</span>
        </div>

        <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); line-height: 1.35; margin-bottom: 0.5rem;">
          ${UI.escapeHtml(task.title)}
        </div>

        ${task.epic_title ? `
          <div style="margin-bottom: 0.5rem;">
            <span style="font-size: 0.65rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
              🟣 ${UI.escapeHtml(task.epic_title)}
            </span>
          </div>
        ` : ""}

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span class="badge ${priorityBadge}" style="font-size: 0.65rem;">${task.priority}</span>
            <span class="badge badge-neutral" style="font-weight: 700; font-size: 0.65rem;">${task.story_points || 0} pts</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">
            ${task.assigned_to_name ? `👤 ${UI.escapeHtml(task.assigned_to_name.split(' ')[0])}` : `Unassigned`}
          </div>
        </div>
      </div>
    `;
  },

  onDragStart(e, taskId) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  },

  async onDrop(e, targetStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    await this.moveTask(parseInt(taskId), targetStatus);
  },

  async moveTask(taskId, newStatus) {
    try {
      await API.put(`/pm/projects/${this.activeProjectId}/issues/${taskId}`, {
        status: newStatus,
      });
      UI.success(`Card moved to ${newStatus.replace("_", " ").toUpperCase()}`);
      await this.loadBoard(this.activeProjectId, "kanban-board-container");
    } catch (e) {
      UI.error(e.message);
      const container = document.getElementById("kanban-board-container");
      if (container) {
        container.innerHTML = `<div style="padding: 2.5rem; text-align: center; color: var(--danger); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Kanban Board: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="KanbanView.initProjectSelector()">Retry</button>
        </div>`;
      }
    }
  },
};

window.KanbanView = KanbanView;

