/**
 * DevTrack GitHub Integration View
 * Secure PAT account connection, repo linking, live sync, branches, commits, PR code reviews, and activity stream
 */

const GitHubView = {
  currentProjectId: null,
  activeTab: "pulls",
  repos: [],
  connection: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>DevOps & Engineering</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">GitHub Integration</span>
          </div>
          <h1 class="page-title">GitHub Repository & Code Review Hub</h1>
          <p class="page-subtitle">Link repositories, synchronize branches & commits, track pull requests, and connect commits to DevTrack issues</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <select id="github-project-select" class="select-input" onchange="GitHubView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="GitHubView.openLinkRepoModal()">+ Link Repository</button>
        </div>
      </div>

      <!-- GitHub Account Connection Banner -->
      <div id="github-connection-banner" class="card" style="margin-bottom: 1.25rem; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div style="color: var(--text-muted); font-size: 0.875rem;">Checking GitHub connection...</div>
      </div>

      <!-- Linked Repositories Cards -->
      <div id="github-repos-container" style="margin-bottom: 1.5rem;"></div>

      <!-- Sub-Navigation Tabs -->
      <div class="tabs" id="github-subtabs">
        <button class="tab-btn active" data-tab="pulls" onclick="GitHubView.switchTab('pulls')">🔀 Pull Requests & Reviews</button>
        <button class="tab-btn" data-tab="commits" onclick="GitHubView.switchTab('commits')">📝 Commits</button>
        <button class="tab-btn" data-tab="branches" onclick="GitHubView.switchTab('branches')">🌿 Branches</button>
        <button class="tab-btn" data-tab="activity" onclick="GitHubView.switchTab('activity')">📡 Recent Activity</button>
      </div>

      <div id="github-tab-content">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading GitHub data...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.loadConnection();
    try {
      const projects = await App.getProjects();
      const select = document.getElementById("github-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadProjectGitHubData();
      } else {
        document.getElementById("github-tab-content").innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No projects found. Create a project first to link a GitHub repository.
          </div>`;
      }
    } catch (e) {
      const content = document.getElementById("github-tab-content");
      if (content) {
        content.innerHTML = API.formatErrorHtml(e, "Failed to initialize GitHub hub", "GitHubView.afterRender()");
      }
    }
  },

  async loadConnection() {
    const banner = document.getElementById("github-connection-banner");
    if (!banner) return;
    try {
      this.connection = await API.get("/github/connection");
      if (this.connection) {
        banner.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">
              ${UI.escapeHtml((this.connection.github_username || "G").charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
                GitHub Connected: <a href="${UI.escapeHtml(this.connection.profile_url || '#')}" target="_blank" rel="noopener">@${UI.escapeHtml(this.connection.github_username)}</a>
                ${this.connection.is_verified ? `<span class="badge badge-success" style="margin-left: 0.4rem;">Verified</span>` : `<span class="badge badge-warning" style="margin-left: 0.4rem;">Saved Offline</span>`}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                Token encrypted at rest on server (${UI.escapeHtml(this.connection.token_hint || "****")}) • Never exposed to browser
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="GitHubView.openConnectModal()">Update Token</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="GitHubView.disconnectAccount()">Disconnect</button>
          </div>
        `;
      } else {
        banner.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">GitHub Account Not Connected</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Connect a GitHub Personal Access Token (encrypted server-side in PostgreSQL) to sync private/public repos, PR code reviews, and GitHub Actions.</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="GitHubView.openConnectModal()">🔑 Connect GitHub Account</button>
        `;
      }
    } catch (e) {
      const hint = e.status === 404
        ? "GitHub API endpoint not found on the running backend server. Restart the FastAPI server and retry."
        : (e.status === 401 ? "Authentication required. Please sign in again." : e.message);
      banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 1rem; flex-wrap: wrap;">
          <span style="color: var(--danger); font-size: 0.85rem;">⚠️ Could not load GitHub account status: ${UI.escapeHtml(hint)}</span>
          <button class="btn btn-secondary btn-sm" onclick="GitHubView.loadConnection()">🔄 Retry</button>
        </div>`;
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadProjectGitHubData();
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll("#github-subtabs .tab-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    this.renderTabContent();
  },

  async loadProjectGitHubData() {
    if (!this.currentProjectId) return;
    const reposEl = document.getElementById("github-repos-container");
    try {
      this.repos = await API.get(`/github/projects/${this.currentProjectId}/repos`);
      if (reposEl) {
        if (this.repos.length === 0) {
          reposEl.innerHTML = `
            <div class="card" style="text-align: center; padding: 1.75rem; border: 1px dashed var(--border-color);">
              <div style="font-size: 1.75rem; margin-bottom: 0.4rem;">🐙</div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">No GitHub Repository Linked</div>
              <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.85rem;">Link a GitHub repository to track branches, commits, pull requests, and CI/CD pipelines.</p>
              <button class="btn btn-primary btn-sm" onclick="GitHubView.openLinkRepoModal()">+ Link GitHub Repository</button>
            </div>`;
        } else {
          reposEl.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1rem;">
              ${this.repos.map(r => `
                <div class="card" style="display: flex; flex-direction: column; gap: 0.65rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <a href="${UI.escapeHtml(r.html_url)}" target="_blank" rel="noopener" style="font-weight: 700; font-size: 1rem; color: var(--primary); text-decoration: none;">
                          🐙 ${UI.escapeHtml(r.full_name)}
                        </a>
                        <span class="badge badge-neutral">${UI.escapeHtml(r.visibility)}</span>
                        ${r.language ? `<span class="badge badge-info">${UI.escapeHtml(r.language)}</span>` : ""}
                      </div>
                      <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.35rem 0 0 0;">${UI.escapeHtml(r.description || "Connected GitHub repository")}</p>
                    </div>
                    <span class="badge ${r.sync_status === 'error' ? 'badge-danger' : 'badge-success'}">${UI.escapeHtml(r.sync_status)}</span>
                  </div>
                  <div style="display: flex; gap: 1rem; font-size: 0.78rem; color: var(--text-muted); flex-wrap: wrap;">
                    <span>🌿 Default: <strong>${UI.escapeHtml(r.default_branch)}</strong></span>
                    <span>⭐ ${r.stars_count}</span>
                    <span>🍴 ${r.forks_count}</span>
                    <span>🔒 Webhook Secret: <strong>${r.has_webhook_secret ? "Configured" : "None"}</strong></span>
                  </div>
                  <div style="font-size: 0.74rem; color: var(--text-muted); background: var(--bg-surface-hover); padding: 0.4rem 0.6rem; border-radius: 4px; word-break: break-all;">
                    Webhook URL: <code>${window.location.origin}/github/webhooks/${r.id}</code>
                  </div>
                  ${r.sync_error ? `<div style="font-size: 0.75rem; color: var(--warning);">Notice: ${UI.escapeHtml(r.sync_error)}</div>` : ""}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.35rem; border-top: 1px solid var(--border-color);">
                    <span style="font-size: 0.72rem; color: var(--text-muted);">
                      Last synced: ${r.last_synced_at ? new Date(r.last_synced_at).toLocaleString() : "Never"}
                    </span>
                    <div style="display: flex; gap: 0.4rem;">
                      <button class="btn btn-secondary btn-sm" onclick="GitHubView.openAddBranchModal(${r.id})">+ Branch</button>
                      <button class="btn btn-primary btn-sm" onclick="GitHubView.syncRepo(${r.id})">🔄 Sync</button>
                      <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="GitHubView.unlinkRepo(${r.id})">Unlink</button>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>`;
        }
      }
      await this.renderTabContent();
    } catch (e) {
      if (reposEl) {
        reposEl.innerHTML = API.formatErrorHtml(e, "Failed to load linked repositories", "GitHubView.loadProjectGitHubData()");
      }
      const content = document.getElementById("github-tab-content");
      if (content) {
        content.innerHTML = `<div class="card" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Unable to load branches, commits, or pull requests until repositories are accessible.</div>`;
      }
    }
  },

  async renderTabContent() {
    const content = document.getElementById("github-tab-content");
    if (!content || !this.currentProjectId) return;
    content.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading ${this.activeTab}...</div>`;

    try {
      if (this.activeTab === "pulls") {
        const prs = await API.get(`/github/projects/${this.currentProjectId}/pulls`);
        if (prs.length === 0) {
          content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No pull requests synchronized yet. Sync a repository or send a GitHub <code>pull_request</code> webhook.</div>`;
          return;
        }
        content.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>PR #</th>
                  <th>Title & Branches</th>
                  <th>Status</th>
                  <th>Code Review</th>
                  <th>Linked Issue</th>
                  <th>Author</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${prs.map(pr => {
                  const stateCls = pr.state === "merged" ? "badge-info" : (pr.state === "open" ? "badge-success" : "badge-neutral");
                  const revCls = pr.review_status === "approved" ? "badge-success" : (pr.review_status === "changes_requested" ? "badge-danger" : "badge-warning");
                  return `
                    <tr>
                      <td style="font-family: monospace; font-weight: 700;">#${pr.pr_number}</td>
                      <td>
                        <div style="font-weight: 600;">
                          ${pr.html_url ? `<a href="${UI.escapeHtml(pr.html_url)}" target="_blank" rel="noopener">${UI.escapeHtml(pr.title)}</a>` : UI.escapeHtml(pr.title)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                          <code>${UI.escapeHtml(pr.head_branch || "?")}</code> → <code>${UI.escapeHtml(pr.base_branch || "main")}</code>
                          ${pr.changed_files ? ` • ${pr.changed_files} files (+${pr.additions}/-${pr.deletions})` : ""}
                        </div>
                      </td>
                      <td><span class="badge ${stateCls}">${UI.escapeHtml(pr.state.toUpperCase())}</span></td>
                      <td>
                        <span class="badge ${revCls}">${UI.escapeHtml((pr.review_status || "pending").replace("_", " ").toUpperCase())}</span>
                        ${pr.reviewer_names ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Reviewers: ${UI.escapeHtml(pr.reviewer_names)}</div>` : ""}
                      </td>
                      <td>
                        ${pr.issue_key ? `<span class="badge badge-info" style="cursor: pointer; font-family: monospace;" onclick="IssuesView.openIssueDetailModal('${UI.escapeHtml(pr.issue_key)}')">${UI.escapeHtml(pr.issue_key)}</span>` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Unlinked</span>`}
                      </td>
                      <td style="font-size: 0.825rem;">@${UI.escapeHtml(pr.author_username || "unknown")}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="GitHubView.openLinkIssueModal('pull_request', ${pr.id})">🔗 Link Issue</button>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>`;
      } else if (this.activeTab === "commits") {
        const commits = await API.get(`/github/projects/${this.currentProjectId}/commits`);
        if (commits.length === 0) {
          content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No commits recorded yet.</div>`;
          return;
        }
        content.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Commit</th>
                  <th>Message</th>
                  <th>Branch</th>
                  <th>Linked Issue</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${commits.map(c => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700;">
                      ${c.html_url ? `<a href="${UI.escapeHtml(c.html_url)}" target="_blank" rel="noopener">${UI.escapeHtml(c.sha.slice(0, 7))}</a>` : UI.escapeHtml(c.sha.slice(0, 7))}
                    </td>
                    <td>
                      <div style="font-weight: 500;">${UI.escapeHtml((c.message || "").split("\n")[0])}</div>
                      ${c.issue_keys_detected ? `<div style="font-size: 0.72rem; color: var(--text-muted);">Detected keys: ${UI.escapeHtml(c.issue_keys_detected)}</div>` : ""}
                    </td>
                    <td><code>${UI.escapeHtml(c.branch_name || "main")}</code></td>
                    <td>
                      ${c.issue_key ? `<span class="badge badge-info" style="cursor: pointer; font-family: monospace;" onclick="IssuesView.openIssueDetailModal('${UI.escapeHtml(c.issue_key)}')">${UI.escapeHtml(c.issue_key)}</span>` : `<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>`}
                    </td>
                    <td style="font-size: 0.825rem;">${UI.escapeHtml(c.author_name || "Unknown")}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.committed_at).toLocaleString()}</td>
                    <td><button class="btn btn-secondary btn-sm" onclick="GitHubView.openLinkIssueModal('commit', ${c.id})">🔗 Link</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`;
      } else if (this.activeTab === "branches") {
        const branches = await API.get(`/github/projects/${this.currentProjectId}/branches`);
        if (branches.length === 0) {
          content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No branches found.</div>`;
          return;
        }
        content.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>HEAD SHA</th>
                  <th>Attributes</th>
                  <th>Linked Issue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${branches.map(b => `
                  <tr>
                    <td><code style="font-weight: 700;">🌿 ${UI.escapeHtml(b.name)}</code></td>
                    <td style="font-family: monospace; font-size: 0.8rem;">${UI.escapeHtml((b.head_sha || "—").slice(0, 7))}</td>
                    <td>
                      ${b.is_default ? `<span class="badge badge-info">Default</span>` : ""}
                      ${b.is_protected ? `<span class="badge badge-warning">Protected</span>` : ""}
                    </td>
                    <td>
                      ${b.issue_key ? `<span class="badge badge-info" style="cursor: pointer; font-family: monospace;" onclick="IssuesView.openIssueDetailModal('${UI.escapeHtml(b.issue_key)}')">${UI.escapeHtml(b.issue_key)}</span>` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Unlinked</span>`}
                    </td>
                    <td><button class="btn btn-secondary btn-sm" onclick="GitHubView.openLinkIssueModal('branch', ${b.id})">🔗 Link Issue</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`;
      } else if (this.activeTab === "activity") {
        const acts = await API.get(`/github/projects/${this.currentProjectId}/activity`);
        if (acts.length === 0) {
          content.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No recent repository activity.</div>`;
          return;
        }
        content.innerHTML = `
          <div class="card" style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${acts.map(a => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); gap: 1rem;">
                <div>
                  <span class="badge badge-neutral" style="text-transform: uppercase; font-size: 0.7rem;">${UI.escapeHtml(a.event_type)}</span>
                  <strong style="margin-left: 0.4rem;">${UI.escapeHtml(a.actor || "GitHub")}</strong>:
                  <span>${UI.escapeHtml(a.summary)}</span>
                  ${a.issue_key ? `<span class="badge badge-info" style="margin-left: 0.4rem; cursor: pointer;" onclick="IssuesView.openIssueDetailModal('${UI.escapeHtml(a.issue_key)}')">${UI.escapeHtml(a.issue_key)}</span>` : ""}
                </div>
                <span style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;">${new Date(a.occurred_at).toLocaleString()}</span>
              </div>
            `).join("")}
          </div>`;
      }
    } catch (e) {
      content.innerHTML = API.formatErrorHtml(e, `Failed to load GitHub ${this.activeTab}`, "GitHubView.renderTabContent()");
    }
  },

  openConnectModal() {
    UI.showModal("Connect GitHub Account Securely", `
      <form onsubmit="GitHubView.submitConnect(event)">
        <p style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 1rem;">
          Your Personal Access Token (PAT) is encrypted server-side using Fernet encryption and is never sent back to the browser.
        </p>
        <div class="form-group">
          <label class="form-label">GitHub Personal Access Token *</label>
          <input type="password" id="gh-pat-input" class="form-control" required placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
        </div>
        <div class="form-group">
          <label class="form-label">GitHub Username (optional fallback for offline validation)</label>
          <input type="text" id="gh-user-input" class="form-control" placeholder="e.g. octocat">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Connect Account</button>
      </form>
    `);
  },

  async submitConnect(e) {
    e.preventDefault();
    try {
      await API.post("/github/connect", {
        access_token: document.getElementById("gh-pat-input").value,
        github_username: document.getElementById("gh-user-input").value.trim() || null,
      });
      UI.success("GitHub account connected securely!");
      UI.closeModal();
      await this.loadConnection();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async disconnectAccount() {
    if (!confirm("Disconnect your GitHub account and purge stored token?")) return;
    try {
      await API.delete("/github/disconnect");
      UI.success("GitHub account disconnected.");
      await this.loadConnection();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openLinkRepoModal() {
    if (!this.currentProjectId) {
      UI.warning("Select a project first.");
      return;
    }
    UI.showModal("Link GitHub Repository", `
      <form onsubmit="GitHubView.submitLinkRepo(event)">
        <div class="form-group">
          <label class="form-label">Repository URL or owner/repo *</label>
          <input type="text" id="gh-repo-slug" class="form-control" required placeholder="e.g. Sugamchaturvedi/DevTrack or https://github.com/owner/repo">
        </div>
        <div class="form-group">
          <label class="form-label">Default Branch</label>
          <input type="text" id="gh-repo-branch" class="form-control" value="main">
        </div>
        <div class="form-group">
          <label class="form-label">Webhook Secret (optional, recommended for HMAC verification)</label>
          <input type="password" id="gh-webhook-secret" class="form-control" placeholder="Secret shared with GitHub Webhook">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Link Repository</button>
      </form>
    `);
  },

  async submitLinkRepo(e) {
    e.preventDefault();
    try {
      await API.post(`/github/projects/${this.currentProjectId}/repos`, {
        repo_url_or_slug: document.getElementById("gh-repo-slug").value.trim(),
        default_branch: document.getElementById("gh-repo-branch").value.trim() || "main",
        webhook_secret: document.getElementById("gh-webhook-secret").value.trim() || null,
        use_my_connection: true,
      });
      UI.success("Repository linked!");
      UI.closeModal();
      await this.loadProjectGitHubData();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async syncRepo(repoId) {
    try {
      UI.info("Syncing repository with GitHub API...");
      const res = await API.post(`/github/projects/${this.currentProjectId}/repos/${repoId}/sync`, {});
      UI.success(`Synced: ${res.stats.branches} branches, ${res.stats.commits} commits, ${res.stats.pull_requests} PRs, ${res.stats.workflow_runs} runs.`);
      await this.loadProjectGitHubData();
    } catch (err) {
      UI.error("Sync failed: " + err.message);
      await this.loadProjectGitHubData();
    }
  },

  async unlinkRepo(repoId) {
    if (!confirm("Unlink this repository from the project?")) return;
    try {
      await API.delete(`/github/projects/${this.currentProjectId}/repos/${repoId}`);
      UI.success("Repository unlinked.");
      await this.loadProjectGitHubData();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openAddBranchModal(repoId) {
    UI.showModal("Register / Link Git Branch", `
      <form onsubmit="GitHubView.submitAddBranch(event, ${repoId})">
        <div class="form-group">
          <label class="form-label">Branch Name *</label>
          <input type="text" id="gh-branch-name" class="form-control" required placeholder="e.g. feat/DEV-1001-github-auth">
        </div>
        <div class="form-group">
          <label class="form-label">DevTrack Issue Key (optional)</label>
          <input type="text" id="gh-branch-issue" class="form-control" placeholder="e.g. DEV-1001">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Save Branch Link</button>
      </form>
    `);
  },

  async submitAddBranch(e, repoId) {
    e.preventDefault();
    try {
      await API.post(`/github/projects/${this.currentProjectId}/repos/${repoId}/branches`, {
        name: document.getElementById("gh-branch-name").value.trim(),
        issue_key: document.getElementById("gh-branch-issue").value.trim() || null,
      });
      UI.success("Branch registered & linked!");
      UI.closeModal();
      await this.renderTabContent();
    } catch (err) {
      UI.error(err.message);
    }
  },

  openLinkIssueModal(entityType, entityId) {
    UI.showModal("Link to DevTrack Issue", `
      <form onsubmit="GitHubView.submitLinkIssue(event, '${entityType}', ${entityId})">
        <div class="form-group">
          <label class="form-label">DevTrack Issue Key or ID *</label>
          <input type="text" id="gh-link-issue-key" class="form-control" required placeholder="e.g. DEV-1001">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Link Issue</button>
      </form>
    `);
  },

  async submitLinkIssue(e, entityType, entityId) {
    e.preventDefault();
    try {
      const res = await API.post(`/github/projects/${this.currentProjectId}/link-issue`, {
        entity_type: entityType,
        entity_id: entityId,
        issue_key_or_id: document.getElementById("gh-link-issue-key").value.trim(),
      });
      UI.success(res.message);
      UI.closeModal();
      await this.renderTabContent();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.GitHubView = GitHubView;
