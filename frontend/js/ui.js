/**
 * DevTrack UI Utilities: Toasts, Modals, Theme Management, Chart Renderers
 */

const UI = {
  // --- Toast Notifications ---
  toast(message, type = "info", duration = 4000) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    toast.innerHTML = `
      <span style="font-weight: 700; font-size: 1.1rem;">${icons[type] || "ℹ"}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.toast(msg, "success"); },
  error(msg) { this.toast(msg, "error", 5000); },
  warning(msg) { this.toast(msg, "warning"); },
  info(msg) { this.toast(msg, "info"); },

  // --- Modal System ---
  showModal(title, bodyHtml, footerHtml = "") {
    let overlay = document.getElementById("app-modal-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "app-modal-overlay";
      overlay.className = "modal-overlay";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="UI.closeModal()">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
      </div>
    `;

    overlay.classList.add("active");
  },

  closeModal() {
    const overlay = document.getElementById("app-modal-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  },

  // --- Theme Management ---
  initTheme() {
    const saved = localStorage.getItem("devtrack_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("devtrack_theme", next);
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.innerHTML = next === "dark" ? "☀️" : "🌙";
    }
  },

  // --- HTML Escaping ---
  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  // --- SVG/Canvas Charts ---
  renderBurndownCanvas(canvasId, labels, ideal, actual) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxVal = Math.max(...ideal, ...(actual.filter(v => v !== null))) || 10;

    // Draw axes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    const stepX = chartW / (labels.length - 1 || 1);

    // Draw Ideal Line (Dashed Orange)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ideal.forEach((val, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Actual Line (Solid Blue)
    ctx.setLineDash([]);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;
    actual.forEach((val, i) => {
      if (val === null) return;
      const x = padding + i * stepX;
      const y = height - padding - (val / maxVal) * chartH;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw dots and X-axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    labels.forEach((lbl, i) => {
      const x = padding + i * stepX;
      ctx.fillText(lbl, x - 12, height - padding + 18);
    });
  },
};

window.UI = UI;
