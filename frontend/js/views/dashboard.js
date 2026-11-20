/**
 * DevTrack Dashboard View
 * Role-Aware Analytics & Operational Overview
 */

const DashboardView = {
  cachedData: null,
  cacheTime: 0,

  async getDashboardData(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedData && (now - this.cacheTime < 30000)) {
      return this.cachedData;
    }
    this.cachedData = await API.get("/analytics/dashboard");
    this.cacheTime = now;
    return this.cachedData;
  },

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    try {
      const data = await this.getDashboardData();
      const m = data.metrics || {};
      const role = data.role;

      let metricsHtml = "";
      if (role === "super_admin" || role === "university_admin") {
        metricsHtml = `
          <div class="grid-metrics">
            <div class="metric-card">
              <div class="metric-icon">👥</div>
              <div class="metric-info">
                <h3>${m.total_users || 0}</h3>
                <p>Total Campus Users</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🏛️</div>
              <div class="metric-info">
                <h3>${m.total_departments || 0}</h3>
                <p>Departments</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📁</div>
              <div class="metric-info">
                <h3>${m.total_projects || 0}</h3>
                <p>Total Projects</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⚡</div>
              <div class="metric-info">
                <h3>${m.active_projects || 0}</h3>
                <p>Active Projects</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">✓</div>
              <div class="metric-info">
                <h3>${m.completed_projects || 0}</h3>
                <p>Completed Projects</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📝</div>
              <div class="metric-info">
                <h3>${m.pending_reviews || 0}</h3>
                <p>Pending Reviews</p>
              </div>
            </div>
          </div>
        `;
      } else if (role === "hod") {
        metricsHtml = `
          <div class="grid-metrics">
            <div class="metric-card">
              <div class="metric-icon">📁</div>
              <div class="metric-info">
                <h3>${m.total_projects || 0}</h3>
                <p>Department Projects</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⚡</div>
              <div class="metric-info">
                <h3>${m.active_projects || 0}</h3>
                <p>Active Workflows</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🎓</div>
              <div class="metric-info">
                <h3>${m.student_count || 0}</h3>
                <p>Enrolled Students</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">👨‍🏫</div>
              <div class="metric-info">
                <h3>${m.faculty_count || 0}</h3>
                <p>Faculty Mentors</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📈</div>
              <div class="metric-info">
                <h3>${m.completion_rate || 0}%</h3>
                <p>Completion Rate</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⏳</div>
              <div class="metric-info">
                <h3>${m.pending_evaluations || 0}</h3>
                <p>Pending Evaluations</p>
              </div>
            </div>
          </div>
        `;
      } else if (role === "faculty" || role === "reviewer") {
        metricsHtml = `
          <div class="grid-metrics">
            <div class="metric-card">
              <div class="metric-icon">📁</div>
              <div class="metric-info">
                <h3>${m.assigned_projects_count || 0}</h3>
                <p>Supervised Projects</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⏳</div>
              <div class="metric-info">
                <h3>${m.pending_submissions || 0}</h3>
                <p>Submissions Awaiting Grade</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📋</div>
              <div class="metric-info">
                <h3>${m.total_tasks || 0}</h3>
                <p>Project Tasks</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">✓</div>
              <div class="metric-info">
                <h3>${m.completed_tasks || 0}</h3>
                <p>Tasks Completed</p>
              </div>
            </div>
          </div>
        `;
      } else {
        // Student / Team Leader
        metricsHtml = `
          <div class="grid-metrics">
            <div class="metric-card">
              <div class="metric-icon">📁</div>
              <div class="metric-info">
                <h3>${m.my_projects_count || 0}</h3>
                <p>My Projects</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📋</div>
              <div class="metric-info">
                <h3>${m.my_tasks_count || 0}</h3>
                <p>Assigned Tasks</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⏳</div>
              <div class="metric-info">
                <h3>${m.pending_tasks || 0}</h3>
                <p>Tasks To-Do</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⭐</div>
              <div class="metric-info">
                <h3>${m.evaluations_count || 0}</h3>
                <p>Evaluations Received</p>
              </div>
            </div>
          </div>
        `;
      }

      // Recent Activity / Actions
      let activityHtml = "";
      if (data.recent_activity && data.recent_activity.length > 0) {
        activityHtml = `
          <div class="card" style="margin-top: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Campus Platform Activity</h3>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${data.recent_activity.map(a => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); background: var(--bg-surface-hover);">
                  <div>
                    <span style="font-weight: 600;">${UI.escapeHtml(a.user_name)}</span>
                    <span style="color: var(--text-secondary); margin-left: 0.5rem;">${UI.escapeHtml(a.details || a.action)}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(a.timestamp).toLocaleDateString()}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      return `
        <div class="page-header">
          <div>
            <h1 class="page-title">University Executive Dashboard</h1>
            <p class="page-subtitle">Welcome back, ${UI.escapeHtml(user.name)} (${user.role.replace("_", " ").toUpperCase()})</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary" onclick="window.location.hash='#/projects'">Browse Projects</button>
            <button class="btn btn-primary" onclick="ProjectsView.openCreateModal()">+ Create Project</button>
          </div>
        </div>
        ${metricsHtml}
        ${activityHtml}
      `;
    } catch (e) {
      return `
        <div class="card" style="padding: 2.5rem; text-align: center; margin: 1.5rem auto; max-width: 600px; border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚠️</div>
          <h3 style="margin-bottom: 0.5rem; color: var(--text-primary); font-size: 1.2rem;">Failed to Load Dashboard</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-primary" onclick="App.handleRoute()">🔄 Retry</button>
        </div>
      `;
    }
  },
};

window.DashboardView = DashboardView;
