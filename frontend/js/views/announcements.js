/**
 * DevTrack Campus Announcements View
 */

const AnnouncementsView = {
  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    const canPost = Auth.isFaculty() || Auth.isUniversityAdmin();

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Campus Announcements</h1>
          <p class="page-subtitle">Official university broadcasts, project deadlines, and administrative notices</p>
        </div>
        ${canPost ? `<button class="btn btn-primary" onclick="AnnouncementsView.openCreateModal()">+ Broadcast Announcement</button>` : ""}
      </div>

      <div id="announcements-container">
        <div style="padding: 2rem; text-align: center;">Loading notices...</div>
      </div>
    `;
  },

  async afterRender() {
    await this.loadAnnouncements();
  },

  async loadAnnouncements() {
    const container = document.getElementById("announcements-container");
    if (!container) return;

    try {
      const items = await API.get("/announcements");
      if (items.length === 0) {
        container.innerHTML = `<div class="card" style="text-align: center; color: var(--text-muted); padding: 3rem;">No announcements posted at this time.</div>`;
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${items.map(a => `
            <div class="card" style="border-left: 4px solid var(--primary);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div>
                  <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${UI.escapeHtml(a.title)}</h3>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Broadcast by ${UI.escapeHtml(a.created_by_name)} • Target: <span class="badge badge-neutral">${UI.escapeHtml(a.target_role.toUpperCase())}</span>
                  </div>
                </div>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(a.created_at).toLocaleDateString()}</span>
              </div>
              <p style="color: var(--text-secondary); line-height: 1.6; margin-top: 0.5rem; font-size: 0.9rem;">
                ${UI.escapeHtml(a.content)}
              </p>
            </div>
          `).join("")}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load announcements: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  openCreateModal() {
    const formHtml = `
      <form id="create-ann-form" onsubmit="AnnouncementsView.submitAnnouncement(event)">
        <div class="form-group">
          <label class="form-label">Notice Headline *</label>
          <input type="text" id="an-title" class="form-control" required placeholder="e.g. Schedule for Final Capstone Demonstrations">
        </div>
        <div class="form-group">
          <label class="form-label">Target Audience</label>
          <select id="an-target" class="form-control">
            <option value="all">Entire University Campus (All)</option>
            <option value="student">Students & Team Leaders</option>
            <option value="faculty">Faculty & Project Mentors</option>
            <option value="hod">Department Heads (HODs)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Announcement Content *</label>
          <textarea id="an-content" class="form-control" rows="4" required placeholder="Full message details, venues, dates, and instructions..."></textarea>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Broadcast Now</button>
        </div>
      </form>
    `;
    UI.showModal("Broadcast University Announcement", formHtml);
  },

  async submitAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById("an-title").value;
    const target_role = document.getElementById("an-target").value;
    const content = document.getElementById("an-content").value;

    try {
      await API.post("/announcements", { title, content, target_role });
      UI.success("Announcement broadcast successfully!");
      UI.closeModal();
      await this.loadAnnouncements();
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.AnnouncementsView = AnnouncementsView;
