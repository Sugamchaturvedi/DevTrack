/**
 * DevTrack Advanced Project Analytics & Reports Module
 * Sprint Burndown Chart (Vanilla SVG), Team Velocity Chart, and CSV/JSON Export
 */

const ReportsView = {
  currentProjectId: null,
  reportsData: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Project Management</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Reports</span>
          </div>
          <h1 class="page-title">Agile Analytics & Executive Reports</h1>
          <p class="page-subtitle">Sprint burndown velocity, completed deliverables, student contribution metrics, and data export</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="reports-project-select" class="select-input" onchange="ReportsView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="ReportsView.exportCsv()">📥 Export CSV</button>
        </div>
      </div>

      <div id="reports-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Analytics Reports...</div>
      </div>
    `;
  },

  async afterRender() {
    const container = document.getElementById("reports-main-container");
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("reports-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadReports();
      } else {
        if (container) {
          container.innerHTML = `
            <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📊</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create a project to generate velocity, burndown charts, and progress reports.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center; color: var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Reports: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="ReportsView.afterRender()">🔄 Retry</button>
        </div>`;
      }
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadReports();
  },

  async loadReports() {
    const container = document.getElementById("reports-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      const [agileData, issues, workload] = await Promise.all([
        API.get(`/pm/projects/${this.currentProjectId}/reports/agile`),
        API.get(`/pm/projects/${this.currentProjectId}/issues`),
        API.get(`/pm/projects/${this.currentProjectId}/workload`),
      ]);

      this.reportsData = { agileData, issues, workload };
      this.renderReportsHtml(container, this.reportsData);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load reports: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderReportsHtml(container, data) {
    const burndown = data.agileData.burndown || {};
    const bData = burndown.data || [];
    const velocity = data.agileData.velocity || [];
    const issues = data.issues || [];
    const totalIssues = issues.length;
    const completedIssues = issues.filter(i => ["done", "completed"].includes(i.status)).length;
    const completionPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total Scope</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #2563eb; margin-top: 0.25rem;">${totalIssues} Issues</div>
          </div>
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Completed Deliverables</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #10b981; margin-top: 0.25rem;">${completedIssues} Done</div>
          </div>
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Sprint Target</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #8b5cf6; margin-top: 0.25rem;">${burndown.total_points || 0} pts</div>
          </div>
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Overall Completion</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: ${completionPct > 70 ? '#10b981' : '#f59e0b'}; margin-top: 0.25rem;">${completionPct}%</div>
          </div>
        </div>

        <!-- 2 Columns: Burndown Chart & Velocity Chart -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Sprint Burndown Chart (Pure SVG) -->
          <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0;">📉 Sprint Burndown Chart</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${burndown.sprint_name || "Active Sprint"}</span>
              </div>
              <div style="display: flex; gap: 0.75rem; font-size: 0.75rem;">
                <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 10px; height: 10px; background: #94a3b8; display: inline-block; border-radius: 2px;"></span> Ideal</span>
                <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 10px; height: 10px; background: #2563eb; display: inline-block; border-radius: 2px;"></span> Actual</span>
              </div>
            </div>

            <!-- SVG Line Chart -->
            ${this.renderSvgBurndown(bData)}
          </div>

          <!-- Team Velocity Bar Chart -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 1rem 0;">📊 Historical Sprint Velocity</h3>
            ${velocity.length === 0 ? `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No sprint historical data yet.</div>` : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${velocity.map(v => {
                  const maxPt = Math.max(v.committed_points, 1);
                  const pct = Math.min(100, Math.round((v.completed_points / maxPt) * 100));
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
                        <span>🏃 ${UI.escapeHtml(v.sprint_name)}</span>
                        <span>${v.completed_points} / ${v.committed_points} pts (${pct}%)</span>
                      </div>
                      <div style="width: 100%; height: 12px; background: var(--bg-surface-hover); border-radius: 6px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #2563eb, #10b981); border-radius: 6px;"></div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  renderSvgBurndown(data) {
    if (!data || data.length === 0) {
      return `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No burndown points for this sprint.</div>`;
    }

    const width = 450;
    const height = 220;
    const pad = 30;
    const maxVal = Math.max(...data.map(d => Math.max(d.ideal, d.actual))) || 20;

    const getX = (idx) => pad + (idx / Math.max(1, data.length - 1)) * (width - pad * 2);
    const getY = (val) => height - pad - (val / maxVal) * (height - pad * 2);

    const idealPoints = data.map((d, i) => `${getX(i)},${getY(d.ideal)}`).join(" ");
    const actualPoints = data.map((d, i) => `${getX(i)},${getY(d.actual)}`).join(" ");

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; font-family: sans-serif;">
        <!-- Axes -->
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--border-color)" stroke-width="1.5" />
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="var(--border-color)" stroke-width="1.5" />

        <!-- Grid Lines -->
        <line x1="${pad}" y1="${getY(maxVal / 2)}" x2="${width - pad}" y2="${getY(maxVal / 2)}" stroke="var(--border-color)" stroke-dasharray="3,3" />

        <!-- Lines -->
        <polyline points="${idealPoints}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,4" />
        <polyline points="${actualPoints}" fill="none" stroke="#2563eb" stroke-width="2.5" />

        <!-- Data Points -->
        ${data.map((d, i) => `
          <circle cx="${getX(i)}" cy="${getY(d.actual)}" r="4" fill="#2563eb" />
          <text x="${getX(i)}" y="${height - pad + 15}" font-size="9" fill="var(--text-muted)" text-anchor="middle">${d.day}</text>
        `).join("")}

        <!-- Max Label -->
        <text x="${pad - 5}" y="${pad + 10}" font-size="9" fill="var(--text-muted)" text-anchor="end">${maxVal}p</text>
      </svg>
    `;
  },

  exportCsv() {
    if (!this.reportsData || !this.reportsData.issues) {
      UI.warning("No data to export");
      return;
    }

    const issues = this.reportsData.issues;
    const headers = ["Key", "Type", "Title", "Status", "Priority", "Story Points", "Estimated Hours", "Actual Hours", "Assignee"];
    const rows = issues.map(i => [
      i.issue_key,
      i.issue_type,
      `"${(i.title || "").replace(/"/g, '""')}"`,
      i.status,
      i.priority,
      i.story_points,
      i.estimated_hours,
      i.actual_hours,
      `"${i.assigned_to_name || "Unassigned"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DevTrack_Project_${this.currentProjectId}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    UI.success("Report CSV exported successfully!");
  },
};

window.ReportsView = ReportsView;

