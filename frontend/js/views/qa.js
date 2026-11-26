/**
 * DevTrack Software Testing & QA Management View
 * Test Plans, Test Cases (steps/expected), Test Runs & Executions (Pass/Fail/Blocked/Not Run),
 * Bug Issue Creation from Failed Tests, and Test Coverage Reports
 */

const QAView = {
  currentProjectId: null,
  activeTab: "cases",
  testPlans: [],
  testCases: [],
  testRuns: [],
  projectIssues: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>DevOps & Engineering</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Test Management</span>
          </div>
          <h1 class="page-title">Software Testing & QA Hub</h1>
          <p class="page-subtitle">Manage test plans, test cases & steps, run test suites, log defects from failures, and measure test coverage</p>
        </div>
        <div style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;">
          <select id="qa-project-select" class="select-input" onchange="QAView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="QAView.openCreatePlanModal()">+ Test Plan</button>
          <button class="btn btn-secondary btn-sm" onclick="QAView.openCreateCaseModal()">+ Test Case</button>
          <button class="btn btn-primary btn-sm" onclick="QAView.openStartRunModal()">▶ Start Test Run</button>
        </div>
      </div>

      <!-- QA Coverage KPIs -->
      <div id="qa-coverage-kpis" class="kpi-grid" style="margin-bottom: 1.5rem;"></div>

      <!-- Tabs -->
      <div class="tabs" id="qa-subtabs">
        <button class="tab-btn active" data-tab="cases" onclick="QAView.switchTab('cases')">🧪 Test Cases</button>
        <button class="tab-btn" data-tab="runs" onclick="QAView.switchTab('runs')">▶ Test Runs & Execution</button>
        <button class="tab-btn" data-tab="plans" onclick="QAView.switchTab('plans')">📋 Test Plans</button>
        <button class="tab-btn" data-tab="coverage" onclick="QAView.switchTab('coverage')">📊 Coverage Report</button>
      </div>

      <div id="qa-tab-content">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading QA data...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("qa-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadAllQAData();
      } else {
        document.getElementById("qa-tab-content").innerHTML = `<div class="card" style="text-align: center; padding: 3rem;">No projects found.</div>`;
      }
    } catch (e) {
      const el = document.getElementById("qa-tab-content");
      if (el) el.innerHTML = API.formatErrorHtml(e, "Failed to load QA hub", "QAView.afterRender()");
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadAllQAData();
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll("#qa-subtabs .tab-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    this.renderTabContent();
  },

  async loadAllQAData() {
    if (!this.currentProjectId) return;
    try {
      const [plans, cases, runs, coverage, issues] = await Promise.all([
        API.get(`/qa/projects/${this.currentProjectId}/test-plans`),
        API.get(`/qa/projects/${this.currentProjectId}/test-cases`),
        API.get(`/qa/projects/${this.currentProjectId}/test-runs`),
        API.get(`/qa/projects/${this.currentProjectId}/coverage`),
        API.get(`/pm/projects/${this.currentProjectId}/issues`),
      ]);
      this.testPlans = plans;
      this.testCases = cases;
      this.testRuns = runs;
      this.coverage = coverage;
      this.projectIssues = issues;

      const kpi = document.getElementById("qa-coverage-kpis");
      if (kpi && coverage) {
        kpi.innerHTML = `
          <div class="kpi-card">
            <div class="kpi-value" style="color: var(--primary);">${coverage.pass_rate_pct}%</div>
            <div class="kpi-label">Test Pass Rate</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${coverage.requirement_coverage_pct}%</div>
            <div class="kpi-label">Issue Coverage (${coverage.covered_issues_count}/${coverage.total_issues})</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${coverage.total_test_cases}</div>
            <div class="kpi-label">Total Test Cases (${coverage.executed_cases} run)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color: ${coverage.linked_defects_count > 0 ? 'var(--danger)' : 'var(--success)'};">${coverage.linked_defects_count}</div>
            <div class="kpi-label">QA Logged Defects</div>
          </div>
        `;
      }

      this.renderTabContent();
    } catch (e) {
      const kpi = document.getElementById("qa-coverage-kpis");
      const content = document.getElementById("qa-tab-content");
      if (kpi) kpi.innerHTML = "";
      if (content) {
        content.innerHTML = API.formatErrorHtml(e, "Failed to load QA data", "QAView.loadAllQAData()");
      }
    }
  },

  getStatusBadge(status) {
    return {
      pass: "badge-success",
      fail: "badge-danger",
      blocked: "badge-warning",
      not_run: "badge-neutral",
    }[(status || "not_run").toLowerCase()] || "badge-neutral";
  },

  renderTabContent() {
    const content = document.getElementById("qa-tab-content");
    if (!content) return;

    if (this.activeTab === "cases") {
      if (this.testCases.length === 0) {
        content.innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🧪</div>
            <h3>No Test Cases Yet</h3>
            <p>Create structured test cases with steps, expected results, and link them to DevTrack issues.</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="QAView.openCreateCaseModal()">+ Create First Test Case</button>
          </div>`;
        return;
      }
      content.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Title & Type</th>
                <th>Test Plan</th>
                <th>Linked Issue</th>
                <th>Priority</th>
                <th>Latest Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.testCases.map(tc => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${UI.escapeHtml(tc.case_key)}</td>
                  <td>
                    <div style="font-weight: 600;">${UI.escapeHtml(tc.title)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${UI.escapeHtml(tc.test_type)} • ${(tc.steps || []).length} steps</div>
                  </td>
                  <td style="font-size: 0.825rem;">${UI.escapeHtml(tc.test_plan_name || "General")}</td>
                  <td>
                    ${tc.linked_issue_key ? `<span class="badge badge-info" style="cursor: pointer; font-family: monospace;" onclick="IssuesView.openIssueDetailModal('${UI.escapeHtml(tc.linked_issue_key)}')">${UI.escapeHtml(tc.linked_issue_key)}</span>` : `<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>`}
                  </td>
                  <td><span class="badge badge-neutral">${UI.escapeHtml(tc.priority.toUpperCase())}</span></td>
                  <td><span class="badge ${this.getStatusBadge(tc.latest_execution_status)}">${UI.escapeHtml((tc.latest_execution_status || "not_run").replace("_", " ").toUpperCase())}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="QAView.inspectTestCase(${tc.id})">View Steps</button>
                    <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="QAView.deleteTestCase(${tc.id})">Delete</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>`;
    } else if (this.activeTab === "runs") {
      if (this.testRuns.length === 0) {
        content.innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <h3>No Test Runs Executed</h3>
            <p>Start a test run to execute test cases and record Pass/Fail/Blocked results.</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="QAView.openStartRunModal()">▶ Start Test Run</button>
          </div>`;
        return;
      }
      content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${this.testRuns.map(r => `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong style="font-size: 1.05rem;">${UI.escapeHtml(r.name)}</strong>
                    <span class="badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}">${UI.escapeHtml(r.status.replace("_", " ").toUpperCase())}</span>
                    <span class="badge badge-neutral">${UI.escapeHtml(r.environment_name)}</span>
                    ${r.build_version ? `<code>${UI.escapeHtml(r.build_version)}</code>` : ""}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Pass Rate: <strong>${r.pass_rate}%</strong> • Passed: ${r.passed_count} • Failed: ${r.failed_count} • Blocked: ${r.blocked_count} • Not Run: ${r.not_run_count}
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="QAView.openExecuteRunModal(${r.id}, '${UI.escapeHtml(r.name)}')">▶ Execute / Inspect Cases (${r.total_cases})</button>
              </div>
            </div>
          `).join("")}
        </div>`;
    } else if (this.activeTab === "plans") {
      if (this.testPlans.length === 0) {
        content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No test plans created yet.</div>`;
        return;
      }
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          ${this.testPlans.map(p => `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong>${UI.escapeHtml(p.name)}</strong>
                <span class="badge badge-info">${UI.escapeHtml(p.status.toUpperCase())}</span>
              </div>
              <p style="font-size: 0.825rem; color: var(--text-secondary);">${UI.escapeHtml(p.objective || p.description || "No objective specified.")}</p>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.5rem;">
                Test Cases: <strong>${p.test_case_count}</strong> ${p.sprint_name ? `• Sprint: ${UI.escapeHtml(p.sprint_name)}` : ""}
              </div>
            </div>
          `).join("")}
        </div>`;
    } else if (this.activeTab === "coverage") {
      const cov = this.coverage || {};
      const sb = cov.status_breakdown || {};
      content.innerHTML = `
        <div class="card" style="margin-bottom: 1.25rem;">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 1rem;">Quality & Coverage Summary</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Passed Cases</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--success);">${sb.pass || 0}</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Failed Cases</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--danger);">${sb.fail || 0}</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Blocked Cases</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--warning);">${sb.blocked || 0}</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Not Run</div>
              <div style="font-size: 1.5rem; font-weight: 800;">${sb.not_run || 0}</div>
            </div>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Test Plan</th>
                <th>Total Cases</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Blocked</th>
                <th>Not Run</th>
                <th>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              ${(cov.plan_breakdown || []).map(pl => `
                <tr>
                  <td><strong>${UI.escapeHtml(pl.plan_name)}</strong></td>
                  <td>${pl.total_cases}</td>
                  <td style="color: var(--success); font-weight: 700;">${pl.passed}</td>
                  <td style="color: var(--danger); font-weight: 700;">${pl.failed}</td>
                  <td style="color: var(--warning); font-weight: 700;">${pl.blocked}</td>
                  <td>${pl.not_run}</td>
                  <td><strong>${pl.pass_rate}%</strong></td>
                </tr>
              `).join("") || `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No test plans to break down.</td></tr>`}
            </tbody>
          </table>
        </div>`;
    }
  },

  inspectTestCase(caseId) {
    const tc = this.testCases.find(c => c.id === caseId);
    if (!tc) return;
    UI.showModal(`${tc.case_key}: ${tc.title}`, `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-info">${UI.escapeHtml(tc.test_type)}</span>
          <span class="badge badge-neutral">${UI.escapeHtml(tc.priority.toUpperCase())}</span>
          <span class="badge ${this.getStatusBadge(tc.latest_execution_status)}">${UI.escapeHtml((tc.latest_execution_status || "not_run").toUpperCase())}</span>
          ${tc.linked_issue_key ? `<span class="badge badge-info">Issue: ${UI.escapeHtml(tc.linked_issue_key)}</span>` : ""}
        </div>
        ${tc.preconditions ? `<div><label class="form-label">Preconditions</label><div class="card" style="background: var(--bg-surface-hover);">${UI.escapeHtml(tc.preconditions)}</div></div>` : ""}
        <div>
          <label class="form-label">Test Steps</label>
          ${(tc.steps || []).map(s => `
            <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface-hover); border-radius: 4px; margin-bottom: 0.4rem; font-size: 0.85rem;">
              <strong>Step ${s.step_no}:</strong> ${UI.escapeHtml(s.action)}
              ${s.expected ? `<div style="font-size: 0.78rem; color: var(--text-muted);">Expected: ${UI.escapeHtml(s.expected)}</div>` : ""}
            </div>
          `).join("") || `<div style="color: var(--text-muted); font-size: 0.85rem;">No detailed steps recorded.</div>`}
        </div>
        <div>
          <label class="form-label">Overall Expected Result</label>
          <div class="card" style="background: var(--bg-surface-hover);">${UI.escapeHtml(tc.expected_result)}</div>
        </div>
      </div>
    `);
  },

  openCreatePlanModal() {
    UI.showModal("Create Test Plan", `
      <form onsubmit="QAView.submitCreatePlan(event)">
        <div class="form-group">
          <label class="form-label">Plan Name *</label>
          <input type="text" id="tp-name" class="form-control" required placeholder="e.g. Sprint 3 Regression Suite">
        </div>
        <div class="form-group">
          <label class="form-label">Objective / Scope</label>
          <textarea id="tp-obj" class="form-control" rows="3" placeholder="Verify end-to-end auth, project workflows, and GitHub sync"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Create Test Plan</button>
      </form>
    `);
  },

  async submitCreatePlan(e) {
    e.preventDefault();
    try {
      await API.post(`/qa/projects/${this.currentProjectId}/test-plans`, {
        name: document.getElementById("tp-name").value.trim(),
        objective: document.getElementById("tp-obj").value.trim() || null,
      });
      UI.success("Test plan created!");
      UI.closeModal();
      await this.loadAllQAData();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openCreateCaseModal() {
    UI.showModal("Create Test Case", `
      <form onsubmit="QAView.submitCreateCase(event)">
        <div class="form-group">
          <label class="form-label">Test Case Title *</label>
          <input type="text" id="tc-title" class="form-control" required placeholder="e.g. Verify GitHub Webhook rejects invalid HMAC signature">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Test Plan</label>
            <select id="tc-plan" class="select-input">
              <option value="">None</option>
              ${this.testPlans.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Link to DevTrack Issue</label>
            <select id="tc-issue" class="select-input">
              <option value="">None</option>
              ${this.projectIssues.map(i => `<option value="${i.id}">${UI.escapeHtml(i.issue_key)}: ${UI.escapeHtml(i.title.slice(0, 35))}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="tc-priority" class="select-input">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Test Type</label>
            <select id="tc-type" class="select-input">
              <option value="functional">Functional</option>
              <option value="integration">Integration</option>
              <option value="e2e">End-to-End</option>
              <option value="security">Security</option>
              <option value="regression">Regression</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Preconditions</label>
          <input type="text" id="tc-pre" class="form-control" placeholder="e.g. User logged in with Faculty role">
        </div>
        <div class="form-group">
          <label class="form-label">Test Steps (one per line)</label>
          <textarea id="tc-steps" class="form-control" rows="3" placeholder="1. Open GitHub Hub&#10;2. Click Link Repository&#10;3. Submit valid slug"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Result *</label>
          <textarea id="tc-expected" class="form-control" rows="2" required placeholder="Repository links and sync status shows connected"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Save Test Case</button>
      </form>
    `);
  },

  async submitCreateCase(e) {
    e.preventDefault();
    const rawSteps = document.getElementById("tc-steps").value.split("\n").map(s => s.trim()).filter(Boolean);
    const steps = rawSteps.map((line, idx) => ({
      step_no: idx + 1,
      action: line.replace(/^\d+[\).\s]+/, ""),
      expected: "",
    }));
    const planVal = document.getElementById("tc-plan").value;
    const issueVal = document.getElementById("tc-issue").value;

    try {
      await API.post(`/qa/projects/${this.currentProjectId}/test-cases`, {
        title: document.getElementById("tc-title").value.trim(),
        test_plan_id: planVal ? parseInt(planVal, 10) : null,
        linked_task_id: issueVal ? parseInt(issueVal, 10) : null,
        priority: document.getElementById("tc-priority").value,
        test_type: document.getElementById("tc-type").value,
        preconditions: document.getElementById("tc-pre").value.trim() || null,
        steps,
        expected_result: document.getElementById("tc-expected").value.trim(),
      });
      UI.success("Test case created!");
      UI.closeModal();
      await this.loadAllQAData();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async deleteTestCase(caseId) {
    if (!confirm("Delete this test case?")) return;
    try {
      await API.delete(`/qa/projects/${this.currentProjectId}/test-cases/${caseId}`);
      UI.success("Test case deleted.");
      await this.loadAllQAData();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openStartRunModal() {
    UI.showModal("Start New Test Run", `
      <form onsubmit="QAView.submitStartRun(event)">
        <div class="form-group">
          <label class="form-label">Test Run Name *</label>
          <input type="text" id="tr-name" class="form-control" required placeholder="e.g. RC1 Regression Execution">
        </div>
        <div class="form-group">
          <label class="form-label">Test Plan Scope (leave blank for all project cases)</label>
          <select id="tr-plan" class="select-input">
            <option value="">All Project Test Cases</option>
            ${this.testPlans.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Environment</label>
            <input type="text" id="tr-env" class="form-control" value="Testing">
          </div>
          <div class="form-group">
            <label class="form-label">Build Version</label>
            <input type="text" id="tr-ver" class="form-control" placeholder="v1.0.0-rc1">
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Launch Test Run</button>
      </form>
    `);
  },

  async submitStartRun(e) {
    e.preventDefault();
    const planVal = document.getElementById("tr-plan").value;
    try {
      const run = await API.post(`/qa/projects/${this.currentProjectId}/test-runs`, {
        name: document.getElementById("tr-name").value.trim(),
        test_plan_id: planVal ? parseInt(planVal, 10) : null,
        environment_name: document.getElementById("tr-env").value.trim() || "Testing",
        build_version: document.getElementById("tr-ver").value.trim() || null,
      });
      UI.success("Test run started!");
      UI.closeModal();
      this.activeTab = "runs";
      await this.loadAllQAData();
      await this.openExecuteRunModal(run.id, run.name);
    } catch (err) {
      UI.error(err.message);
    }
  },

  async openExecuteRunModal(runId, runName) {
    try {
      const execs = await API.get(`/qa/projects/${this.currentProjectId}/test-runs/${runId}/executions`);
      const html = execs.length === 0
        ? `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No test cases in this run. Create test cases first.</div>`
        : `<div style="display: flex; flex-direction: column; gap: 1rem; max-height: 70vh; overflow-y: auto;">
            ${execs.map(ex => `
              <div class="card" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                  <div>
                    <span style="font-family: monospace; font-weight: 700; color: var(--primary);">${UI.escapeHtml(ex.case_key)}</span>
                    <strong style="margin-left: 0.4rem;">${UI.escapeHtml(ex.case_title)}</strong>
                    <span class="badge ${this.getStatusBadge(ex.status)}" style="margin-left: 0.4rem;">${UI.escapeHtml(ex.status.replace("_", " ").toUpperCase())}</span>
                  </div>
                  ${ex.defect_issue_key ? `<span class="badge badge-danger" style="cursor: pointer;" onclick="UI.closeModal(); IssuesView.openIssueDetailModal('${UI.escapeHtml(ex.defect_issue_key)}')">🐞 Bug: ${UI.escapeHtml(ex.defect_issue_key)}</span>` : ""}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.4rem 0;">
                  <strong>Expected:</strong> ${UI.escapeHtml(ex.expected_result)}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 140px; gap: 0.5rem; margin-top: 0.5rem;">
                  <input type="text" id="exec-actual-${ex.id}" class="form-control" style="font-size: 0.82rem;" value="${UI.escapeHtml(ex.actual_result || "")}" placeholder="Record actual result...">
                  <select id="exec-status-${ex.id}" class="select-input" style="font-size: 0.82rem;">
                    <option value="not_run" ${ex.status === "not_run" ? "selected" : ""}>Not Run</option>
                    <option value="pass" ${ex.status === "pass" ? "selected" : ""}>Pass</option>
                    <option value="fail" ${ex.status === "fail" ? "selected" : ""}>Fail</option>
                    <option value="blocked" ${ex.status === "blocked" ? "selected" : ""}>Blocked</option>
                  </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
                  ${ex.status === "fail" && !ex.defect_issue_key ? `<button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="QAView.createBugFromExecution(${ex.id}, ${runId}, '${UI.escapeHtml(runName)}')">🐞 Create Bug Issue</button>` : ""}
                  <button class="btn btn-primary btn-sm" onclick="QAView.saveExecutionResult(${runId}, ${ex.id}, '${UI.escapeHtml(runName)}')">Save Result</button>
                </div>
              </div>
            `).join("")}
          </div>`;
      UI.showModal(`Execute Test Run: ${runName}`, html);
    } catch (err) {
      UI.error("Failed to load test run executions: " + err.message);
    }
  },

  async saveExecutionResult(runId, execId, runName) {
    const statusVal = document.getElementById(`exec-status-${execId}`).value;
    const actualVal = document.getElementById(`exec-actual-${execId}`).value.trim();
    try {
      await API.put(`/qa/test-runs/${runId}/executions/${execId}`, {
        status: statusVal,
        actual_result: actualVal || null,
      });
      UI.success(`Execution updated (${statusVal.toUpperCase()})`);
      await this.loadAllQAData();
      await this.openExecuteRunModal(runId, runName);
    } catch (err) {
      UI.error(err.message);
    }
  },

  async createBugFromExecution(execId, runId, runName) {
    try {
      const res = await API.post(`/qa/executions/${execId}/create-bug`, {});
      UI.success(`Created defect ${res.issue_key} in Issue Tracker!`);
      await this.loadAllQAData();
      await this.openExecuteRunModal(runId, runName);
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.QAView = QAView;
