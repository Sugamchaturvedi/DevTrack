/**
 * DevTrack Main Application Controller & Client-Side Router
 * Modular Vanilla JavaScript SPA with Role-Based Route Guards
 */

const App = {
  async init() {
    UI.initTheme();
    this.initSidebarState();

    window.addEventListener("hashchange", () => this.handleRoute());

    // Global keyboard shortcut: Ctrl+K or Cmd+K focuses omni-search
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) searchInput.focus();
      }
    });
    
    // Check initial session
    const user = await Auth.checkAuth();
    if (!user && !window.location.hash.includes("register")) {
      window.location.hash = "#/login";
    } else if (!window.location.hash || window.location.hash === "#/login") {
      window.location.hash = "#/dashboard";
    }

    this.handleRoute();
  },

  navigate(route) {
    if (!route) return;
    const cleanRoute = route.startsWith("#") ? route : `#/${route.replace(/^\//, "")}`;
    window.location.hash = cleanRoute;
  },

  async handleRoute() {
    const hash = window.location.hash || "#/dashboard";
    const appContainer = document.getElementById("app");
    if (!appContainer) return;

    // Login Route
    if (hash === "#/login") {
      appContainer.innerHTML = this.renderLoginView();
      return;
    }

    // Register Route
    if (hash === "#/register") {
      appContainer.innerHTML = this.renderRegisterView();
      return;
    }

    // Protected Routes: Ensure authenticated user
    const user = Auth.getUser();
    if (!user) {
      window.location.hash = "#/login";
      return;
    }

    // Ensure Base Layout is Present
    let contentOutlet = document.getElementById("content-outlet");
    if (!contentOutlet) {
      appContainer.innerHTML = this.renderMainLayout(user);
      contentOutlet = document.getElementById("content-outlet");
      this.attachLayoutEvents();
    }

    this.updateActiveSidebar(hash);

    // Route Matching
    if (hash === "#/dashboard") {
      contentOutlet.innerHTML = await DashboardView.render();
      if (DashboardView.afterRender) await DashboardView.afterRender();
    } else if (hash === "#/projects") {
      contentOutlet.innerHTML = await ProjectsView.render();
      if (ProjectsView.afterRender) await ProjectsView.afterRender();
    } else if (hash.startsWith("#/projects/")) {
      const projectId = parseInt(hash.replace("#/projects/", ""));
      contentOutlet.innerHTML = await ProjectDetailView.render(projectId);
      if (ProjectDetailView.afterRender) await ProjectDetailView.afterRender();
    } else if (hash === "#/issues") {
      contentOutlet.innerHTML = await IssuesView.render();
      if (IssuesView.afterRender) await IssuesView.afterRender();
    } else if (hash === "#/backlog") {
      contentOutlet.innerHTML = await BacklogView.render();
      if (BacklogView.afterRender) await BacklogView.afterRender();
    } else if (hash === "#/kanban") {
      contentOutlet.innerHTML = await KanbanView.render();
      if (KanbanView.afterRender) await KanbanView.afterRender();
    } else if (hash === "#/sprints") {
      contentOutlet.innerHTML = await SprintsView.render();
      if (SprintsView.afterRender) await SprintsView.afterRender();
    } else if (hash === "#/roadmap") {
      contentOutlet.innerHTML = await RoadmapView.render();
      if (RoadmapView.afterRender) await RoadmapView.afterRender();
    } else if (hash === "#/workload") {
      contentOutlet.innerHTML = await WorkloadView.render();
      if (WorkloadView.afterRender) await WorkloadView.afterRender();
    } else if (hash === "#/timetracking") {
      contentOutlet.innerHTML = await TimeTrackingView.render();
      if (TimeTrackingView.afterRender) await TimeTrackingView.afterRender();
    } else if (hash === "#/risks") {
      contentOutlet.innerHTML = await RisksView.render();
      if (RisksView.afterRender) await RisksView.afterRender();
    } else if (hash === "#/wiki") {
      contentOutlet.innerHTML = await WikiView.render();
      if (WikiView.afterRender) await WikiView.afterRender();
    } else if (hash === "#/automations") {
      contentOutlet.innerHTML = await AutomationsView.render();
      if (AutomationsView.afterRender) await AutomationsView.afterRender();
    } else if (hash === "#/workflows") {
      contentOutlet.innerHTML = await WorkflowsView.render();
      if (WorkflowsView.afterRender) await WorkflowsView.afterRender();
    } else if (hash === "#/templates") {
      contentOutlet.innerHTML = await TemplatesView.render();
      if (TemplatesView.afterRender) await TemplatesView.afterRender();
    } else if (hash === "#/reports") {
      contentOutlet.innerHTML = await ReportsView.render();
      if (ReportsView.afterRender) await ReportsView.afterRender();
    } else if (hash === "#/submissions") {
      contentOutlet.innerHTML = await SubmissionsView.render();
      if (SubmissionsView.afterRender) await SubmissionsView.afterRender();
    } else if (hash === "#/university") {
      contentOutlet.innerHTML = await UniversityView.render();
      if (UniversityView.afterRender) await UniversityView.afterRender();
    } else if (hash === "#/users") {
      contentOutlet.innerHTML = await UsersView.render();
      if (UsersView.afterRender) await UsersView.afterRender();
    } else if (hash === "#/announcements") {
      contentOutlet.innerHTML = await AnnouncementsView.render();
      if (AnnouncementsView.afterRender) await AnnouncementsView.afterRender();
    } else if (hash === "#/library") {
      contentOutlet.innerHTML = await LibraryView.render();
      if (LibraryView.afterRender) await LibraryView.afterRender();
    } else if (hash === "#/profile") {
      contentOutlet.innerHTML = await ProfileView.render();
      if (ProfileView.afterRender) await ProfileView.afterRender();
    } else {
      contentOutlet.innerHTML = `<div class="card">Page not found. <a href="#/dashboard">Return to Dashboard</a></div>`;
    }
  },

  renderMainLayout(user) {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const displayName = user && user.name ? user.name : "Platform Administrator";
    const displayRole = user && user.role ? user.role.replace(/_/g, " ").toUpperCase() : "SUPER ADMIN";
    const avatarLetter = displayName.charAt(0).toUpperCase();

    return `
      <!-- Sliding Sidebar Navigation (Slidebar) -->
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <div class="brand-info">
            <div class="brand-icon">D</div>
            <div class="brand-text">
              <div class="brand-title">DevTrack</div>
              <span class="brand-badge">ACADEMIC SAAS</span>
            </div>
          </div>
          <button class="sidebar-close-btn" onclick="App.toggleSidebar()" title="Collapse Slidebar">◀</button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title">CORE OPERATIONS</div>
          <div class="nav-item" onclick="window.location.hash='#/dashboard'" data-route="#/dashboard">
            <span class="icon">📊</span> <span class="nav-text">Dashboard</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/projects'" data-route="#/projects">
            <span class="icon">📁</span> <span class="nav-text">Projects Hub</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/issues'" data-route="#/issues">
            <span class="icon">🎫</span> <span class="nav-text">Issues</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/kanban'" data-route="#/kanban">
            <span class="icon">📋</span> <span class="nav-text">Tasks & Kanban</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/backlog'" data-route="#/backlog">
            <span class="icon">📦</span> <span class="nav-text">Backlog</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/sprints'" data-route="#/sprints">
            <span class="icon">🏃</span> <span class="nav-text">Sprints & Agile</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/roadmap'" data-route="#/roadmap">
            <span class="icon">🗺️</span> <span class="nav-text">Roadmap</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/submissions'" data-route="#/submissions">
            <span class="icon">📤</span> <span class="nav-text">Submissions & Grading</span>
          </div>

          <div class="nav-section-title">COLLABORATION</div>
          <div class="nav-item" onclick="window.location.hash='#/announcements'" data-route="#/announcements">
            <span class="icon">📢</span> <span class="nav-text">Announcements</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/wiki'" data-route="#/wiki">
            <span class="icon">📚</span> <span class="nav-text">Knowledge Base</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/library'" data-route="#/library">
            <span class="icon">📑</span> <span class="nav-text">Resource Library</span>
          </div>

          <div class="nav-section-title">PROJECT MANAGEMENT</div>
          <div class="nav-item" onclick="window.location.hash='#/workload'" data-route="#/workload">
            <span class="icon">👥</span> <span class="nav-text">Workload</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/timetracking'" data-route="#/timetracking">
            <span class="icon">⏱</span> <span class="nav-text">Time Tracking</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/risks'" data-route="#/risks">
            <span class="icon">🛡️</span> <span class="nav-text">Risks</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/reports'" data-route="#/reports">
            <span class="icon">📈</span> <span class="nav-text">Reports & Analytics</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/automations'" data-route="#/automations">
            <span class="icon">⚡</span> <span class="nav-text">Automation</span>
          </div>

          <div class="nav-section-title">ADMINISTRATION</div>
          <div class="nav-item" onclick="window.location.hash='#/university'" data-route="#/university">
            <span class="icon">🏛️</span> <span class="nav-text">University Setup</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/users'" data-route="#/users">
            <span class="icon">👥</span> <span class="nav-text">User Directory</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/workflows'" data-route="#/workflows">
            <span class="icon">⚙️</span> <span class="nav-text">Workflow Settings</span>
          </div>
          <div class="nav-item" onclick="window.location.hash='#/templates'" data-route="#/templates">
            <span class="icon">📦</span> <span class="nav-text">Project Templates</span>
          </div>
        </nav>
      </aside>

      <!-- Main Layout -->
      <div class="main-wrapper">
        <header class="topbar">
          <div class="topbar-left">
            <!-- Slidebar Toggle Button for Desktop & Mobile -->
            <button class="slidebar-toggle-btn" id="slidebar-toggle-btn" onclick="App.toggleSidebar()" title="Toggle Slidebar Navigation">
              ☰
            </button>
            <div class="university-banner">
              🏛️ <span class="univ-title">Apex National Institute of Technology</span>
            </div>
          </div>

          <!-- Center: Global Omni-Search Bar (Issues, Projects, Users) -->
          <div class="topbar-search-container" style="flex: 1; max-width: 420px; margin: 0 1.25rem;">
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 10px; color: var(--text-muted); font-size: 0.85rem;">🔍</span>
              <input type="text" id="global-search-input" class="form-control" style="padding-left: 32px; height: 36px; font-size: 0.825rem; border-radius: var(--radius-full); background: var(--bg-surface-hover);" placeholder="Search issues (DEV-1001), projects, users... [Ctrl+K]" onkeydown="if(event.key==='Enter') App.handleGlobalSearch(this.value)">
            </div>
          </div>

          <!-- Right Top Corner: Quick Create, Dark Mode, Notifications, Profile -->
          <div class="topbar-right">
            <button class="btn btn-primary btn-sm" onclick="App.openQuickCreateModal()" title="Quick Create Work Item">+ Create</button>
            <button class="icon-btn" id="theme-toggle-btn" onclick="UI.toggleTheme()" title="Toggle Dark/Light Mode">
              ${isDark ? "☀️" : "🌙"}
            </button>
            <button class="icon-btn" onclick="window.location.hash='#/announcements'" title="Notifications">
              🔔
              <span class="badge-dot"></span>
            </button>

            <!-- Platform Administrator Profile Widget at Right Top Corner -->
            <div class="topbar-user-profile" onclick="window.location.hash='#/profile'" title="Manage Account Profile">
              <div class="topbar-user-avatar">${avatarLetter}</div>
              <div class="topbar-user-details">
                <span class="topbar-user-name">${UI.escapeHtml(displayName)}</span>
                <span class="topbar-user-role">${UI.escapeHtml(displayRole)}</span>
              </div>
            </div>

            <button class="btn btn-secondary btn-sm" onclick="Auth.logout()" title="Sign Out">Sign Out</button>
          </div>
        </header>

        <main class="content-container" id="content-outlet"></main>
      </div>
    `;
  },

  toggleSidebar() {
    if (window.innerWidth <= 900) {
      document.body.classList.toggle("sidebar-open");
    } else {
      document.body.classList.toggle("sidebar-collapsed");
      const isCollapsed = document.body.classList.contains("sidebar-collapsed");
      localStorage.setItem("devtrack_sidebar_collapsed", isCollapsed ? "1" : "0");
    }
  },

  initSidebarState() {
    const isCollapsed = localStorage.getItem("devtrack_sidebar_collapsed") === "1";
    if (isCollapsed && window.innerWidth > 900) {
      document.body.classList.add("sidebar-collapsed");
    }
  },

  updateActiveSidebar(hash) {
    // Sync sidebar items
    document.querySelectorAll(".nav-item").forEach(item => {
      const route = item.getAttribute("data-route");
      if (route && (hash === route || (route === "#/projects" && hash.startsWith("#/projects/")))) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  },

  attachLayoutEvents() {
    // Closes mobile sidebar when clicking main content
    const main = document.querySelector(".main-wrapper");
    if (main) {
      main.addEventListener("click", () => {
        if (document.body.classList.contains("sidebar-open")) {
          document.body.classList.remove("sidebar-open");
        }
      });
    }
  },

  renderLoginView() {
    return `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="brand-icon auth-logo" style="width: 48px; height: 48px; font-size: 1.5rem; margin: 0 auto 0.75rem;">D</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">DevTrack University PMS</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Enterprise Project Management & Academic Evaluation</p>
          </div>

          <form id="login-form" onsubmit="App.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="login-email" class="form-control" required placeholder="admin@devtrack.edu or student@devtrack.edu" value="admin@devtrack.edu">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-control" required placeholder="Password" value="DevTrack@123">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">Sign In to Campus Portal</button>
          </form>

          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.85rem; color: var(--text-secondary);">
            Don't have an institutional account? <a href="#/register" style="font-weight: 600;">Register as Student</a>
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">
            <strong>Quick Demo Logins (Password: <code>DevTrack@123</code>):</strong><br>
            • Super Admin: <code>admin@devtrack.edu</code><br>
            • HOD CSE: <code>hod.cse@devtrack.edu</code><br>
            • Faculty Mentor: <code>faculty.mehta@devtrack.edu</code><br>
            • Student: <code>student.priya@devtrack.edu</code><br>
            • Legacy Demo: <code>login@example.com</code> / <code>TestPassword123!</code>
          </div>
        </div>
      </div>
    `;
  },

  renderRegisterView() {
    return `
      <div class="auth-wrapper">
        <div class="auth-card" style="max-width: 480px;">
          <div class="auth-header">
            <div class="brand-icon auth-logo" style="width: 44px; height: 44px; margin: 0 auto 0.75rem;">D</div>
            <h2 style="font-size: 1.4rem; font-weight: 700;">Student Account Registration</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Enroll in DevTrack University System</p>
          </div>

          <form id="register-form" onsubmit="App.handleRegister(event)">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="reg-name" class="form-control" required placeholder="Your full name">
            </div>
            <div class="form-group">
              <label class="form-label">University Email *</label>
              <input type="email" id="reg-email" class="form-control" required placeholder="name@devtrack.edu">
            </div>
            <div class="form-group">
              <label class="form-label">Password *</label>
              <input type="password" id="reg-password" class="form-control" required placeholder="Create secure password">
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select id="reg-role" class="form-control">
                <option value="student">Student</option>
                <option value="team_leader">Team Leader</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">Complete Registration</button>
          </form>

          <div style="margin-top: 1.25rem; text-align: center; font-size: 0.85rem; color: var(--text-secondary);">
            Already registered? <a href="#/login" style="font-weight: 600;">Sign In</a>
          </div>
        </div>
      </div>
    `;
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      await Auth.login(email, password);
      UI.success("Welcome to DevTrack!");
      window.location.hash = "#/dashboard";
      this.handleRoute();
    } catch (err) {
      UI.error(err.message);
    }
  },

  async handleGlobalSearch(query) {
    const q = (query || "").trim();
    if (!q) return;

    // Direct Issue Key match (e.g. DEV-1001 or PRJ-101)
    if (/^[A-Za-z]+-\d+$/.test(q)) {
      try {
        await IssuesView.openIssueDetailModal(q);
        return;
      } catch (e) {}
    }

    // Otherwise run global omni-search API
    try {
      const results = await API.get(`/pm/search?q=${encodeURIComponent(q)}`);
      const issues = results.issues || [];
      const projects = results.projects || [];
      const users = results.users || [];

      const html = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
              Issues (${issues.length})
            </h4>
            ${issues.length === 0 ? `<div style="font-size: 0.8rem; color: var(--text-muted);">No matching issues.</div>` : ""}
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${issues.map(i => `
                <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="UI.closeModal(); IssuesView.openIssueDetailModal('${i.issue_key}')">
                  <div>
                    <strong style="color: #2563eb; font-family: monospace;">${i.issue_key}</strong> &nbsp;
                    <span style="font-weight: 600;">${UI.escapeHtml(i.title)}</span>
                  </div>
                  <span class="badge ${IssuesView.getStatusBadge(i.status)}">${i.status}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div>
            <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
              Projects (${projects.length})
            </h4>
            ${projects.length === 0 ? `<div style="font-size: 0.8rem; color: var(--text-muted);">No matching projects.</div>` : ""}
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${projects.map(p => `
                <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="UI.closeModal(); window.location.hash='#/projects/${p.id}'">
                  <span>📁 <strong>${UI.escapeHtml(p.name)}</strong> (${UI.escapeHtml(p.code || 'PRJ')})</span>
                  <span class="badge badge-neutral">${p.category}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div>
            <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
              Users (${users.length})
            </h4>
            ${users.length === 0 ? `<div style="font-size: 0.8rem; color: var(--text-muted);">No matching users.</div>` : ""}
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${users.map(u => `
                <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface-hover); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                  <span>👤 <strong>${UI.escapeHtml(u.name)}</strong> (${UI.escapeHtml(u.email)})</span>
                  <span class="badge badge-neutral">${u.role}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;

      UI.showModal(`Search Results for "${q}"`, html);
    } catch (err) {
      UI.error(err.message);
    }
  },

  openQuickCreateModal() {
    const html = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">What work item would you like to create?</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="card" style="cursor: pointer; text-align: center; padding: 1.5rem; border: 1px solid var(--border-color); transition: var(--transition);" onclick="UI.closeModal(); IssuesView.openCreateIssueModal()">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎫</div>
            <strong style="font-size: 1rem;">New Issue / Story</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Epic, Story, Task, Bug</div>
          </div>
          <div class="card" style="cursor: pointer; text-align: center; padding: 1.5rem; border: 1px solid var(--border-color); transition: var(--transition);" onclick="UI.closeModal(); ProjectsView.openCreateModal()">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📁</div>
            <strong style="font-size: 1rem;">New Project</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Capstone, Research, Software</div>
          </div>
        </div>
      </div>
    `;
    UI.showModal("Quick Create", html);
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;

    try {
      await Auth.register({ name, email, password, role });
      UI.success("Registration successful! Please sign in.");
      window.location.hash = "#/login";
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.App = App;

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
