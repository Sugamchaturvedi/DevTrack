/**
 * DevTrack Academic Resource Libraries & Document Repository View
 * Templates, institutional guidelines, IEEE formats, rubrics, and checklists
 */

const LibraryView = {
  currentCategory: "all",
  searchQuery: "",

  resources: [
    {
      id: 1,
      title: "IEEE Capstone Project Report Template",
      category: "templates",
      type: "DOCX / PDF",
      icon: "📄",
      size: "2.4 MB",
      author: "Dean of Academic Affairs",
      updated: "Session 2025-2026",
      description: "Official institutional template with approved font hierarchies, bibliography citations, and chapter formatting.",
      content: `# IEEE Capstone Project Report Template\n\n## 1. Introduction\n- Background & Problem Statement\n- Project Objectives\n\n## 2. Literature Review\n- Existing Systems Comparison\n\n## 3. System Architecture\n- Architecture Diagram\n- Database Schema\n\n## 4. Implementation\n- API Specifications\n- Algorithms\n\n## 5. Testing & Evaluation\n- Test Cases & Code Coverage`
    },
    {
      id: 2,
      title: "Software Requirements Specification (SRS) Blueprint",
      category: "templates",
      type: "Markdown / PDF",
      icon: "📋",
      size: "1.1 MB",
      author: "CSE Project Committee",
      updated: "Oct 2025",
      description: "Comprehensive structure for documenting functional specifications, actor use cases, and performance constraints.",
      content: `# Software Requirements Specification (SRS)\n\n1. Purpose and Scope\n2. User Classes and Characteristics\n3. Functional Requirements\n4. Non-Functional Requirements (Security, Performance, Availability)\n5. External Interface Requirements`
    },
    {
      id: 3,
      title: "System Architecture & Database Design Guidelines",
      category: "guidelines",
      type: "PDF Guide",
      icon: "🏗️",
      size: "3.5 MB",
      author: "Faculty Review Board",
      updated: "Nov 2025",
      description: "Mandatory C4 architecture standards, ER diagram conventions, normalization rules, and REST API conventions.",
      content: `# System Architecture Guidelines\n\n- Tiered Architecture: Presentation, Application, Database\n- Database Normalization: Minimum 3NF with foreign key constraints\n- API Standards: RESTful JSON endpoints with JWT Bearer Authentication`
    },
    {
      id: 4,
      title: "Academic Evaluation Rubric & Grading Parameters",
      category: "rubrics",
      type: "Rubric Matrix",
      icon: "⚖️",
      size: "850 KB",
      author: "Department Examination Cell",
      updated: "Active Semester",
      description: "Evaluation weighting: 25% Sprint Progress, 25% Architecture & Code Quality, 25% Final Deliverable, 25% Viva Voce.",
      content: `# Academic Evaluation Rubric\n\n- Sprint Velocity & Task Completion: 25 Marks\n- Code Architecture, Testing, & Clean Code: 25 Marks\n- Final Deliverable Documentation & Innovation: 25 Marks\n- Viva Voce & Technical Defense: 25 Marks`
    },
    {
      id: 5,
      title: "Code Review & Security Audit Checklist",
      category: "checklists",
      type: "Audit Sheet",
      icon: "🛡️",
      size: "620 KB",
      author: "Cybersecurity & QA Lab",
      updated: "Nov 2025",
      description: "Checklist verifying parameterized queries (SQL injection prevention), secret handling, password hashing, and CORS.",
      content: `# Security & Code Quality Checklist\n\n[x] No hardcoded passwords, tokens, or database credentials\n[x] Strong password hashing using bcrypt\n[x] Parameterized SQL ORM queries\n[x] Role-Based Access Control on backend endpoints\n[x] File upload MIME-type & size validation`
    },
    {
      id: 6,
      title: "Sample High-Distinction Capstone Repository",
      category: "samples",
      type: "Reference Code",
      icon: "🎓",
      size: "5.2 MB",
      author: "Graduating Batch",
      updated: "Class of 2025",
      description: "Complete benchmark project implementation with modular Vanilla JS frontend, FastAPI REST layer, and PostgreSQL models.",
      content: `# High Distinction Reference Implementation\n\nThis project serves as an institutional exemplar demonstrating full-stack separation, automated pytest test suites, and multi-tenant university RBAC.`
    }
  ],

  async render() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Academic Resource Libraries</h1>
          <p class="page-subtitle">Standardized project templates, institutional guidelines, rubrics, and reference repositories</p>
        </div>
        <button class="btn btn-primary" onclick="LibraryView.openAddModal()">+ Add New Resource</button>
      </div>

      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="library-search" placeholder="Search templates, guidelines, rubrics..." oninput="LibraryView.onSearch(this.value)">
        </div>
        <div class="filter-controls">
          <div class="tabs" style="margin-bottom: 0; border-bottom: none;">
            <button class="tab-btn active" id="lib-tab-all" onclick="LibraryView.filterCategory('all')">All Resources</button>
            <button class="tab-btn" id="lib-tab-templates" onclick="LibraryView.filterCategory('templates')">Templates</button>
            <button class="tab-btn" id="lib-tab-guidelines" onclick="LibraryView.filterCategory('guidelines')">Guidelines</button>
            <button class="tab-btn" id="lib-tab-rubrics" onclick="LibraryView.filterCategory('rubrics')">Rubrics</button>
            <button class="tab-btn" id="lib-tab-checklists" onclick="LibraryView.filterCategory('checklists')">Checklists</button>
            <button class="tab-btn" id="lib-tab-samples" onclick="LibraryView.filterCategory('samples')">Sample Reports</button>
          </div>
        </div>
      </div>

      <div id="library-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
        <!-- Injected via afterRender -->
      </div>
    `;
  },

  async afterRender() {
    this.renderGrid();
  },

  filterCategory(cat) {
    this.currentCategory = cat;
    document.querySelectorAll(".tabs .tab-btn").forEach(b => b.classList.remove("active"));
    const btn = document.getElementById(`lib-tab-${cat}`);
    if (btn) btn.classList.add("active");
    this.renderGrid();
  },

  onSearch(query) {
    this.searchQuery = (query || "").toLowerCase().trim();
    this.renderGrid();
  },

  renderGrid() {
    const container = document.getElementById("library-grid");
    if (!container) return;

    let items = this.resources;
    if (this.currentCategory !== "all") {
      items = items.filter(r => r.category === this.currentCategory);
    }
    if (this.searchQuery) {
      items = items.filter(r => 
        r.title.toLowerCase().includes(this.searchQuery) || 
        r.description.toLowerCase().includes(this.searchQuery) ||
        r.author.toLowerCase().includes(this.searchQuery)
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
          No academic library resources matched your criteria.
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(r => `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid var(--primary); transition: transform 0.2s, box-shadow 0.2s;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="font-size: 2rem;">${r.icon}</div>
            <span class="badge badge-info">${UI.escapeHtml(r.type)}</span>
          </div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.3;">
            ${UI.escapeHtml(r.title)}
          </h3>
          <p style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
            ${UI.escapeHtml(r.description)}
          </p>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 0.65rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between;">
            <span>By ${UI.escapeHtml(r.author)}</span>
            <span>${UI.escapeHtml(r.size)}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="LibraryView.previewResource(${r.id})">👁️ Preview</button>
            <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="LibraryView.downloadResource(${r.id})">📥 Download</button>
          </div>
        </div>
      </div>
    `).join("");
  },

  previewResource(id) {
    const item = this.resources.find(r => r.id === id);
    if (!item) return;

    UI.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${UI.escapeHtml(item.title)}</h3>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div style="padding: 1rem 0;">
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">
          <strong>Publisher:</strong> ${UI.escapeHtml(item.author)} • <strong>Format:</strong> ${UI.escapeHtml(item.type)} • <strong>Status:</strong> Approved
        </div>
        <pre style="background: var(--bg-surface-hover); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem; line-height: 1.6; max-height: 350px; overflow-y: auto; white-space: pre-wrap; font-family: monospace;">${UI.escapeHtml(item.content)}</pre>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="LibraryView.downloadResource(${item.id})">📥 Download File</button>
      </div>
    `);
  },

  downloadResource(id) {
    const item = this.resources.find(r => r.id === id);
    if (!item) return;

    // Generate downloadable text file
    const blob = new Blob([item.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    UI.success(`Downloaded: ${item.title}`);
  },

  openAddModal() {
    UI.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Publish Institutional Resource</h3>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <form onsubmit="LibraryView.submitAdd(event)">
        <div class="form-group">
          <label class="form-label">Resource Title</label>
          <input type="text" id="lib-new-title" class="form-control" required placeholder="e.g. Microservices Architecture Capstone Guide">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="lib-new-cat" class="form-control" required>
            <option value="templates">Templates</option>
            <option value="guidelines">Guidelines</option>
            <option value="rubrics">Rubrics & Evaluation</option>
            <option value="checklists">Checklists</option>
            <option value="samples">Sample Reports</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description & Scope</label>
          <textarea id="lib-new-desc" class="form-control" rows="3" required placeholder="Describe how students and faculty should use this document..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Initial Template / Outline Content</label>
          <textarea id="lib-new-content" class="form-control" rows="5" required placeholder="# Title\n\nOutline content..."></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Publish Resource</button>
        </div>
      </form>
    `);
  },

  submitAdd(e) {
    e.preventDefault();
    const title = document.getElementById("lib-new-title").value.trim();
    const cat = document.getElementById("lib-new-cat").value;
    const desc = document.getElementById("lib-new-desc").value.trim();
    const content = document.getElementById("lib-new-content").value.trim();

    const user = Auth.getUser();

    const newRes = {
      id: Date.now(),
      title,
      category: cat,
      type: "Document",
      icon: cat === "templates" ? "📄" : (cat === "rubrics" ? "⚖️" : "📚"),
      size: "1.2 MB",
      author: user && user.name ? user.name : "Faculty Mentor",
      updated: "Just now",
      description: desc,
      content: content
    };

    this.resources.unshift(newRes);
    UI.closeModal();
    UI.success("Academic resource published successfully!");
    this.renderGrid();
  }
};
