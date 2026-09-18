/**
 * RailOptix Timeline View
 * Supports Dual View Modes:
 * 1. 2-Week High-Resolution Operational Grid (Nights 1 to 14 with Crew & Equipment tags)
 * 2. 30-Week Strategic Horizon Master Gantt
 */
class TimelineView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.viewMode = '2week'; // '2week' or '30week'
    this.requests = [];
    this.contracts = [];
    this.conflicts = [];
    this.filterLine = 'ALL';
    this.filterPriority = 'ALL';
    this.searchTerm = '';
    this.onTaskClick = null;
  }

  setData({ requests, contracts, conflicts }) {
    this.requests = requests || [];
    this.contracts = contracts || [];
    this.conflicts = conflicts || [];
    this.render();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  }

  setFilters({ line, priority, search }) {
    if (line !== undefined) this.filterLine = line;
    if (priority !== undefined) this.filterPriority = priority;
    if (search !== undefined) this.searchTerm = search.toLowerCase();
    this.render();
  }

  render() {
    if (!this.container) return;

    // Filter requests
    const filtered = this.requests.filter(r => {
      const matchLine = this.filterLine === 'ALL' || r.start_location_id.includes(this.filterLine);
      const matchPriority = this.filterPriority === 'ALL' || String(r.contract_priority) === String(this.filterPriority);
      const matchSearch = !this.searchTerm || 
        r.activity_id.toLowerCase().includes(this.searchTerm) || 
        r.contract_number.toLowerCase().includes(this.searchTerm);
      return matchLine && matchPriority && matchSearch;
    });

    if (this.viewMode === '2week') {
      this.renderOperationalGrid(filtered);
    } else {
      this.renderStrategicGantt(filtered);
    }
  }

  renderOperationalGrid(filteredRequests) {
    let html = `
      <div class="operational-grid">
        <div class="grid-header-cell" style="text-align: left; padding-left: 12px;">CONTRACT / ACTIVITY</div>
    `;

    // 14 night columns
    for (let day = 1; day <= 14; day++) {
      const wk = Math.floor((day - 1) / 7) + 1;
      const night = ((day - 1) % 7) + 1;
      html += `
        <div class="grid-header-cell">
          <div>D${day}</div>
          <div style="font-size: 9px; color: var(--text-muted); font-weight: 400;">W${wk} N${night}</div>
        </div>
      `;
    }

    // Group requests by contract
    const grouped = {};
    filteredRequests.forEach(r => {
      grouped[r.contract_number] = grouped[r.contract_number] || [];
      grouped[r.contract_number].push(r);
    });

    Object.keys(grouped).sort().forEach(cNum => {
      const reqs = grouped[cNum];
      reqs.forEach(r => {
        const priorityClass = `p${r.contract_priority || 3}`;
        html += `
          <div class="grid-row-header">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 700; color: #fff;">${r.activity_id}</span>
              <span class="brand-badge" style="font-size: 9px;">${cNum}</span>
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${r.nature_of_works || ''}</div>
          </div>
        `;

        for (let day = 1; day <= 14; day++) {
          const wk = Math.floor((day - 1) / 7) + 1;
          const night = ((day - 1) % 7) + 1;

          // Find accesses in this day/night
          const accs = r.scheduled_accesses.filter(a => a.week === wk && a.access_night === night);
          const hasClash = this.conflicts.some(c => c.week === wk && c.access_night === night && c.activity_ids.includes(r.activity_id));

          html += `<div class="grid-cell" data-activity="${r.activity_id}" data-day="${day}">`;
          accs.forEach(acc => {
            const clashClass = hasClash ? 'clash' : '';
            const crewTag = acc.assigned_engineers && acc.assigned_engineers.length > 0 
              ? `<div style="font-size: 9px; color: #a78bfa;">👤 ${acc.assigned_engineers[0]}</div>` 
              : '';
            const equipTag = acc.assigned_equipment && acc.assigned_equipment.length > 0 
              ? `<div style="font-size: 9px; color: #38bdf8;">⚙️ ${acc.assigned_equipment[0]}</div>` 
              : '';

            html += `
              <div class="task-chip ${priorityClass} ${clashClass}" title="${r.activity_id} - Slot: ${acc.co_share_group}">
                <div>Slot ${acc.co_share_group} ${acc.eclo ? '⚡ECLO' : ''}</div>
                ${crewTag}
                ${equipTag}
              </div>
            `;
          });
          html += `</div>`;
        }
      });
    });

    html += `</div>`;
    this.container.innerHTML = html;
    this.attachEvents();
  }

  renderStrategicGantt(filteredRequests) {
    let html = `
      <div style="overflow-x: auto;">
        <table class="gantt-table">
          <thead>
            <tr style="background: var(--bg-card); border-bottom: 2px solid var(--border-color);">
              <th style="padding: 10px 14px; text-align: left; width: 220px; font-size: 11px;">ACTIVITY / CONTRACT</th>
    `;

    for (let w = 1; w <= 30; w++) {
      html += `<th style="padding: 8px 4px; font-size: 10px; width: 28px; text-align: center; border-right: 1px solid rgba(255,255,255,0.05);">W${w}</th>`;
    }

    html += `</tr></thead><tbody>`;

    filteredRequests.forEach(r => {
      const priorityClass = `p${r.contract_priority || 3}`;
      const activeWeeks = new Set(r.scheduled_accesses.map(a => a.week));
      const hasClash = this.conflicts.some(c => c.activity_ids.includes(r.activity_id));
      const isOverrunning = r.overrun_days > 0;

      html += `
        <tr class="gantt-row">
          <td class="gantt-label-cell">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 700; color: #fff;">${r.activity_id}</span>
              <span class="brand-badge" style="font-size: 9px;">${r.contract_number}</span>
            </div>
            <div style="font-size: 10px; color: var(--text-muted);">${r.nature_of_works} (${r.total_accesses} acc)</div>
          </td>
      `;

      for (let w = 1; w <= 30; w++) {
        const isActive = activeWeeks.has(w);
        const cellClash = this.conflicts.some(c => c.week === w && c.activity_ids.includes(r.activity_id));

        let cellContent = '';
        if (isActive) {
          const bg = isOverrunning && w >= 27 ? 'background: #dc2626;' : (r.contract_priority === 1 ? 'background: #ef4444;' : (r.contract_priority === 2 ? 'background: #f59e0b;' : 'background: #3b82f6;'));
          cellContent = `<div style="${bg} width: 100%; height: 16px; border-radius: 3px; ${cellClash ? 'border: 1px solid #fff; box-shadow: 0 0 6px #ef4444;' : ''}"></div>`;
        }

        html += `<td style="padding: 2px; border-right: 1px solid rgba(255,255,255,0.05); text-align: center; background: ${isActive ? 'rgba(255,255,255,0.02)' : 'transparent'};">${cellContent}</td>`;
      }

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    this.container.innerHTML = html;
    this.attachEvents();
  }

  attachEvents() {
    this.container.querySelectorAll('.task-chip, .gantt-row').forEach(el => {
      el.addEventListener('click', (e) => {
        const actId = el.closest('[data-activity]') ? el.closest('[data-activity]').getAttribute('data-activity') : null;
        if (actId && this.onTaskClick) {
          this.onTaskClick(actId);
        }
      });
    });
  }
}
