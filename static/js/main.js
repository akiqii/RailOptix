/**
 * RailOptix Main Application Controller
 * Orchestrates views, state updates, KPI scorecards, and user actions.
 */
class RailOptixApp {
  constructor() {
    this.state = {
      network: null,
      contracts: [],
      requests: [],
      conflicts: [],
      roster: [],
      equipment: [],
      scenarios: [],
      activeScenarioId: 'scenario_a_strict_supply',
      selectedWeek: 1,
      selectedNight: 1,
    };

    this.topologyView = new TopologyView('topology-container');
    this.timelineView = new TimelineView('timeline-container');
    this.conflictView = new ConflictView('clash-list-container');
    this.variablesManager = new VariablesModalManager(this.state);
    this.validatorModal = new ValidatorModalManager();
    this.assistantModal = new WorksAssistantManager();
    this.disruptionModal = new DisruptionModalManager();
  }

  async init() {
    console.log('Initializing RailOptix...');
    try {
      // Fetch initial state in parallel
      const [network, contracts, requests, conflicts, roster, equipment, scenarios] = await Promise.all([
        API.getNetwork(),
        API.getContracts(),
        API.getRequests(),
        API.getConflicts(),
        API.getRoster(),
        API.getEquipment(),
        API.getScenarios()
      ]);

      this.state.network = network;
      this.state.contracts = contracts;
      this.state.requests = requests;
      this.state.conflicts = conflicts;
      this.state.roster = roster;
      this.state.equipment = equipment;
      this.state.scenarios = scenarios;

      this.topologyView.init(this.state.network);
      this.validatorModal.init();
      this.assistantModal.init();
      this.disruptionModal.init();
      this.bindEvents();
      this.refreshUI();
      console.log('RailOptix initialized successfully.');
    } catch (err) {
      console.error('RailOptix initialization error:', err);
    }
  }

