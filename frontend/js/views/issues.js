/**
 * DevTrack Jira-Inspired Issue Tracking System
 * Full Issue Registry, Filtering, Search by Key (DEV-1001), and Rich Issue Detail Modal
 */

const IssuesView = {
  currentProjectId: null,
  issuesList: [],
  activeFilters: {
    issue_type: "",
    status: "",
    priority: "",
    search: "",
  },

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Core Operations</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Issues</span>
          </div>
          <h1 class="page-title">Issue Navigator & Tracking</h1>
          <p class="page-subtitle">Jira-style work items: Epics, User Stories, Tasks, Bugs, Features, Improvements, and Subtasks</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="issue-project-select" class="select-input" onchange="IssuesView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="IssuesView.openCreateIssueModal()">+ Create Issue</button>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: center;">
        <div style="flex: 1; min-width: 220px; position: relative;">
          <input type="text" id="issue-search-input" class="form-control" placeholder="Search by title, description or key (e.g. DEV-1001)..." oninput="IssuesView.onSearchInput(this.value)">
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <select id="filter-issue-type" class="select-input" style="font-size: 0.825rem;" onchange="IssuesView.onFilterChange('issue_type', this.value)">
            <option value="">All Types</option>
            <option value="epic">🟣 Epic</option>
            <option value="story">🟢 Story</option>
            <option value="task">🔵 Task</option>
            <option value="bug">🔴 Bug</option>
            <option value="feature">🟡 Feature</option>
            <option value="improvement">🔷 Improvement</option>
            <option value="subtask">⚪ Subtask</option>
          </select>

          <select id="filter-status" class="select-input" style="font-size: 0.825rem;" onchange="IssuesView.onFilterChange('status', this.value)">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="in_review">In Review</option>
            <option value="testing">Testing</option>
            <option value="done">Done</option>
          </select>

          <select id="filter-priority" class="select-input" style="font-size: 0.825rem;" onchange="IssuesView.onFilterChange('priority', this.value)">
            <option value="">All Priorities</option>
            <option value="highest">Highest</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="lowest">Lowest</option>
          </select>

          <button class="btn btn-secondary btn-sm" onclick="IssuesView.resetFilters()">Reset</button>
        </div>
      </div>

      <!-- Issues Table Container -->
      <div id="issues-table-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading issues...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.initProjectSelector();
  },

  async initProjectSelector() {
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("issue-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadIssues();
      } else {
        document.getElementById("issues-table-container").innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No projects available. Create a project first!
          </div>
        `;
      }
    } catch (e) {
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadIssues();
  },

  async loadIssues() {
    const container = document.getElementById("issues-table-container");
    if (!container || !this.currentProjectId) return;

    try {
      const params = new URLSearchParams();
      if (this.activeFilters.issue_type) params.append("issue_type", this.activeFilters.issue_type);
      if (this.activeFilters.status) params.append("status", this.activeFilters.status);
      if (this.activeFilters.priority) params.append("priority", this.activeFilters.priority);
      if (this.activeFilters.search) params.append("search", this.activeFilters.search);

      const qs = params.toString() ? `?${params.toString()}` : "";
      this.issuesList = await API.get(`/pm/projects/${this.currentProjectId}/issues${qs}`);
      this.renderTable(container);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load issues: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  onFilterChange(key, value) {
    this.activeFilters[key] = value;
    this.loadIssues();
  },

  onSearchInput(val) {
    this.activeFilters.search = val.trim();
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadIssues(), 300);
  },

  resetFilters() {
    this.activeFilters = { issue_type: "", status: "", priority: "", search: "" };
    const searchInput = document.getElementById("issue-search-input");
    if (searchInput) searchInput.value = "";
    document.getElementById("filter-issue-type").value = "";
    document.getElementById("filter-status").value = "";
    document.getElementById("filter-priority").value = "";
    this.loadIssues();
  },

  getTypeIcon(type) {
    const icons = {
      epic: "🟣 Epic",
      story: "🟢 Story",
      task: "🔵 Task",
      bug: "🔴 Bug",
      feature: "🟡 Feature",
      improvement: "🔷 Improvement",
      subtask: "⚪ Subtask",
    };
    return icons[type] || "🔵 Task";
  },

  getStatusBadge(status) {
    const badges = {
      open: "badge-neutral",
      todo: "badge-info",
      in_progress: "badge-warning",
      blocked: "badge-danger",
      in_review: "badge-purple",
      testing: "badge-teal",
      done: "badge-success",
      completed: "badge-success",
    };
    return badges[status] || "badge-neutral";
  },

  getPriorityBadge(priority) {
    const badges = {
      lowest: "badge-neutral",
      low: "badge-neutral",
      medium: "badge-info",
      high: "badge-warning",
      highest: "badge-danger",
      urgent: "badge-danger",
    };
    return badges[priority] || "badge-neutral";
  },

  renderTable(container) {
    const issues = this.issuesList;
    if (issues.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No issues found matching your filters. <button class="btn btn-secondary btn-sm" style="margin-left: 0.5rem;" onclick="IssuesView.openCreateIssueModal()">+ Create New Issue</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container card" style="padding: 0;">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 120px;">KEY</th>
              <th style="width: 130px;">TYPE</th>
              <th>SUMMARY / TITLE</th>
              <th>STATUS</th>
              <th>PRIORITY</th>
              <th style="width: 70px;">PTS</th>
              <th>ASSIGNEE</th>
              <th>EPIC</th>
              <th style="text-align: right;">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${issues.map(item => `
              <tr style="cursor: pointer;" onclick="IssuesView.openIssueDetailModal('${item.issue_key || item.id}')">
                <td>
                  <span class="badge badge-neutral" style="font-family: monospace; font-weight: 700; color: #2563eb;">
                    ${UI.escapeHtml(item.issue_key || `#${item.id}`)}
                  </span>
                </td>
                <td style="font-size: 0.8rem; font-weight: 600;">
                  ${this.getTypeIcon(item.issue_type)}
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">
                    ${UI.escapeHtml(item.title)}
                  </div>
                  ${item.labels ? `
                    <div style="display: flex; gap: 0.25rem; margin-top: 0.2rem;">
                      ${item.labels.split(",").map(l => `<span style="font-size: 0.65rem; background: var(--bg-surface-hover); padding: 1px 5px; border-radius: 4px; color: var(--text-muted);">${UI.escapeHtml(l.trim())}</span>`).join("")}
                    </div>
                  ` : ""}
                </td>
                <td>
                  <span class="badge ${this.getStatusBadge(item.status)}">
                    ${UI.escapeHtml(item.status.replace("_", " "))}
                  </span>
                </td>
                <td>
                  <span class="badge ${this.getPriorityBadge(item.priority)}">
                    ${UI.escapeHtml(item.priority)}
                  </span>
                </td>
                <td style="font-weight: 700; font-size: 0.825rem; text-align: center;">
                  ${item.story_points > 0 ? item.story_points : "—"}
                </td>
                <td style="font-size: 0.825rem; color: var(--text-secondary);">
                  ${item.assigned_to_name ? `👤 ${UI.escapeHtml(item.assigned_to_name)}` : `<span style="color: var(--text-muted);">Unassigned</span>`}
                </td>
                <td style="font-size: 0.8rem; color: #8b5cf6; font-weight: 500;">
                  ${item.epic_title ? `🟣 ${UI.escapeHtml(item.epic_title)}` : "—"}
                </td>
                <td style="text-align: right;" onclick="event.stopPropagation()">
                  <button class="btn btn-secondary btn-sm" onclick="IssuesView.openIssueDetailModal('${item.issue_key || item.id}')" title="Inspect Issue">View</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  },

  // Full Jira-Inspired Issue Detail Modal
  async openIssueDetailModal(keyOrId) {
    try {
      const issue = await API.get(`/pm/issues/${keyOrId}`);
      if (!issue) {
        UI.error("Issue not found");
        return;
      }

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Header Bar with Key and Copy -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span class="badge badge-neutral" style="font-family: monospace; font-size: 0.95rem; font-weight: 800; color: #2563eb;">
                ${UI.escapeHtml(issue.issue_key)}
              </span>
              <span style="font-size: 0.85rem; font-weight: 600;">${this.getTypeIcon(issue.issue_type)}</span>
              <span class="badge ${this.getStatusBadge(issue.status)}">${UI.escapeHtml(issue.status.toUpperCase())}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Project: <strong>${UI.escapeHtml(issue.project_name || "Campus PMS")}</strong>
            </div>
          </div>

          <!-- Main Layout: 2 Columns (Content & Metadata Panel) -->
          <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 1.5rem;">
            <!-- Left Column: Title, Description, Subtasks, Activity -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div>
                <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase;">Issue Summary</label>
                <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                  ${UI.escapeHtml(issue.title)}
                </h2>
              </div>

              <div>
                <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase;">Description</label>
                <div class="card" style="background: var(--bg-surface-hover); min-height: 80px; font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap;">
                  ${UI.escapeHtml(issue.description || "No description provided.")}
                </div>
              </div>

              <!-- Subtasks Checklist -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <h4 style="font-size: 0.9rem; font-weight: 700;">Subtasks (${issue.subtasks ? issue.subtasks.length : 0})</h4>
                  <button class="btn btn-secondary btn-sm" onclick="IssuesView.openAddSubtaskModal(${issue.id}, '${issue.project_id}')">+ Add Subtask</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                  ${(!issue.subtasks || issue.subtasks.length === 0) ? `<div style="font-size: 0.8rem; color: var(--text-muted);">No subtasks yet.</div>` : ""}
                  ${(issue.subtasks || []).map(st => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.65rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); font-size: 0.825rem;">
                      <div>
                        <span style="font-family: monospace; color: #2563eb; font-weight: 600;">${st.issue_key}</span> &nbsp;
                        <span>${UI.escapeHtml(st.title)}</span>
                      </div>
                      <span class="badge ${this.getStatusBadge(st.status)}">${st.status}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Time Tracking & Work Logs -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <h4 style="font-size: 0.9rem; font-weight: 700;">Time Tracking (${issue.actual_hours || 0}h / ${issue.estimated_hours || 0}h)</h4>
                  <button class="btn btn-secondary btn-sm" onclick="IssuesView.openLogWorkModal(${issue.id}, '${issue.project_id}')">⏱ Log Work</button>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-surface-hover); border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
                  <div style="height: 100%; width: ${Math.min(100, Math.round(((issue.actual_hours || 0) / (issue.estimated_hours || 1)) * 100))}%; background: #2563eb;"></div>
                </div>
                ${(issue.work_logs && issue.work_logs.length > 0) ? `
                  <div style="max-height: 120px; overflow-y: auto; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
                    ${issue.work_logs.map(wl => `
                      <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-hover); border-radius: 4px;">
                        <span>👤 ${UI.escapeHtml(wl.user_name)}: ${UI.escapeHtml(wl.description || "Logged time")}</span>
                        <strong>+${wl.hours_spent}h</strong>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              <!-- Comments & Activity -->
              <div>
                <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem;">Activity & Discussion (${issue.comments_count || 0})</h4>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                  <input type="text" id="issue-comment-text" class="form-control" placeholder="Add a comment or update team...">
                  <button class="btn btn-primary btn-sm" onclick="IssuesView.submitComment(${issue.id}, '${issue.project_id}', '${issue.issue_key}')">Post</button>
                </div>
              </div>
            </div>

            <!-- Right Column: Status Transitions & Editable Attributes -->
            <div class="card" style="display: flex; flex-direction: column; gap: 1rem; height: fit-content;">
              <div>
                <label class="form-label" style="font-size: 0.75rem;">Status</label>
                <select class="select-input" style="width: 100%;" onchange="IssuesView.updateIssueStatus(${issue.id}, '${issue.project_id}', this.value, '${issue.issue_key}')">
                  ${["open", "todo", "in_progress", "blocked", "in_review", "testing", "done"].map(st => `
                    <option value="${st}" ${issue.status === st ? "selected" : ""}>${st.replace("_", " ").toUpperCase()}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label class="form-label" style="font-size: 0.75rem;">Priority</label>
                <div style="font-size: 0.85rem; font-weight: 600;">
                  <span class="badge ${this.getPriorityBadge(issue.priority)}">${issue.priority.toUpperCase()}</span>
                </div>
              </div>

              <div>
                <label class="form-label" style="font-size: 0.75rem;">Story Points</label>
                <div style="font-size: 0.9rem; font-weight: 700; color: #2563eb;">
                  ${issue.story_points || 0} pts
                </div>
              </div>

              <div>
                <label class="form-label" style="font-size: 0.75rem;">Assignee</label>
                <div style="font-size: 0.85rem;">
                  ${issue.assigned_to_name ? `👤 ${UI.escapeHtml(issue.assigned_to_name)}` : `<span style="color: var(--text-muted);">Unassigned</span>`}
                </div>
              </div>

              <div>
                <label class="form-label" style="font-size: 0.75rem;">Reporter</label>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  👤 ${UI.escapeHtml(issue.reporter_name || "System Admin")}
                </div>
              </div>

              ${issue.epic_title ? `
                <div>
                  <label class="form-label" style="font-size: 0.75rem;">Parent Epic</label>
                  <div style="font-size: 0.825rem; color: #8b5cf6; font-weight: 600;">
                    🟣 ${UI.escapeHtml(issue.epic_title)}
                  </div>
                </div>
              ` : ""}

              <div>
                <label class="form-label" style="font-size: 0.75rem;">Due Date</label>
                <div style="font-size: 0.825rem; color: var(--text-secondary);">
                  📅 ${issue.due_date ? new Date(issue.due_date).toLocaleDateString() : "No due date"}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      UI.showModal(`Issue Detail: ${issue.issue_key}`, modalHtml);
    } catch (e) {
      UI.error(e.message);
    }
  },

  async updateIssueStatus(issueId, projectId, newStatus, issueKey) {
    try {
      await API.put(`/pm/projects/${projectId}/issues/${issueId}`, { status: newStatus });
      UI.success(`Status updated to ${newStatus.toUpperCase()}`);
      await this.loadIssues();
      this.openIssueDetailModal(issueKey);
    } catch (e) {
      UI.error(e.message);
    }
  },

  async submitComment(taskId, projectId, issueKey) {
    const input = document.getElementById("issue-comment-text");
    if (!input || !input.value.trim()) return;

    try {
      await API.post(`/projects/${projectId}/tasks/${taskId}/comments`, {
        content: input.value.trim(),
      });
      UI.success("Comment added!");
      this.openIssueDetailModal(issueKey);
    } catch (e) {
      UI.error(e.message);
    }
  },

  openLogWorkModal(taskId, projectId) {
    const html = `
      <form id="log-work-form" onsubmit="IssuesView.handleLogWork(event, ${taskId}, '${projectId}')">
        <div class="form-group">
          <label class="form-label">Time Spent (in Hours) *</label>
          <input type="number" step="0.25" id="worklog-hours" class="form-control" required placeholder="e.g. 2.5">
        </div>
        <div class="form-group">
          <label class="form-label">Work Description</label>
          <textarea id="worklog-desc" class="form-control" rows="3" placeholder="What did you work on?"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Save Work Log</button>
      </form>
    `;
    UI.showModal("Log Time Worked", html);
  },

  async handleLogWork(e, taskId, projectId) {
    e.preventDefault();
    const hours = parseFloat(document.getElementById("worklog-hours").value);
    const desc = document.getElementById("worklog-desc").value;

    try {
      await API.post(`/pm/projects/${projectId}/tasks/${taskId}/worklogs`, {
        hours_spent: hours,
        description: desc,
      });
      UI.success("Time successfully logged!");
      UI.closeModal();
      this.openIssueDetailModal(taskId);
      this.loadIssues();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openAddSubtaskModal(parentTaskId, projectId) {
    const html = `
      <form id="add-subtask-form" onsubmit="IssuesView.handleAddSubtask(event, ${parentTaskId}, '${projectId}')">
        <div class="form-group">
          <label class="form-label">Subtask Title *</label>
          <input type="text" id="subtask-title" class="form-control" required placeholder="e.g. Unit test verification">
        </div>
        <div class="form-group">
          <label class="form-label">Estimated Hours</label>
          <input type="number" step="0.5" id="subtask-estimate" class="form-control" value="2.0">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Create Subtask</button>
      </form>
    `;
    UI.showModal("Add Subtask", html);
  },

  async handleAddSubtask(e, parentTaskId, projectId) {
    e.preventDefault();
    const title = document.getElementById("subtask-title").value;
    const est = parseFloat(document.getElementById("subtask-estimate").value) || 0;

    try {
      await API.post(`/pm/projects/${projectId}/issues`, {
        title: title,
        issue_type: "subtask",
        parent_task_id: parentTaskId,
        estimated_hours: est,
      });
      UI.success("Subtask created!");
      UI.closeModal();
      this.openIssueDetailModal(parentTaskId);
    } catch (err) {
      UI.error(err.message);
    }
  },

  async openCreateIssueModal() {
    if (!this.currentProjectId) {
      UI.warning("Please select a project first.");
      return;
    }

    try {
      const [epics, users] = await Promise.all([
        API.get(`/pm/projects/${this.currentProjectId}/epics`),
        API.get(`/users/`),
      ]);

      const html = `
        <form id="create-issue-form" onsubmit="IssuesView.handleCreateIssue(event)">
          <div class="form-group">
            <label class="form-label">Issue Type *</label>
            <select id="new-issue-type" class="select-input" style="width: 100%;">
              <option value="task">🔵 Task</option>
              <option value="story">🟢 User Story</option>
              <option value="bug">🔴 Bug</option>
              <option value="epic">🟣 Epic</option>
              <option value="feature">🟡 Feature</option>
              <option value="improvement">🔷 Improvement</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Summary / Title *</label>
            <input type="text" id="new-issue-title" class="form-control" required placeholder="e.g. Implement JWT session token refresh">
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="new-issue-desc" class="form-control" rows="3" placeholder="Provide detailed acceptance criteria and technical notes..."></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="new-issue-priority" class="select-input" style="width: 100%;">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
                <option value="low">Low</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Story Points</label>
              <input type="number" id="new-issue-pts" class="form-control" value="3" min="0">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Assignee</label>
              <select id="new-issue-assignee" class="select-input" style="width: 100%;">
                <option value="">Unassigned</option>
                ${users.map(u => `<option value="${u.id}">${UI.escapeHtml(u.name)} (${u.role})</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Parent Epic</label>
              <select id="new-issue-epic" class="select-input" style="width: 100%;">
                <option value="">None</option>
                ${epics.map(ep => `<option value="${ep.id}">🟣 ${UI.escapeHtml(ep.title)}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Labels (comma-separated)</label>
            <input type="text" id="new-issue-labels" class="form-control" placeholder="e.g. frontend, auth, high-priority">
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">Create Issue</button>
        </form>
      `;

      UI.showModal("Create Issue", html);
    } catch (e) {
      UI.error(e.message);
    }
  },

  async handleCreateIssue(e) {
    e.preventDefault();
    const type = document.getElementById("new-issue-type").value;
    const title = document.getElementById("new-issue-title").value;
    const desc = document.getElementById("new-issue-desc").value;
    const priority = document.getElementById("new-issue-priority").value;
    const pts = parseInt(document.getElementById("new-issue-pts").value) || 0;
    const assignee = document.getElementById("new-issue-assignee").value ? parseInt(document.getElementById("new-issue-assignee").value) : null;
    const epic = document.getElementById("new-issue-epic").value ? parseInt(document.getElementById("new-issue-epic").value) : null;
    const labels = document.getElementById("new-issue-labels").value.trim() || null;

    try {
      const issue = await API.post(`/pm/projects/${this.currentProjectId}/issues`, {
        title: title,
        description: desc,
        issue_type: type,
        priority: priority,
        story_points: pts,
        assigned_to_id: assignee,
        epic_id: epic,
        labels: labels,
      });

      UI.success(`Created Issue ${issue.issue_key}!`);
      UI.closeModal();
      await this.loadIssues();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.IssuesView = IssuesView;
