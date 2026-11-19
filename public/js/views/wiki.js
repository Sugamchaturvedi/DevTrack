/**
 * DevTrack Project Wiki & Knowledge Base Module
 * Architecture specifications, setup guides, research notes, and meeting records
 */

const WikiView = {
  currentProjectId: null,
  wikiPages: [],
  selectedPageId: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Collaboration</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Knowledge Base</span>
          </div>
          <h1 class="page-title">Project Documentation & Wiki</h1>
          <p class="page-subtitle">Centralized technical documentation, architecture blueprints, meeting notes, and research papers</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <select id="wiki-project-select" class="select-input" onchange="WikiView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="WikiView.openCreatePageModal()">+ New Wiki Page</button>
        </div>
      </div>

      <div id="wiki-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Knowledge Base...</div>
      </div>
    `;
  },

  async afterRender() {
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("wiki-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadWiki();
      }
    } catch (e) {
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    this.selectedPageId = null;
    await this.loadWiki();
  },

  async loadWiki() {
    const container = document.getElementById("wiki-main-container");
    if (!container || !this.currentProjectId) return;

    try {
      this.wikiPages = await API.get(`/pm/projects/${this.currentProjectId}/wiki`);
      if (this.wikiPages.length > 0 && !this.selectedPageId) {
        this.selectedPageId = this.wikiPages[0].id;
      }
      this.renderWikiHtml(container);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load wiki: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderWikiHtml(container) {
    const pages = this.wikiPages;
    if (pages.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No wiki documentation pages yet for this project.
          <div style="margin-top: 1rem;">
            <button class="btn btn-primary btn-sm" onclick="WikiView.openCreatePageModal()">+ Draft First Documentation Page</button>
          </div>
        </div>
      `;
      return;
    }

    const activePage = pages.find(p => p.id === this.selectedPageId) || pages[0];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; align-items: flex-start;">
        <!-- Left: Category-grouped Page List -->
        <div class="card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Pages (${pages.length})</h4>
            <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 2px 7px;" onclick="WikiView.openCreatePageModal()">+ Page</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            ${pages.map(p => `
              <div style="padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; background: ${p.id === activePage.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent'}; color: ${p.id === activePage.id ? '#2563eb' : 'var(--text-primary)'}; font-weight: ${p.id === activePage.id ? '700' : '500'};" onclick="WikiView.selectPage(${p.id})">
                <span>📄 ${UI.escapeHtml(p.title)}</span>
                <span class="badge badge-neutral" style="font-size: 0.65rem;">${UI.escapeHtml(p.category)}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Right: Active Page Viewer / Reader -->
        <div class="card" style="padding: 2rem;">
          <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="badge badge-neutral" style="font-size: 0.75rem; margin-bottom: 0.5rem;">📁 ${UI.escapeHtml(activePage.category)}</span>
                <h2 style="font-size: 1.6rem; font-weight: 800; margin: 0; color: var(--text-primary);">${UI.escapeHtml(activePage.title)}</h2>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); text-align: right;">
                <div>Author: <strong>${UI.escapeHtml(activePage.author_name || "Faculty Mentor")}</strong></div>
                <div>Updated: ${new Date(activePage.updated_at).toLocaleDateString()} &bull; v${activePage.version}</div>
              </div>
            </div>
          </div>

          <div style="font-size: 0.95rem; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; font-family: inherit;">
            ${UI.escapeHtml(activePage.content)}
          </div>
        </div>
      </div>
    `;
  },

  selectPage(id) {
    this.selectedPageId = id;
    this.renderWikiHtml(document.getElementById("wiki-main-container"));
  },

  openCreatePageModal() {
    const html = `
      <form id="create-wiki-form" onsubmit="WikiView.handleCreatePage(event)">
        <div class="form-group">
          <label class="form-label">Page Title *</label>
          <input type="text" id="wiki-title" class="form-control" required placeholder="e.g. Architecture Blueprint & DB Schemas">
        </div>
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select id="wiki-category" class="select-input" style="width: 100%;">
            <option value="Architecture">Architecture & Design</option>
            <option value="API Specs">API Specifications</option>
            <option value="Setup Guides">Installation & Setup Guides</option>
            <option value="Meeting Notes">Team Meeting Minutes</option>
            <option value="Research">Research & Papers</option>
            <option value="General">General Documentation</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Documentation Content (Markdown text)</label>
          <textarea id="wiki-content" class="form-control" rows="10" required placeholder="Write documentation here..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Publish Documentation Page</button>
      </form>
    `;
    UI.showModal("Create Documentation Page", html);
  },

  async handleCreatePage(e) {
    e.preventDefault();
    const title = document.getElementById("wiki-title").value;
    const cat = document.getElementById("wiki-category").value;
    const content = document.getElementById("wiki-content").value;

    try {
      const page = await API.post(`/pm/projects/${this.currentProjectId}/wiki`, {
        title: title,
        category: cat,
        content: content,
      });
      UI.success("Page published!");
      UI.closeModal();
      this.selectedPageId = page.id;
      await this.loadWiki();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.WikiView = WikiView;
