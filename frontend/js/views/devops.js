/**
 * DevTrack CI/CD & Release Management View (DevOps Module)
 * Tracks Environments (Development, Testing, Production), Pipeline Runs, Releases, and Deployment History
 */

const DevOpsView = {
  currentProjectId: null,
  activeTab: "pipelines",
  environments: [],
  overview: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>DevOps & Engineering</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">CI/CD & Releases</span>
          </div>
          <h1 class="page-title">CI/CD Pipelines & Release Management</h1>
          <p class="page-subtitle">Real build, automated test & deployment telemetry from GitHub Actions and CI webhooks across environments</p>
        </div>
        <div style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;">
          <select id="devops-project-select" class="select-input" onchange="DevOpsView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="DevOpsView.openCreateEnvModal()">+ Environment</button>
          <button class="btn btn-secondary btn-sm" onclick="DevOpsView.openCreatePipelineModal()">+ Record CI Run</button>
          <button class="btn btn-primary btn-sm" onclick="DevOpsView.openCreateReleaseModal()">🚀 New Release</button>
        </div>
      </div>

      <!-- DevOps KPI Summary -->
      <div id="devops-kpi-grid" class="kpi-grid" style="margin-bottom: 1.5rem;"></div>

      <!-- Deployment Environments Grid -->
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">Deployment Environments</h3>
          <button class="btn btn-secondary btn-sm" onclick="DevOpsView.openRecordDeploymentModal()">📦 Record Deployment</button>
        </div>
        <div id="devops-environments-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;"></div>
      </div>

      <!-- Tabs -->
      <div class="tabs" id="devops-subtabs">
        <button class="tab-btn active" data-tab="pipelines" onclick="DevOpsView.switchTab('pipelines')">⚙️ Pipeline History</button>
        <button class="tab-btn" data-tab="releases" onclick="DevOpsView.switchTab('releases')">🏷️ Releases & Notes</button>
        <button class="tab-btn" data-tab="deployments" onclick="DevOpsView.switchTab('deployments')">📜 Deployment History</button>
      </div>

      <div id="devops-tab-content">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading CI/CD data...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("devops-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadOverview();
      } else {
        document.getElementById("devops-tab-content").innerHTML = `<div class="card" style="text-align: center; padding: 3rem;">No projects found.</div>`;
      }
    } catch (e) {
      const el = document.getElementById("devops-tab-content");
      if (el) el.innerHTML = API.formatErrorHtml(e, "Failed to load DevOps workspace", "DevOpsView.afterRender()");
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadOverview();
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll("#devops-subtabs .tab-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    this.renderTabContent();
  },

  async loadOverview() {
    if (!this.currentProjectId) return;
    try {
      this.overview = await API.get(`/devops/projects/${this.currentProjectId}/overview`);
      this.environments = this.overview.environments || [];

      const kpi = document.getElementById("devops-kpi-grid");
      if (kpi) {
        kpi.innerHTML = `
          <div class="kpi-card">
            <div class="kpi-value" style="color: var(--primary);">${this.overview.build_success_rate}%</div>
            <div class="kpi-label">Build Success Rate</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${this.overview.total_pipeline_runs}</div>
            <div class="kpi-label">Pipeline Runs</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color: ${this.overview.failed_builds > 0 ? 'var(--danger)' : 'var(--success)'};">${this.overview.failed_builds}</div>
            <div class="kpi-label">Failed Builds</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${UI.escapeHtml(this.overview.latest_release || "None")}</div>
            <div class="kpi-label">Latest Release (${this.overview.total_releases})</div>
          </div>
        `;
      }

      const envGrid = document.getElementById("devops-environments-grid");
      if (envGrid) {
        envGrid.innerHTML = this.environments.map(env => {
          const stCls = env.status === "healthy" ? "badge-success" : (env.status === "failed" ? "badge-danger" : (env.status === "deploying" ? "badge-warning" : "badge-neutral"));
          return `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="font-size: 1rem;">🌐 ${UI.escapeHtml(env.name)}</strong>
                <span class="badge ${stCls}">${UI.escapeHtml(env.status.toUpperCase())}</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.25rem;">
                <div>Version: <strong>${UI.escapeHtml(env.current_version || "Not deployed")}</strong></div>
                <div>Branch: <code>${UI.escapeHtml(env.branch_name || "main")}</code></div>
                ${env.url ? `<div>URL: <a href="${UI.escapeHtml(env.url)}" target="_blank" rel="noopener">${UI.escapeHtml(env.url)}</a></div>` : ""}
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
                  Last deployed: ${env.last_deployed_at ? new Date(env.last_deployed_at).toLocaleString() : "Never"}
                </div>
              </div>
            </div>
          `;
        }).join("");
      }

      await this.renderTabContent();
    } catch (e) {
      const kpi = document.getElementById("devops-kpi-grid");
      const envGrid = document.getElementById("devops-environments-grid");
      const content = document.getElementById("devops-tab-content");
      if (kpi) kpi.innerHTML = "";
      if (envGrid) envGrid.innerHTML = "";
      if (content) {
        content.innerHTML = API.formatErrorHtml(e, "Failed to load DevOps overview", "DevOpsView.loadOverview()");
      }
      UI.error("Failed to load DevOps overview: " + e.message);
    }
  },

  async renderTabContent() {
    const content = document.getElementById("devops-tab-content");
    if (!content || !this.currentProjectId) return;
    content.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading ${this.activeTab}...</div>`;

    try {
      if (this.activeTab === "pipelines") {
        const runs = await API.get(`/devops/projects/${this.currentProjectId}/pipelines`);
        if (runs.length === 0) {
          content.innerHTML = `
            <div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">⚙️</div>
              <h4 style="color: var(--text-primary); margin-bottom: 0.4rem;">No CI/CD Pipeline Results Yet</h4>
              <p style="max-width: 520px; margin: 0 auto 1rem auto; font-size: 0.85rem;">
                Connect a GitHub repository in the <a href="#/github">GitHub Integration</a> hub and sync Actions runs or configure a <code>workflow_run</code> webhook, or record an authorized CI run result manually.
              </p>
              <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                <a class="btn btn-secondary btn-sm" href="#/github">🐙 Configure GitHub Integration</a>
                <button class="btn btn-primary btn-sm" onclick="DevOpsView.openCreatePipelineModal()">+ Record CI Run</button>
              </div>
            </div>`;
          return;
        }
        content.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Workflow / Commit</th>
                  <th>Branch</th>
                  <th>Build</th>
                  <th>Automated Tests</th>
                  <th>Deploy</th>
                  <th>Duration</th>
                  <th>Triggered</th>
                </tr>
              </thead>
              <tbody>
                ${runs.map(r => {
                  const bCls = r.build_status === "success" ? "badge-success" : (r.build_status === "failure" ? "badge-danger" : "badge-warning");
                  const tCls = r.test_status === "passed" ? "badge-success" : (r.test_status === "failed" ? "badge-danger" : "badge-neutral");
                  const dCls = r.deployment_status === "success" ? "badge-success" : (r.deployment_status === "failure" ? "badge-danger" : "badge-neutral");
                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 600;">
                          ${r.logs_url ? `<a href="${UI.escapeHtml(r.logs_url)}" target="_blank" rel="noopener">${UI.escapeHtml(r.workflow_name)}</a>` : UI.escapeHtml(r.workflow_name)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                          ${r.commit_sha ? `<code>${UI.escapeHtml(r.commit_sha.slice(0, 7))}</code> • ` : ""}${UI.escapeHtml(r.commit_message || r.trigger_event)}
                        </div>
                      </td>
                      <td><code>${UI.escapeHtml(r.branch)}</code></td>
                      <td><span class="badge ${bCls}">${UI.escapeHtml(r.build_status.toUpperCase())}</span></td>
                      <td>
                        <span class="badge ${tCls}">${UI.escapeHtml(r.test_status.toUpperCase())}</span>
                        ${r.tests_total > 0 ? `<div style="font-size: 0.72rem; color: var(--text-muted);">${r.tests_passed}/${r.tests_total} passed</div>` : ""}
                      </td>
                      <td><span class="badge ${dCls}">${UI.escapeHtml(r.deployment_status.replace("_", " ").toUpperCase())}</span></td>
                      <td style="font-size: 0.8rem;">${r.duration_seconds}s</td>
                      <td style="font-size: 0.78rem; color: var(--text-muted);">
                        ${UI.escapeHtml(r.triggered_by_name || r.trigger_event)}<br>
                        ${new Date(r.started_at).toLocaleString()}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>`;
      } else if (this.activeTab === "releases") {
        const releases = await API.get(`/devops/projects/${this.currentProjectId}/releases`);
        if (releases.length === 0) {
          content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No releases published yet.</div>`;
          return;
        }
        content.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${releases.map(rel => `
              <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="badge badge-info" style="font-family: monospace; font-size: 0.85rem;">${UI.escapeHtml(rel.version)}</span>
                      <strong style="font-size: 1.05rem;">${UI.escapeHtml(rel.title)}</strong>
                      <span class="badge badge-neutral">${UI.escapeHtml(rel.tag_name)}</span>
                      ${rel.is_prerelease ? `<span class="badge badge-warning">Pre-release</span>` : ""}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                      Published by ${UI.escapeHtml(rel.created_by_name || "Team")} on ${new Date(rel.released_at).toLocaleString()}
                      ${rel.environment_name ? ` • Target: <strong>${UI.escapeHtml(rel.environment_name)}</strong>` : ""}
                    </div>
                  </div>
                  ${rel.html_url ? `<a class="btn btn-secondary btn-sm" href="${UI.escapeHtml(rel.html_url)}" target="_blank" rel="noopener">View on GitHub ↗</a>` : ""}
                </div>
                ${rel.release_notes ? `<div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); font-size: 0.85rem; white-space: pre-wrap;">${UI.escapeHtml(rel.release_notes)}</div>` : ""}
              </div>
            `).join("")}
          </div>`;
      } else if (this.activeTab === "deployments") {
        const deps = await API.get(`/devops/projects/${this.currentProjectId}/deployments`);
        if (deps.length === 0) {
          content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No deployments recorded yet.</div>`;
          return;
        }
        content.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Environment</th>
                  <th>Version</th>
                  <th>Commit</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Deployed By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${deps.map(d => {
                  const cls = d.status === "success" ? "badge-success" : (d.status === "failure" ? "badge-danger" : "badge-warning");
                  return `
                    <tr>
                      <td><strong>${UI.escapeHtml(d.environment_name || `Env #${d.environment_id}`)}</strong></td>
                      <td><code>${UI.escapeHtml(d.version)}</code></td>
                      <td style="font-family: monospace; font-size: 0.8rem;">${UI.escapeHtml((d.commit_sha || "—").slice(0, 7))}</td>
                      <td><span class="badge ${cls}">${UI.escapeHtml(d.status.toUpperCase())}</span></td>
                      <td style="font-size: 0.825rem;">${UI.escapeHtml(d.notes || "—")}</td>
                      <td style="font-size: 0.825rem;">${UI.escapeHtml(d.deployed_by_name || "CI/CD")}</td>
                      <td style="font-size: 0.78rem; color: var(--text-muted);">${new Date(d.deployed_at).toLocaleString()}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>`;
      }
    } catch (e) {
      content.innerHTML = API.formatErrorHtml(e, `Failed to load DevOps ${this.activeTab}`, "DevOpsView.renderTabContent()");
    }
  },

  openCreateEnvModal() {
    UI.showModal("Add Deployment Environment", `
      <form onsubmit="DevOpsView.submitCreateEnv(event)">
        <div class="form-group">
          <label class="form-label">Environment Name *</label>
          <input type="text" id="env-name" class="form-control" required placeholder="e.g. Staging, QA, Production">
        </div>
        <div class="form-group">
          <label class="form-label">Tracked Git Branch</label>
          <input type="text" id="env-branch" class="form-control" value="main">
        </div>
        <div class="form-group">
          <label class="form-label">Environment URL (optional)</label>
          <input type="url" id="env-url" class="form-control" placeholder="https://staging.example.edu">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Create Environment</button>
      </form>
    `);
  },

  async submitCreateEnv(e) {
    e.preventDefault();
    try {
      await API.post(`/devops/projects/${this.currentProjectId}/environments`, {
        name: document.getElementById("env-name").value.trim(),
        branch_name: document.getElementById("env-branch").value.trim() || null,
        url: document.getElementById("env-url").value.trim() || null,
      });
      UI.success("Environment added!");
      UI.closeModal();
      await this.loadOverview();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openCreatePipelineModal() {
    UI.showModal("Record CI/CD Pipeline Result", `
      <form onsubmit="DevOpsView.submitCreatePipeline(event)">
        <div class="form-group">
          <label class="form-label">Workflow Name *</label>
          <input type="text" id="pipe-name" class="form-control" required placeholder="e.g. Backend Pytest & Build">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Branch</label>
            <input type="text" id="pipe-branch" class="form-control" value="main">
          </div>
          <div class="form-group">
            <label class="form-label">Commit SHA (optional)</label>
            <input type="text" id="pipe-sha" class="form-control" placeholder="e.g. a1b2c3d">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Build Status</label>
            <select id="pipe-build" class="select-input">
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Automated Test Status</label>
            <select id="pipe-test" class="select-input">
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Tests Total</label>
            <input type="number" id="pipe-total" class="form-control" value="0" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Tests Passed</label>
            <input type="number" id="pipe-passed" class="form-control" value="0" min="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Logs URL (optional)</label>
          <input type="url" id="pipe-logs" class="form-control" placeholder="https://github.com/owner/repo/actions/runs/...">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Save Pipeline Record</button>
      </form>
    `);
  },

  async submitCreatePipeline(e) {
    e.preventDefault();
    const total = parseInt(document.getElementById("pipe-total").value || "0", 10);
    const passed = parseInt(document.getElementById("pipe-passed").value || "0", 10);
    try {
      await API.post(`/devops/projects/${this.currentProjectId}/pipelines`, {
        workflow_name: document.getElementById("pipe-name").value.trim(),
        branch: document.getElementById("pipe-branch").value.trim() || "main",
        commit_sha: document.getElementById("pipe-sha").value.trim() || null,
        build_status: document.getElementById("pipe-build").value,
        test_status: document.getElementById("pipe-test").value,
        tests_total: total,
        tests_passed: passed,
        tests_failed: Math.max(0, total - passed),
        logs_url: document.getElementById("pipe-logs").value.trim() || null,
        trigger_event: "api",
      });
      UI.success("Pipeline result saved!");
      UI.closeModal();
      await this.loadOverview();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openCreateReleaseModal() {
    UI.showModal("Create Release & Release Notes", `
      <form onsubmit="DevOpsView.submitCreateRelease(event)">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Version *</label>
            <input type="text" id="rel-version" class="form-control" required placeholder="v1.0.0">
          </div>
          <div class="form-group">
            <label class="form-label">Git Tag *</label>
            <input type="text" id="rel-tag" class="form-control" required placeholder="v1.0.0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Release Title *</label>
          <input type="text" id="rel-title" class="form-control" required placeholder="Milestone 1 Production Release">
        </div>
        <div class="form-group">
          <label class="form-label">Target Environment</label>
          <select id="rel-env" class="select-input">
            <option value="">None</option>
            ${this.environments.map(e => `<option value="${e.id}">${UI.escapeHtml(e.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Release Notes</label>
          <textarea id="rel-notes" class="form-control" rows="4" placeholder="- Added authentication&#10;- Fixed sprint analytics"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Publish Release</button>
      </form>
    `);
  },

  async submitCreateRelease(e) {
    e.preventDefault();
    const envVal = document.getElementById("rel-env").value;
    try {
      await API.post(`/devops/projects/${this.currentProjectId}/releases`, {
        version: document.getElementById("rel-version").value.trim(),
        tag_name: document.getElementById("rel-tag").value.trim(),
        title: document.getElementById("rel-title").value.trim(),
        environment_id: envVal ? parseInt(envVal, 10) : null,
        release_notes: document.getElementById("rel-notes").value.trim() || null,
      });
      UI.success("Release published!");
      UI.closeModal();
      await this.loadOverview();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openRecordDeploymentModal() {
    if (this.environments.length === 0) {
      UI.warning("Create an environment first.");
      return;
    }
    UI.showModal("Record Deployment Event", `
      <form onsubmit="DevOpsView.submitRecordDeployment(event)">
        <div class="form-group">
          <label class="form-label">Target Environment *</label>
          <select id="dep-env" class="select-input" required>
            ${this.environments.map(e => `<option value="${e.id}">${UI.escapeHtml(e.name)}</option>`).join("")}
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Version *</label>
            <input type="text" id="dep-version" class="form-control" required placeholder="v1.0.0">
          </div>
          <div class="form-group">
            <label class="form-label">Observed Status *</label>
            <select id="dep-status" class="select-input" required>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="rolled_back">Rolled Back</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Deployment Notes</label>
          <textarea id="dep-notes" class="form-control" rows="3" placeholder="Deployment details or verification notes..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Record Deployment</button>
      </form>
    `);
  },

  async submitRecordDeployment(e) {
    e.preventDefault();
    try {
      await API.post(`/devops/projects/${this.currentProjectId}/deployments`, {
        environment_id: parseInt(document.getElementById("dep-env").value, 10),
        version: document.getElementById("dep-version").value.trim(),
        status: document.getElementById("dep-status").value,
        notes: document.getElementById("dep-notes").value.trim() || null,
      });
      UI.success("Deployment recorded!");
      UI.closeModal();
      await this.loadOverview();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.DevOpsView = DevOpsView;
