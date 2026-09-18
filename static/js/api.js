/**
 * RailOptix API Client
 * Manages all backend communications with the FastAPI engine.
 */
const API = {
  baseUrl: '',

  async getNetwork() {
    const res = await fetch(`${this.baseUrl}/api/network`);
    if (!res.ok) throw new Error('Failed to fetch network topology');
    return await res.json();
  },

  async getContracts() {
    const res = await fetch(`${this.baseUrl}/api/contracts`);
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return await res.json();
  },

  async getRequests() {
    const res = await fetch(`${this.baseUrl}/api/requests`);
    if (!res.ok) throw new Error('Failed to fetch track requests');
    return await res.json();
  },

  async addRequest(reqData) {
    const res = await fetch(`${this.baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData)
    });
    if (!res.ok) throw new Error('Failed to add request');
    return await res.json();
  },

  async updateRequest(activityId, reqData) {
    const res = await fetch(`${this.baseUrl}/api/requests/${encodeURIComponent(activityId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData)
    });
    if (!res.ok) throw new Error('Failed to update request');
    return await res.json();
  },

  async deleteRequest(activityId) {
    const res = await fetch(`${this.baseUrl}/api/requests/${encodeURIComponent(activityId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete request');
    return await res.json();
  },

  async getConflicts() {
    const res = await fetch(`${this.baseUrl}/api/conflicts`);
    if (!res.ok) throw new Error('Failed to fetch conflicts');
    return await res.json();
  },

  async resolveClash(conflictId) {
    const res = await fetch(`${this.baseUrl}/api/resolve-clash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conflict_id: conflictId })
    });
    if (!res.ok) throw new Error('Failed to resolve clash');
    return await res.json();
  },

  async getScenarios() {
    const res = await fetch(`${this.baseUrl}/api/scenarios`);
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return await res.json();
  },

  async applyScenario(scenarioId) {
    const res = await fetch(`${this.baseUrl}/api/apply-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId })
    });
    if (!res.ok) throw new Error('Failed to apply scenario');
    return await res.json();
  },

  async getRoster() {
    const res = await fetch(`${this.baseUrl}/api/roster`);
    if (!res.ok) throw new Error('Failed to fetch engineering roster');
    return await res.json();
  },

  async getEquipment() {
    const res = await fetch(`${this.baseUrl}/api/equipment`);
    if (!res.ok) throw new Error('Failed to fetch equipment registry');
    return await res.json();
  },

  getExportUrl(scenarioLetter) {
    return `${this.baseUrl}/api/export/${scenarioLetter.toUpperCase()}`;
  },

  async getInstanceInfo() {
    const res = await fetch(`${this.baseUrl}/api/instance-info`);
    if (!res.ok) throw new Error('Failed to fetch instance info');
    return await res.json();
  },

  async uploadInstance(formData) {
    const res = await fetch(`${this.baseUrl}/api/upload-instance`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail ? (data.detail.errors ? data.detail.errors.join('\n') : data.detail.message || JSON.stringify(data.detail)) : 'Upload failed';
      throw new Error(msg);
    }
    return data;
  },

  async resetInstance() {
    const res = await fetch(`${this.baseUrl}/api/reset-instance`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reset instance');
    return await res.json();
  },

  async getValidatorReport(scenarioLetter) {
    const res = await fetch(`${this.baseUrl}/api/validator-report/${encodeURIComponent(scenarioLetter.toUpperCase())}`);
    if (!res.ok) throw new Error(`Failed to fetch validator report for Scenario ${scenarioLetter}`);
    return await res.json();
  },

  async queryAssistant(prompt, scenarioId) {
    const res = await fetch(`${this.baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, scenario_id: scenarioId })
    });
    if (!res.ok) throw new Error('Failed to query 2AM Works Controller Assistant');
    return await res.json();
  },

  async simulateDisruption(payload) {
    const res = await fetch(`${this.baseUrl}/api/disruption/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to simulate disruption');
    return await res.json();
  },

  async applyDisruption(payload) {
    const res = await fetch(`${this.baseUrl}/api/disruption/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to apply disruption');
    return await res.json();
  }
};
