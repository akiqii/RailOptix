/**
 * RailOptix Conflict View (Clashes & AI Solution Hub)
 * Displays detected clashes side-by-side with root-cause analysis and 1-click AI resolution.
 */
class ConflictView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.onResolveClick = null;
  }

  render(conflicts = []) {
    if (!this.container) return;

    if (conflicts.length === 0) {
      this.container.innerHTML = `
        <div class="no-clashes-card">
          <div class="no-clashes-icon">🛡️</div>
          <div style="font-weight: 700; font-size: 15px; color: #fff;">Network Conflict-Free</div>
          <div style="font-size: 12px; margin-top: 6px; color: var(--text-secondary);">
            All physical safety buffers, 750V Live mirrors, and workfront caps are fully satisfied.
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    conflicts.forEach(c => {
      const isHard = c.severity === 'HARD';
      const badgeColor = isHard ? 'var(--clash-red)' : 'var(--warning-amber)';
      const typeLabel = c.type.replace(/_/g, ' ');

      html += `
        <div class="clash-card ${isHard ? 'hard' : 'soft'}" data-conflict-id="${c.id}">
          <div class="clash-header">
            <span class="clash-title">
              <span>⚠️</span>
              <span>${typeLabel}</span>
            </span>
            <span class="clash-badge" style="background: rgba(220,38,38,0.2); color: ${badgeColor};">
              ${c.severity}
            </span>
          </div>

          <div class="clash-desc">
            ${c.description}
          </div>

          <div style="display: flex; gap: 8px; font-size: 11px; color: var(--text-muted);">
            <span>📅 Week ${c.week}</span>
            ${c.access_night ? `<span>🌙 Night ${c.access_night}</span>` : ''}
            ${c.activity_ids ? `<span>🏷️ ${c.activity_ids.join(', ')}</span>` : ''}
          </div>

          <div class="ai-recommendation-box">
            <div class="ai-recommendation-title">
              <span>🤖</span>
              <span>AI Minimal-Perturbation Solution</span>
            </div>
            <div>${c.suggested_resolution}</div>
            <button class="btn-autofix" data-resolve-id="${c.id}">
              ⚡ Apply AI Fix
            </button>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;
    this.attachEvents();
  }

  attachEvents() {
    this.container.querySelectorAll('.btn-autofix').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const confId = btn.getAttribute('data-resolve-id');
        if (confId && this.onResolveClick) {
          btn.disabled = true;
          btn.innerText = 'Resolving...';
          this.onResolveClick(confId);
        }
      });
    });
  }
}
