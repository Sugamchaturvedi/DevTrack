/**
 * DevTrack Project Detail Hub
 * Tabs: Overview, Tasks / Kanban, Sprints, Submissions, Discussions, Team
 */

const ProjectDetailView = {
  currentProjectId: null,
  projectData: null,
  activeTab: "overview",

  async render(projectId) {
    this.currentProjectId = projectId;
    return `
      <div id="project-detail-content">
        <div style="padding: 2rem; text-align: center;">Loading project details...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.loadProject();
  },

  async loadProject() {
    try {
      this.projectData = await API.get(`/projects/${this.currentProjectId}`);
      this.renderHub();
    } catch (e) {
      document.getElementById("project-detail-content").innerHTML = `
        <div class="card" style="color: var(--danger);">
          Failed to load project: ${UI.escapeHtml(e.message)}
          <br><br>
          <button class="btn btn-secondary" onclick="window.location.hash='#/projects'">Back to Projects</button>
        </div>
      `;
    }
  },

  renderHub() {
    const p = this.projectData;
    const container = document.getElementById("project-detail-content");
    if (!container) return;

    container.innerHTML = `
      <div class="page-header" style="margin-bottom: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h1 class="page-title">${UI.escapeHtml(p.name)}</h1>
            <span class="badge badge-info">${UI.escapeHtml(p.code || `PRJ-${p.id}`)}</span>
            <span class="badge badge-success">${UI.escapeHtml(p.status || "active")}</span>
          </div>
          <p class="page-subtitle">${UI.escapeHtml(p.category || "Capstone")} • Mentor: ${UI.escapeHtml(p.faculty_mentor_name || "Unassigned")} • Dept: ${UI.escapeHtml(p.department_name || "General")}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/projects'">← All Projects</button>
          <button class="btn btn-primary btn-sm" onclick="ProjectDetailView.openAddTaskModal()">+ Add Task</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('overview')">📌 Overview</button>
        <button class="tab-btn ${this.activeTab === 'kanban' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('kanban')">📋 Kanban Board</button>
        <button class="tab-btn ${this.activeTab === 'sprints' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('sprints')">🏃 Sprints & Agile</button>
        <button class="tab-btn ${this.activeTab === 'submissions' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('submissions')">📤 Submissions & Grades</button>
        <button class="tab-btn ${this.activeTab === 'discussions' ? 'active' : ''}" onclick="ProjectDetailView.switchTab('discussions')">💬 Discussions</button>
      </div>

      <div id="tab-container"></div>
    `;

    this.renderActiveTabContent();
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = Array.from(document.querySelectorAll(".tab-btn")).find(b => b.textContent.toLowerCase().includes(tabName));
    if (activeBtn) activeBtn.classList.add("active");
    this.renderActiveTabContent();
  },

  async renderActiveTabContent() {
    const container = document.getElementById("tab-container");
    if (!container) return;

    if (this.activeTab === "overview") {
      const p = this.projectData;
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="card">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Project Description & Scope</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">${UI.escapeHtml(p.description || "No description provided.")}</p>
            </div>
            
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.1rem; font-weight: 700;">Project Team Members</h3>
                <button class="btn btn-secondary btn-sm" onclick="ProjectDetailView.openAddMemberModal()">+ Add Member</button>
              </div>
              <div id="members-list-container">Loading members...</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="card">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Project Status & Metrics</h3>
              <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
                  <span>Task Completion</span>
                  <span style="font-weight: 700;">${p.completion_percentage || 0}%</span>
                </div>
                <div style="height: 8px; background: var(--border-color); border-radius: var(--radius-full);">
                  <div style="height: 100%; width: ${p.completion_percentage || 0}%; background: var(--primary); border-radius: var(--radius-full);"></div>
                </div>
              </div>
              <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; color: var(--text-secondary);">
                <div><strong>Category:</strong> ${UI.escapeHtml(p.category)}</div>
                <div><strong>Priority:</strong> <span class="badge badge-neutral">${UI.escapeHtml(p.priority)}</span></div>
                <div><strong>Deadline:</strong> ${p.deadline ? new Date(p.deadline).toLocaleDateString() : "None"}</div>
                <div><strong>Total Tasks:</strong> ${p.task_count || 0}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      this.loadMembers();
    } else if (this.activeTab === "kanban") {
      container.innerHTML = `<div id="kanban-view-container">Loading Kanban Board...</div>`;
      KanbanView.renderInContainer(this.currentProjectId, "kanban-view-container");
    } else if (this.activeTab === "sprints") {
      container.innerHTML = `<div id="sprints-view-container">Loading Sprints & Backlog...</div>`;
      SprintsView.renderInContainer(this.currentProjectId, "sprints-view-container");
    } else if (this.activeTab === "submissions") {
      container.innerHTML = `<div id="submissions-view-container">Loading Submissions & Evaluations...</div>`;
      SubmissionsView.renderInContainer(this.currentProjectId, "submissions-view-container");
    } else if (this.activeTab === "discussions") {
      container.innerHTML = `<div id="discussions-view-container">Loading Discussions...</div>`;
      this.loadDiscussions("discussions-view-container");
    }
  },

  async loadMembers() {
    try {
      const members = await API.get(`/projects/${this.currentProjectId}/members`);
      const container = document.getElementById("members-list-container");
      if (!container) return;

      if (members.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No additional members assigned. Add team members to collaborate!</div>`;
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${members.map(m => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); background: var(--bg-surface-hover);">
              <div>
                <div style="font-weight: 600; font-size: 0.875rem;">${UI.escapeHtml(m.user_name)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${UI.escapeHtml(m.user_email || "")}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="badge badge-info">${UI.escapeHtml(m.role_in_project)}</span>
                <button class="btn btn-secondary btn-sm" onclick="ProjectDetailView.removeMember(${m.user_id})">Remove</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async openAddMemberModal() {
    try {
      const users = await API.get("/users/");
      const formHtml = `
        <form id="add-member-form" onsubmit="ProjectDetailView.submitAddMember(event)">
          <div class="form-group">
            <label class="form-label">Select User *</label>
            <select id="am-user-id" class="form-control" required>
              ${users.map(u => `<option value="${u.id}">${UI.escapeHtml(u.name)} (${u.role}) - ${UI.escapeHtml(u.email)}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Project Role</label>
            <select id="am-role" class="form-control">
              <option value="member">Team Member</option>
              <option value="leader">Team Leader</option>
              <option value="mentor">Faculty Mentor</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
          <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
            <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add to Project</button>
          </div>
        </form>
      `;
      UI.showModal("Add Member to Project", formHtml);
    } catch (e) {
      UI.error(e.message);
    }
  },

  async submitAddMember(e) {
    e.preventDefault();
    const userId = document.getElementById("am-user-id").value;
    const role = document.getElementById("am-role").value;
    try {
      await API.post(`/projects/${this.currentProjectId}/members?user_id=${userId}&role_in_project=${role}`);
      UI.success("Member added to project!");
      UI.closeModal();
      this.loadMembers();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async removeMember(userId) {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;
    try {
      await API.delete(`/projects/${this.currentProjectId}/members/${userId}`);
      UI.success("Member removed.");
      this.loadMembers();
    } catch (e) {
      UI.error(e.message);
    }
  },

  // Discussions Tab
  async loadDiscussions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const discussions = await API.get(`/projects/${this.currentProjectId}/discussions`);
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700;">Project Discussions & Q&A</h3>
          <button class="btn btn-primary btn-sm" onclick="ProjectDetailView.openNewDiscussionModal()">+ Start Discussion</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${discussions.length === 0 ? `<div class="card" style="text-align: center; color: var(--text-muted); padding: 2rem;">No discussions yet. Start a conversation with your team!</div>` : ""}
          ${discussions.map(d => `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <h4 style="font-size: 1.05rem; font-weight: 700;">${UI.escapeHtml(d.title)}</h4>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(d.created_at).toLocaleString()}</span>
              </div>
              <p style="color: var(--text-secondary); margin-bottom: 0.75rem; line-height: 1.5;">${UI.escapeHtml(d.content)}</p>
              <div style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">Posted by: ${UI.escapeHtml(d.author_name)} (${d.author_role})</div>

              <!-- Replies -->
              ${d.replies && d.replies.length > 0 ? `
                <div style="margin-top: 1rem; padding-left: 1rem; border-left: 2px solid var(--border-color); display: flex; flex-direction: column; gap: 0.75rem;">
                  ${d.replies.map(r => `
                    <div style="background: var(--bg-surface-hover); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm);">
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
                        <span style="font-weight: 600;">${UI.escapeHtml(r.author_name)}</span>
                        <span style="color: var(--text-muted);">${new Date(r.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p style="font-size: 0.85rem; color: var(--text-primary);">${UI.escapeHtml(r.content)}</p>
                    </div>
                  `).join("")}
                </div>
              ` : ""}

              <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <input type="text" id="reply-input-${d.id}" class="form-control" placeholder="Write a reply..." style="font-size: 0.85rem;">
                <button class="btn btn-secondary btn-sm" onclick="ProjectDetailView.submitReply(${d.id})">Reply</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load discussions: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  openNewDiscussionModal() {
    const formHtml = `
      <form id="new-disc-form" onsubmit="ProjectDetailView.submitDiscussion(event)">
        <div class="form-group">
          <label class="form-label">Discussion Title *</label>
          <input type="text" id="nd-title" class="form-control" required placeholder="e.g. Database schema design question">
        </div>
        <div class="form-group">
          <label class="form-label">Content / Message *</label>
          <textarea id="nd-content" class="form-control" rows="4" required placeholder="Describe your topic or question in detail..."></textarea>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Post Topic</button>
        </div>
      </form>
    `;
    UI.showModal("Start Project Discussion", formHtml);
  },

  async submitDiscussion(e) {
    e.preventDefault();
    const title = document.getElementById("nd-title").value;
    const content = document.getElementById("nd-content").value;
    try {
      await API.post(`/projects/${this.currentProjectId}/discussions`, { title, content });
      UI.success("Topic posted!");
      UI.closeModal();
      this.loadDiscussions("discussions-view-container");
    } catch (err) {
      UI.error(err.message);
    }
  },

  async submitReply(discussionId) {
    const input = document.getElementById(`reply-input-${discussionId}`);
    if (!input || !input.value.trim()) return;
    try {
      await API.post(`/discussions/${discussionId}/replies`, { content: input.value.trim() });
      UI.success("Reply added!");
      this.loadDiscussions("discussions-view-container");
    } catch (err) {
      UI.error(err.message);
    }
  },

  openAddTaskModal() {
    const formHtml = `
      <form id="add-task-form" onsubmit="ProjectDetailView.submitAddTask(event)">
        <div class="form-group">
          <label class="form-label">Task Title *</label>
          <input type="text" id="at-title" class="form-control" required placeholder="e.g. Implement JWT authentication">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="at-desc" class="form-control" rows="3" placeholder="Task requirements and acceptance criteria..."></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Initial Status</label>
            <select id="at-status" class="form-control">
              <option value="todo">To Do</option>
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="at-priority" class="form-control">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Estimated Hours</label>
            <input type="number" id="at-hours" class="form-control" value="4" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="at-due" class="form-control">
          </div>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Task</button>
        </div>
      </form>
    `;
    UI.showModal("Create New Project Task", formHtml);
  },

  async submitAddTask(e) {
    e.preventDefault();
    const title = document.getElementById("at-title").value;
    const description = document.getElementById("at-desc").value;
    const status = document.getElementById("at-status").value;
    const priority = document.getElementById("at-priority").value;
    const hours = parseFloat(document.getElementById("at-hours").value || "4");
    const dueVal = document.getElementById("at-due").value;

    const payload = {
      title,
      description,
      status,
      priority,
      estimated_hours: hours,
      due_date: dueVal ? new Date(dueVal).toISOString() : null,
    };

    try {
      await API.post(`/projects/${this.currentProjectId}/tasks`, payload);
      UI.success("Task created!");
      UI.closeModal();
      if (this.activeTab === "kanban") {
        KanbanView.renderInContainer(this.currentProjectId, "kanban-view-container");
      } else {
        this.loadProject();
      }
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.ProjectDetailView = ProjectDetailView;
