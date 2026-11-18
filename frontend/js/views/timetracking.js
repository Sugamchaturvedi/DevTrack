/**
 * DevTrack Time Tracking & Work Logs Module
 * Effort estimation vs actual hours, interactive task timer, manual time logging, and breakdown
 */

const TimeTrackingView = {
  currentProjectId: null,
  timerInterval: null,
  timerSeconds: 0,
  isTimerRunning: false,
  activeTimerTaskId: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Project Management</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Time Tracking</span>
          </div>
          <h1 class="page-title">Project Time Tracking & Work Logs</h1>
          <p class="page-subtitle">Track billable and academic hours, monitor task velocity, and record real-time development effort</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="timetrack-project-select" class="select-input" onchange="TimeTrackingView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
        </div>
      </div>

      <!-- Live Task Timer Widget -->
      <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(139, 92, 246, 0.05)); border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 0.25rem 0;">⏱ Real-Time Task Stopwatch</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Select an active task and start the live clock while working on deliverables.</p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <select id="timer-task-select" class="select-input" style="min-width: 220px;">
              <option value="">Select Task to Track...</option>
            </select>

            <div id="stopwatch-display" style="font-family: monospace; font-size: 1.6rem; font-weight: 800; color: #2563eb; background: var(--bg-surface); padding: 0.35rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              00:00:00
            </div>

            <button id="timer-toggle-btn" class="btn btn-primary btn-sm" onclick="TimeTrackingView.toggleTimer()">Start Timer</button>
            <button class="btn btn-secondary btn-sm" onclick="TimeTrackingView.resetTimer()">Reset</button>
          </div>
        </div>
      </div>

      <!-- Project Workload & Hours Summary -->
      <div id="timetrack-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Time Logs...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("timetrack-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadProjectTasks();
        await this.loadSummary();
      }
    } catch (e) {
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadProjectTasks();
    await this.loadSummary();
  },

  async loadProjectTasks() {
    const taskSelect = document.getElementById("timer-task-select");
    if (!taskSelect) return;
    try {
      const tasks = await API.get(`/pm/projects/${this.currentProjectId}/issues`);
      taskSelect.innerHTML = `<option value="">Select Task to Track...</option>` + tasks.map(t => `
        <option value="${t.id}">${t.issue_key} - ${UI.escapeHtml(t.title)}</option>
      `).join("");
    } catch (e) {}
  },

  toggleTimer() {
    const taskSelect = document.getElementById("timer-task-select");
    const btn = document.getElementById("timer-toggle-btn");

    if (!this.isTimerRunning) {
      if (!taskSelect.value) {
        UI.warning("Please choose a task to time first.");
        return;
      }
      this.activeTimerTaskId = parseInt(taskSelect.value);
      this.isTimerRunning = true;
      btn.innerText = "Stop & Save Log";
      btn.className = "btn btn-danger btn-sm";
      this.timerInterval = setInterval(() => {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }, 1000);
    } else {
      // Stop and prompt save
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
      btn.innerText = "Start Timer";
      btn.className = "btn btn-primary btn-sm";

      const hours = Math.max(0.1, Number((this.timerSeconds / 3600).toFixed(2)));
      IssuesView.openLogWorkModal(this.activeTimerTaskId, this.currentProjectId);
      setTimeout(() => {
        const hInput = document.getElementById("worklog-hours");
        if (hInput) hInput.value = hours;
      }, 200);
      this.resetTimer();
    }
  },

  resetTimer() {
    clearInterval(this.timerInterval);
    this.isTimerRunning = false;
    this.timerSeconds = 0;
    this.updateTimerDisplay();
    const btn = document.getElementById("timer-toggle-btn");
    if (btn) {
      btn.innerText = "Start Timer";
      btn.className = "btn btn-primary btn-sm";
    }
  },

  updateTimerDisplay() {
    const d = document.getElementById("stopwatch-display");
    if (!d) return;
    const hrs = String(Math.floor(this.timerSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((this.timerSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(this.timerSeconds % 60).padStart(2, "0");
    d.innerText = `${hrs}:${mins}:${secs}`;
  },

  async loadSummary() {
    const container = document.getElementById("timetrack-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      const [issues, workload] = await Promise.all([
        API.get(`/pm/projects/${this.currentProjectId}/issues`),
        API.get(`/pm/projects/${this.currentProjectId}/workload`),
      ]);

      const totalEstimated = issues.reduce((acc, i) => acc + (i.estimated_hours || 0), 0);
      const totalLogged = issues.reduce((acc, i) => acc + (i.actual_hours || 0), 0);
      const remaining = Math.max(0, totalEstimated - totalLogged);

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total Estimated Effort</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: #2563eb; margin-top: 0.25rem;">${totalEstimated}h</div>
          </div>
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total Hours Logged</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: #10b981; margin-top: 0.25rem;">${totalLogged}h</div>
          </div>
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Remaining Planned Effort</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: #f59e0b; margin-top: 0.25rem;">${remaining}h</div>
          </div>
        </div>

        <div class="card" style="padding: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Task-by-Task Effort Breakdown</h3>
          <div class="table-container" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>KEY</th>
                  <th>TASK / ISSUE</th>
                  <th>ESTIMATED</th>
                  <th>ACTUAL LOGGED</th>
                  <th>PROGRESS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(item => `
                  <tr>
                    <td><strong style="color: #2563eb; font-family: monospace;">${item.issue_key}</strong></td>
                    <td style="font-weight: 600;">${UI.escapeHtml(item.title)}</td>
                    <td>${item.estimated_hours}h</td>
                    <td style="font-weight: 700; color: #10b981;">${item.actual_hours}h</td>
                    <td style="width: 150px;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="flex: 1; height: 6px; background: var(--bg-surface-hover); border-radius: 3px; overflow: hidden;">
                          <div style="height: 100%; width: ${item.progress_percentage}%; background: #2563eb;"></div>
                        </div>
                        <span style="font-size: 0.75rem;">${item.progress_percentage}%</span>
                      </div>
                    </td>
                    <td><span class="badge ${IssuesView.getStatusBadge(item.status)}">${item.status}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="IssuesView.openLogWorkModal(${item.id}, '${item.project_id}')">⏱ Log</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load summary: ${UI.escapeHtml(e.message)}</div>`;
    }
  },
};

window.TimeTrackingView = TimeTrackingView;