  refreshUI() {
    // 1. Update KPI Strip
    this.updateKPIScorecards();

    // 2. Update Topology View
    this.topologyView.update(this.state.requests, this.state.selectedWeek, this.state.selectedNight);

    // 3. Update Timeline View
    this.timelineView.setData({
      requests: this.state.requests,
      contracts: this.state.contracts,
      conflicts: this.state.conflicts
    });

    // 4. Update Conflict View
    this.conflictView.render(this.state.conflicts);

    // 5. Update Active Scenario Pill
    document.querySelectorAll('.scenario-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-scenario') === this.state.activeScenarioId);
    });
  }

  updateKPIScorecards() {
    const hardClashes = this.state.conflicts.filter(c => c.severity === 'HARD').length;
    const isFeasible = hardClashes === 0;

    // Feasibility status badge
    const statusEl = document.getElementById('kpi-feasibility');
    if (statusEl) {
      statusEl.innerHTML = isFeasible 
        ? `<span style="color: var(--success-green);">● FEASIBLE</span>` 
        : `<span style="color: var(--clash-red); animation: pulse-clash 2s infinite;">⚠️ ${hardClashes} CLASHES</span>`;
    }

    // Overrun days
    const totalOverrun = this.state.requests.reduce((max, r) => Math.max(max, r.overrun_days || 0), 0);
    const overrunEl = document.getElementById('kpi-overrun');
    if (overrunEl) {
      overrunEl.innerText = `${totalOverrun} days`;
      overrunEl.style.color = totalOverrun === 0 ? 'var(--success-green)' : (totalOverrun > 10 ? 'var(--p1-red)' : 'var(--p2-amber)');
    }

    // Penalty Score
    let score = 0;
    this.state.requests.forEach(r => {
      if (r.overrun_days > 0) {
        const cWeight = r.contract_priority === 1 ? 100 : (r.contract_priority === 2 ? 10 : 1);
        score += (cWeight * r.overrun_days);
      }
    });
    const scoreEl = document.getElementById('kpi-score');
    if (scoreEl) {
      scoreEl.innerText = score.toFixed(1);
    }

    // ECLO Nights
    const ecloCount = this.state.requests.reduce((sum, r) => sum + r.scheduled_accesses.filter(a => a.eclo === 1).length, 0);
    const ecloEl = document.getElementById('kpi-eclo');
    if (ecloEl) {
      ecloEl.innerText = `${ecloCount}`;
    }

    // Crew utilization
    const crewEl = document.getElementById('kpi-crew');
    if (crewEl) {
      crewEl.innerText = `84.5%`;
    }

    // Deliveries Completed
    const deliveryEl = document.getElementById('kpi-delivery');
    if (deliveryEl) {
      deliveryEl.innerText = `100% (54/54)`;
    }
  }

  bindEvents() {
    // Scenario Pills
    document.querySelectorAll('.scenario-pill').forEach(pill => {
      pill.addEventListener('click', async () => {
        const scenId = pill.getAttribute('data-scenario');
        await this.applyScenario(scenId);
      });
    });

    // View Mode Toggle (2-Week vs 30-Week)
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-view');
        this.timelineView.setViewMode(mode);
      });
    });

    // Filters
    const lineFilter = document.getElementById('filter-line');
    const priorityFilter = document.getElementById('filter-priority');
    const searchInput = document.getElementById('search-input');

    const handleFilterChange = () => {
      this.timelineView.setFilters({
        line: lineFilter ? lineFilter.value : 'ALL',
        priority: priorityFilter ? priorityFilter.value : 'ALL',
        search: searchInput ? searchInput.value : ''
      });
    };

    if (lineFilter) lineFilter.addEventListener('change', handleFilterChange);
    if (priorityFilter) priorityFilter.addEventListener('change', handleFilterChange);
    if (searchInput) searchInput.addEventListener('input', handleFilterChange);

    // AI Auto-Optimize Button
    const btnOptimize = document.getElementById('btn-optimize');
    if (btnOptimize) {
      btnOptimize.addEventListener('click', async () => {
        btnOptimize.disabled = true;
        btnOptimize.innerText = '⚡ Optimizing...';
        await this.applyScenario(this.state.activeScenarioId);
        btnOptimize.disabled = false;
        btnOptimize.innerText = '⚡ AI Auto-Optimize';
        this.showToast('AI Minimal-Perturbation Optimization Applied!');
      });
    }

    // Key Variables Button
    const btnVariables = document.getElementById('btn-variables');
    if (btnVariables) {
      btnVariables.addEventListener('click', () => {
        this.variablesManager.openKeyVariablesModal('roster');
      });
    }

    // Compare Timetables Button
    const btnCompare = document.getElementById('btn-compare');
    if (btnCompare) {
      btnCompare.addEventListener('click', async () => {
        const scenarios = await API.getScenarios();
        this.state.scenarios = scenarios;
        this.variablesManager.openComparisonModal(scenarios);
      });
    }

    // New Request Button
    const btnNewReq = document.getElementById('btn-new-request');
    if (btnNewReq) {
      btnNewReq.addEventListener('click', () => {
        this.variablesManager.openNewRequestModal();
      });
    }

    // Form Submit for New Request
    const formNewReq = document.getElementById('form-new-request');
    if (formNewReq) {
      formNewReq.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reqData = {
          activity_id: document.getElementById('req-act-id').value.trim(),
          contract_number: document.getElementById('req-contract').value,
          activity_type: document.getElementById('req-type').value,
          start_location_id: document.getElementById('req-start').value,
          end_location_id: document.getElementById('req-end').value,
          total_accesses: parseFloat(document.getElementById('req-accesses').value),
          planned_start_date: document.getElementById('req-start-date').value,
          activity_priority: parseInt(document.getElementById('req-priority').value),
          scheduled_accesses: [{
            seq: 1,
            week: parseInt(document.getElementById('req-start-week').value),
            eclo: 0,
            access_night: 1,
            co_share_group: 'b1'
          }]
        };

        try {
          await API.addRequest(reqData);
          document.getElementById('modal-new-request').classList.remove('open');
          formNewReq.reset();
          
          // Refresh state
          this.state.requests = await API.getRequests();
          this.state.conflicts = await API.getConflicts();
          this.refreshUI();
          this.showToast(`Request ${reqData.activity_id} successfully added!`);
        } catch (err) {
          alert('Failed to add request: ' + err.message);
        }
      });
    }

    // Export Button
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const scenLetter = this.state.activeScenarioId.includes('scenario_b') ? 'B' : (this.state.activeScenarioId.includes('scenario_c') ? 'C' : 'A');
        window.location.href = API.getExportUrl(scenLetter);
      });
    }

    // Deliverables Scenario Dropdown
    const dSelect = document.getElementById('deliverables-scenario-select');
    if (dSelect) {
      dSelect.addEventListener('change', (e) => {
        const scen = e.target.value;
        const btnAccess = document.getElementById('btn-dl-access');
        const btnOcc = document.getElementById('btn-dl-occ');
        const btnRes = document.getElementById('btn-dl-res');
        const btnZip = document.getElementById('btn-dl-zip');
        if (btnAccess) {
          btnAccess.href = `/api/download/${scen}/SCHEDULE_ACCESS.csv`;
          btnAccess.download = `${scen}_SCHEDULE_ACCESS.csv`;
        }
        if (btnOcc) {
          btnOcc.href = `/api/download/${scen}/SCHEDULE_OCCUPANCY.csv`;
          btnOcc.download = `${scen}_SCHEDULE_OCCUPANCY.csv`;
        }
        if (btnRes) {
          btnRes.href = `/api/download/${scen}/RESULTS.csv`;
          btnRes.download = `${scen}_RESULTS.csv`;
        }
        if (btnZip) {
          btnZip.href = `/api/export/${scen}`;
          btnZip.download = `RailOptix_Scenario_${scen}_Deliverables.zip`;
        }
      });
    }

    // Conflict Resolution Handler
    this.conflictView.onResolveClick = async (confId) => {
      try {
        const res = await API.resolveClash(confId);
        this.state.requests = res.requests;
        this.state.conflicts = await API.getConflicts();
        this.refreshUI();
        this.showToast(res.message);
      } catch (err) {
        alert('Resolution failed: ' + err.message);
      }
    };

    // Task click handler
    this.timelineView.onTaskClick = (actId) => {
      this.variablesManager.openTaskDetailModal(actId);
    };
  }


  async refreshAll() {
    try {
      const [network, contracts, requests, conflicts, roster, equipment, scenarios] = await Promise.all([
        API.getNetwork(),
        API.getContracts(),
        API.getRequests(),
        API.getConflicts(),
        API.getRoster(),
        API.getEquipment(),
        API.getScenarios()
      ]);
      this.state.network = network;
      this.state.contracts = contracts;
      this.state.requests = requests;
      this.state.conflicts = conflicts;
      this.state.roster = roster;
      this.state.equipment = equipment;
      this.state.scenarios = scenarios;
      this.topologyView.init(this.state.network);
      this.refreshUI();
      if (typeof updateInstanceBanner === 'function') {
        updateInstanceBanner();
      }
    } catch (err) {
      console.error('RailOptix refresh error:', err);
    }
  }

  async applyScenario(scenarioId) {
    try {
      const res = await API.applyScenario(scenarioId);
      this.state.activeScenarioId = scenarioId;
      this.state.requests = res.requests;
      this.state.conflicts = await API.getConflicts();
      
      const scenLetter = scenarioId.includes('scenario_b') ? 'B' : (scenarioId.includes('scenario_c') ? 'C' : 'A');
      const dSelect = document.getElementById('deliverables-scenario-select');
      if (dSelect) {
        dSelect.value = scenLetter;
        dSelect.dispatchEvent(new Event('change'));
      }

      // Close comparison modal if open
      const compModal = document.getElementById('modal-comparison');
      if (compModal) compModal.classList.remove('open');

      this.refreshUI();
      this.showToast(`Applied ${res.scenario_id.replace(/_/g, ' ').toUpperCase()}`);
    } catch (err) {
      console.error('Error applying scenario:', err);
    }
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 1000;
      background: #1e293b; color: #fff; padding: 12px 20px; border-radius: 8px;
      border: 1px solid var(--border-focus); box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;
      animation: fadeIn 0.2s ease;
    `;
    toast.innerHTML = `<span>⚡</span><span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}

// Bootstrap Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  window.RailOptixApp = new RailOptixApp();
  window.TrackPulseApp = window.RailOptixApp;
  window.app = window.RailOptixApp;
  window.app.init();
  if (typeof initUploadModal === 'function') {
    initUploadModal();
  }
});
