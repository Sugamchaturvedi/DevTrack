/**
 * DevTrack Academic Submissions & Evaluations View
 * Student Document Deliverables, Faculty Evaluation & Rubric Grading
 */

const SubmissionsView = {
  currentProjectId: null,

  async render() {
    const user = Auth.getUser();
    if (!user) return "";

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Project Submissions & Academic Evaluations</h1>
          <p class="page-subtitle">Milestone deliverables, document uploads, supervisor reviews, and grade rubrics</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <select id="sub-project-select" class="select-input" onchange="SubmissionsView.switchProject(this.value)">
            <option value="">Select Project...</option>
          </select>
          <button class="btn btn-primary" onclick="SubmissionsView.openUploadModal()">+ Submit Deliverable</button>
        </div>
      </div>

      <div id="submissions-main-container">
        <div style="padding: 2rem; text-align: center;">Loading Submissions...</div>
      </div>
    `;
  },

  async afterRender() {
    const container = document.getElementById("submissions-main-container");
    try {
      const projects = await API.get("/projects/");
      const select = document.getElementById("sub-project-select");
      if (!select) return;

      select.innerHTML = projects.map(p => `<option value="${p.id}">${UI.escapeHtml(p.name)}</option>`).join("");
      if (projects.length > 0) {
        this.currentProjectId = projects[0].id;
        select.value = this.currentProjectId;
        await this.loadSubmissions(this.currentProjectId, "submissions-main-container");
      } else {
        if (container) {
          container.innerHTML = `
            <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📄</div>
              <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Projects Available</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">Create or join an academic project to submit deliverable reports.</p>
              <button class="btn btn-primary" onclick="App.navigate('projects')">+ Go to Projects Hub</button>
            </div>
          `;
        }
      }
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="card" style="padding: 2.5rem; text-align: center; color: var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p>Failed to load Submissions: ${UI.escapeHtml(e.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="SubmissionsView.afterRender()">🔄 Retry</button>
        </div>`;
      }
      UI.error(e.message);
    }
  },

  async switchProject(projectId) {
    if (!projectId) return;
    this.currentProjectId = projectId;
    await this.loadSubmissions(projectId, "submissions-main-container");
  },

  async renderInContainer(projectId, containerId) {
    this.currentProjectId = projectId;
    await this.loadSubmissions(projectId, containerId);
  },

  async loadSubmissions(projectId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const subs = await API.get(`/projects/${projectId}/submissions`);
      const user = Auth.getUser();
      const canEvaluate = Auth.isFaculty() || Auth.isUniversityAdmin();

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700;">Submitted Deliverables (${subs.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="SubmissionsView.openUploadModal()">+ Submit New Deliverable</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${subs.length === 0 ? `
            <div class="card" style="text-align: center; color: var(--text-muted); padding: 3rem;">
              No project submissions yet. Submit your report, code, or proposal!
            </div>
          ` : ""}

          ${subs.map(s => {
            const statusClass = {
              evaluated: "badge-success",
              submitted: "badge-info",
              under_review: "badge-warning",
              revision_requested: "badge-danger",
            }[s.status.toLowerCase()] || "badge-neutral";

            return `
              <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <h4 style="font-size: 1.1rem; font-weight: 700;">${UI.escapeHtml(s.title)}</h4>
                      <span class="badge ${statusClass}">${UI.escapeHtml(s.status)}</span>
                      <span class="badge badge-neutral">${UI.escapeHtml(s.submission_type.toUpperCase())}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                      Submitted by: <strong>${UI.escapeHtml(s.student_name)}</strong> (${s.enrollment_number || ""}) • ${new Date(s.submitted_at).toLocaleString()}
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.5rem;">
                    ${s.file_path ? `<a href="${API_BASE}${s.file_path}" target="_blank" class="btn btn-secondary btn-sm">📎 Download File</a>` : ""}
                    ${s.repo_url ? `<a href="${s.repo_url}" target="_blank" class="btn btn-secondary btn-sm">🌐 Repo Link</a>` : ""}
                    ${canEvaluate ? `<button class="btn btn-primary btn-sm" onclick="SubmissionsView.openEvaluateModal(${s.id}, '${UI.escapeHtml(s.title)}')">⭐ Grade / Review</button>` : ""}
                  </div>
                </div>

                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
                  ${UI.escapeHtml(s.description || "No submission notes provided.")}
                </p>

                <!-- Evaluation Box -->
                ${s.evaluation ? `
                  <div style="background: var(--bg-surface-hover); border-left: 4px solid var(--success); padding: 1rem 1.25rem; border-radius: var(--radius-sm); margin-top: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                      <div style="font-weight: 700; font-size: 0.95rem;">
                        Evaluation Grade: <span style="color: var(--primary); font-size: 1.1rem;">${s.evaluation.grade}</span> (${s.evaluation.marks_obtained} / ${s.evaluation.max_marks} marks)
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">
                        Reviewed by Prof. ${UI.escapeHtml(s.evaluation.reviewer_name)} on ${new Date(s.evaluation.evaluated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-primary);">${UI.escapeHtml(s.evaluation.feedback || "Good work.")}</p>
                  </div>
                ` : `
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">
                    Awaiting faculty review and grading.
                  </div>
                `}
              </div>
            `;
          }).join("")}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--danger);">Failed to load submissions: ${UI.escapeHtml(e.message)}</div>`;
    }
  },

  openUploadModal() {
    if (!this.currentProjectId) {
      UI.warning("Please select a project first.");
      return;
    }

    const formHtml = `
      <form id="upload-sub-form" onsubmit="SubmissionsView.submitDeliverable(event)">
        <div class="form-group">
          <label class="form-label">Deliverable Title *</label>
          <input type="text" id="us-title" class="form-control" required placeholder="e.g. Mid-Term Architecture Document & Demo Link">
        </div>
        <div class="form-group">
          <label class="form-label">Submission Stage *</label>
          <select id="us-type" class="form-control">
            <option value="proposal">Project Proposal</option>
            <option value="progress_report">Progress Report</option>
            <option value="mid_term">Mid-Term Evaluation Deliverable</option>
            <option value="final_report">Final Project Report & Thesis</option>
            <option value="code_repo">Source Code & Demo Archive</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description / Summary</label>
          <textarea id="us-desc" class="form-control" rows="3" placeholder="Provide overview of work accomplished, test results, etc..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Source Code / Demo Repository URL</label>
          <input type="url" id="us-repo" class="form-control" placeholder="https://github.com/username/project">
        </div>
        <div class="form-group">
          <label class="form-label">Attach File (PDF, DOCX, ZIP - Max 25MB)</label>
          <input type="file" id="us-file" class="form-control" accept=".pdf,.doc,.docx,.zip,.tar.gz,.pptx,.txt">
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Upload & Submit</button>
        </div>
      </form>
    `;
    UI.showModal("Submit Academic Project Deliverable", formHtml);
  },

  async submitDeliverable(e) {
    e.preventDefault();
    const title = document.getElementById("us-title").value;
    const type = document.getElementById("us-type").value;
    const desc = document.getElementById("us-desc").value;
    const repo = document.getElementById("us-repo").value;
    const fileInput = document.getElementById("us-file");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("submission_type", type);
    if (desc) formData.append("description", desc);
    if (repo) formData.append("repo_url", repo);
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }

    try {
      await API.post(`/projects/${this.currentProjectId}/submissions`, formData, true);
      UI.success("Deliverable submitted successfully!");
      UI.closeModal();
      this.loadSubmissions(this.currentProjectId, "submissions-main-container" in document ? "submissions-main-container" : "submissions-view-container");
    } catch (err) {
      UI.error(err.message);
    }
  },

  openEvaluateModal(subId, subTitle) {
    const formHtml = `
      <form id="eval-sub-form" onsubmit="SubmissionsView.submitEvaluation(event, ${subId})">
        <div style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
          Grading submission: <strong>${UI.escapeHtml(subTitle)}</strong>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Marks Obtained *</label>
            <input type="number" id="ev-marks" class="form-control" required min="0" max="100" value="85" step="0.5">
          </div>
          <div class="form-group">
            <label class="form-label">Max Marks</label>
            <input type="number" id="ev-max" class="form-control" value="100" readonly>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Letter Grade *</label>
          <select id="ev-grade" class="form-control">
            <option value="A+">A+ (Outstanding)</option>
            <option value="A" selected>A (Excellent)</option>
            <option value="B+">B+ (Very Good)</option>
            <option value="B">B (Good)</option>
            <option value="C">C (Average)</option>
            <option value="F">F (Revision Required)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Feedback & Evaluator Remarks *</label>
          <textarea id="ev-feedback" class="form-control" rows="4" required placeholder="Detailed comments on implementation, documentation, and oral defense..."></textarea>
        </div>
        <div class="modal-footer" style="padding-right: 0; padding-bottom: 0;">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Evaluation</button>
        </div>
      </form>
    `;
    UI.showModal("Academic Evaluation & Grading", formHtml);
  },

  async submitEvaluation(e, subId) {
    e.preventDefault();
    const marks = parseFloat(document.getElementById("ev-marks").value);
    const maxMarks = parseFloat(document.getElementById("ev-max").value);
    const grade = document.getElementById("ev-grade").value;
    const feedback = document.getElementById("ev-feedback").value;

    const payload = {
      marks_obtained: marks,
      max_marks: maxMarks,
      grade,
      feedback,
    };

    try {
      await API.post(`/submissions/${subId}/evaluate`, payload);
      UI.success("Evaluation and grade recorded!");
      UI.closeModal();
      this.loadSubmissions(this.currentProjectId, "submissions-main-container" in document ? "submissions-main-container" : "submissions-view-container");
    } catch (err) {
      UI.error(err.message);
    }
  },
};

window.SubmissionsView = SubmissionsView;
