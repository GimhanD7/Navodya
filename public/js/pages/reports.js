import { state } from "../state.js";
import { $, icons } from "../icons.js";
import { api } from "../api.js";

let historyData = [];
let activeChart = null;

export function reports() {
  if (state.user?.role !== "admin") return `<div class="panel empty">${icons.warning}<h3>Access Denied</h3><p>Only administrators can view historical reports.</p></div>`;

  return `<div class="page-heading">
    <div><div class="eyebrow">Administration</div><h1>Historical Reports</h1><p>View and export past telemetry data.</p></div>
    <div class="page-actions">
      <button class="button secondary" id="export-csv" disabled>${icons.wrench} Export CSV</button>
    </div>
  </div>
  <div class="panel">
    <div style="display: flex; gap: 16px; margin-bottom: 24px; align-items: center;">
      <select id="report-generator" aria-label="Select generator" style="flex: 1; padding: 8px;">
        <option value="" disabled selected>Select a generator...</option>
        ${state.generators.map(g => `<option value="${g.generator_id}">${g.name} (${g.serial_no})</option>`).join("")}
      </select>
      <select id="report-limit" aria-label="Select limit" style="padding: 8px;">
        <option value="100">Last 100 readings</option>
        <option value="500">Last 500 readings</option>
        <option value="1000" selected>Last 1000 readings</option>
      </select>
      <button class="button" id="load-report">Load Data</button>
    </div>
    
    <div id="report-content" hidden>
      <div style="margin-bottom: 16px;">
        <select id="report-metric" style="padding: 8px; width: 100%; max-width: 300px;">
          <option value="voltage">Voltage (V)</option>
          <option value="current">Current (A)</option>
          <option value="frequency">Frequency (Hz)</option>
          <option value="temperature">Temperature (°C)</option>
          <option value="fuel_level">Fuel Level (%)</option>
        </select>
      </div>
      <div style="height: 300px; margin-bottom: 32px; position: relative;">
        <canvas id="report-chart"></canvas>
      </div>
      
      <div class="table-wrap" style="max-height: 400px; overflow-y: auto;">
        <table>
          <thead style="position: sticky; top: 0; background: var(--bg-panel); z-index: 1;">
            <tr>
              <th>Time</th>
              <th>Status</th>
              <th>Voltage</th>
              <th>Current</th>
              <th>Freq</th>
              <th>Temp</th>
              <th>Fuel</th>
            </tr>
          </thead>
          <tbody id="report-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderChartAndTable(metric) {
  const tbody = document.getElementById("report-tbody");
  if (tbody) {
    tbody.innerHTML = historyData.map(r => `<tr>
      <td>${new Date(r.recorded_at).toLocaleString()}</td>
      <td><span class="status ${r.status === 'running' ? 'running' : 'warning'}">${r.status}</span></td>
      <td>${r.voltage} V</td>
      <td>${r.current} A</td>
      <td>${r.frequency} Hz</td>
      <td>${r.temperature} °C</td>
      <td>${r.fuel_level} %</td>
    </tr>`).join("");
  }

  const ctx = document.getElementById("report-chart");
  if (!ctx || !window.Chart) return;
  
  if (activeChart) {
    activeChart.destroy();
  }

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
  
  // Data is descending in time, reverse it for chart
  const chartData = [...historyData].reverse();

  activeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map(r => new Date(r.recorded_at).toLocaleTimeString()),
      datasets: [{
        label: document.getElementById('report-metric').selectedOptions[0].text,
        data: chartData.map(r => r[metric]),
        borderColor: 'var(--primary)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 10 } },
        y: { beginAtZero: false }
      }
    }
  });
}

function exportCSV() {
  if (!historyData.length) return;
  const headers = ["Time", "Status", "Voltage (V)", "Current (A)", "Frequency (Hz)", "Temperature (C)", "Fuel (%)"];
  const csv = [
    headers.join(","),
    ...historyData.map(r => [
      new Date(r.recorded_at).toISOString(),
      r.status,
      r.voltage,
      r.current,
      r.frequency,
      r.temperature,
      r.fuel_level
    ].join(","))
  ].join("\n");
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `generator_report_${Date.now()}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function bindReports() {
  const loadBtn = $("#load-report");
  const genSelect = $("#report-generator");
  const limitSelect = $("#report-limit");
  const metricSelect = $("#report-metric");
  const exportBtn = $("#export-csv");
  
  if (loadBtn) {
    loadBtn.onclick = async () => {
      if (!genSelect.value) return alert("Select a generator first.");
      loadBtn.disabled = true;
      loadBtn.textContent = "Loading...";
      try {
        const res = await api(`/api/generators/${genSelect.value}/history?limit=${limitSelect.value}`);
        historyData = res.rows || [];
        if (historyData.length === 0) {
          alert("No data available for this generator.");
        } else {
          $("#report-content").hidden = false;
          exportBtn.disabled = false;
          renderChartAndTable(metricSelect.value);
        }
      } catch (err) {
        alert("Failed to load report: " + err.message);
      } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = "Load Data";
      }
    };
  }

  if (metricSelect) {
    metricSelect.onchange = () => {
      renderChartAndTable(metricSelect.value);
    };
  }

  if (exportBtn) {
    exportBtn.onclick = exportCSV;
  }
}
