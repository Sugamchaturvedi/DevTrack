/**
 * DevTrack Project Templates Module
 * Reusable project scaffolds with predefined Epics, Milestones, and Workflows
 */

const TemplatesView = {
  templatesList: [],

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>DevTrack</span> &nbsp;/&nbsp; <span>Administration</span> &nbsp;/&nbsp; <span style="color: var(--text-primary); font-weight: 600;">Project Templates</span>
          </div>
          <h1 class="page-title">University Project Templates</h1>
          <p class="page-subtitle">Standardized templates for Capstone, Software, Research, and IoT projects with pre-packaged epics</p>
        </div>
      </div>

      <div id="templates-main-container">
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading Templates...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.loadTemplates();
  },

  async loadTemplates() {
    const container = document.getElementById("templates-main-container");
    if (!container) return;

    try {
      this.templatesList = await API.get("/pm/templates");
      this.renderTemplatesHtml(container, this.templatesList);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load templates: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  renderTemplatesHtml(container, templates) {
    if (!templates || templates.length === 0) {
      container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center;">No templates found.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem;">
        ${templates.map(tmpl => {
          let structure = {};
          try {
            structure = JSON.parse(tmpl.default_structure_json || "{}");
          } catch(e) {}

          const epics = structure.epics || [];
          const milestones = structure.milestones || [];

          return `
            <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <span class="badge badge-info" style="font-size: 0.75rem;">${UI.escapeHtml(tmpl.category)}</span>
                  <span style="font-size: 1.5rem;">📦</span>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0;">
                  ${UI.escapeHtml(tmpl.name)}
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
                  ${UI.escapeHtml(tmpl.description || "")}
                </p>

                <!-- Pre-packaged Epics Preview -->
                <div style="margin-bottom: 1rem;">
                  <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.35rem;">
                    Pre-Packaged Epics (${epics.length}):
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    ${epics.map(ep => `
                      <span style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem;">
                        <span style="color: #8b5cf6;">🟣</span> ${UI.escapeHtml(ep)}
                      </span>
                    `).join("")}
                  </div>
                </div>

                <!-- Pre-packaged Milestones Preview -->
                ${milestones.length > 0 ? `
                  <div style="margin-bottom: 1.25rem;">
                    <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.35rem;">
                      Milestones:
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                      ${milestones.map(m => `
                        <span class="badge badge-neutral" style="font-size: 0.7rem;">📍 ${UI.escapeHtml(m)}</span>
                      `).join("")}
                    </div>
                  </div>
                ` : ""}
              </div>

              <button class="btn btn-primary" style="width: 100%;" onclick="TemplatesView.createProjectFromTemplate('${tmpl.name}', '${tmpl.category}')">
                Use This Template
              </button>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  async createProjectFromTemplate(templateName, category) {
    const projectName = prompt(`Enter project title for your new ${templateName}:`, `Capstone - ${category} System`);
    if (!projectName || !projectName.trim()) return;

    try {
      const code = "PRJ-" + Math.floor(100 + Math.random() * 900);
      const project = await API.post("/projects/", {
        name: projectName.trim(),
        code: code,
        category: category,
        description: `Created from template '${templateName}'. Standard university PMS scaffold.`,
        priority: "high",
        status: "active",
      });

      // Seed initial template epics
      await API.post(`/pm/projects/${project.id}/issues`, {
        title: "Phase 1: Architecture & Requirements",
        issue_type: "epic",
        priority: "high",
        story_points: 13,
      });

      await API.post(`/pm/projects/${project.id}/issues`, {
        title: "Phase 2: Core Engineering Implementation",
        issue_type: "epic",
        priority: "highest",
        story_points: 21,
      });

      UI.success(`Project '${project.name}' created with template scaffolding!`);
      window.location.hash = `#/projects/${project.id}`;
    } catch (e) {
      UI.error(e.message);
    }
  },
};

window.TemplatesView = TemplatesView;
