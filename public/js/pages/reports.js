import { state } from "../state.js";
import { $, icons } from "../icons.js";
import { api } from "../api.js";

let historyData = [];
let activeChart = null;

export function reports() {
  if (state.user?.role !== "admin") return `<div class="panel empty">${icons.warning}<h3>Access Denied</h3><p>Only administrators can view historical reports.</p></div>`;

  return `<div class="page-heading">
    <div><div class="eyebrow">Administration</div><h1>Historical Reports</h1><p>View, analyze, and export past telemetry data.</p></div>
    <div class="page-actions">
      <button class="button secondary" id="export-csv" disabled>${icons.wrench} Export CSV</button>
    </div>
  </div>
  
  <div class="panel filter-bar" style="display: flex; gap: 16px; margin-bottom: 24px; align-items: center; padding: 16px; background: var(--bg-panel); border-radius: 8px;">
    <div style="flex: 1;">
      <label class="small muted" style="display:block; margin-bottom: 4px;">Generator</label>
      <select id="report-generator" aria-label="Select generator" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border);">
        <option value="" disabled selected>Select a generator...</option>
        ${state.generators.map(g => `<option value="${g.generator_id}">${g.name} (${g.serial_no})</option>`).join("")}
      </select>
    </div>
    <div>
      <label class="small muted" style="display:block; margin-bottom: 4px;">Timeframe</label>
      <select id="report-limit" aria-label="Select limit" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);">
        <option value="100">Last 100 readings</option>
        <option value="500">Last 500 readings</option>
        <option value="1000" selected>Last 1000 readings</option>
      </select>
    </div>
    <div style="padding-top: 20px;">
      <button class="button" id="load-report">Load Data</button>
    </div>
  </div>
    
  <div id="report-content" hidden>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>Data Visualization</h2>
      <select id="report-metric" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border); width: 200px;">
        <option value="voltage">Voltage (V)</option>
        <option value="current">Current (A)</option>
        <option value="frequency">Frequency (Hz)</option>
        <option value="temperature">Temperature (°C)</option>
        <option value="fuel_level">Fuel Level (%)</option>
      </select>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;" id="report-summaries">
      <!-- Summaries injected via JS -->
    </div>

    <div class="panel" style="margin-bottom: 32px;">
      <div style="height: 350px; position: relative; width: 100%;">
        <canvas id="report-chart"></canvas>
      </div>
    </div>
    
    <h2>Historical Log</h2>
    <div class="panel table-wrap" style="max-height: 500px; overflow-y: auto;">
      <table>
        <thead style="position: sticky; top: 0; background: var(--bg-panel); z-index: 1;">
          <tr>
            <th>Timestamp</th>
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
  </div>`;
}

function renderChartAndTable(metric) {
  const tbody = document.getElementById("report-tbody");
  if (tbody) {
    tbody.innerHTML = historyData.map(r => `<tr>
      <td>${new Date(r.recorded_at).toLocaleString()}</td>
      <td><span class="status ${r.status === 'running' ? 'running' : 'warning'}">${r.status.toUpperCase()}</span></td>
      <td>${r.voltage} V</td>
      <td>${r.current} A</td>
      <td>${r.frequency} Hz</td>
      <td>${r.temperature} °C</td>
      <td>${r.fuel_level} %</td>
    </tr>`).join("");
  }

  // Calculate Summaries
  const summariesEl = document.getElementById("report-summaries");
  if (summariesEl && historyData.length) {
    const values = historyData.map(r => Number(r[metric])).filter(n => !isNaN(n));
    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      const latest = values[0];
      
      const unit = document.getElementById('report-metric').selectedOptions[0].text.match(/\(([^)]+)\)/)?.[1] || "";
      
      summariesEl.innerHTML = `
        <article class="panel metric" style="padding: 16px;">
          <div class="metric-header"><h3 style="font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Latest</h3></div>
          <div class="metric-value" style="font-size: 1.5em; margin-top: 8px;">${latest}<span>${unit}</span></div>
        </article>
        <article class="panel metric" style="padding: 16px;">
          <div class="metric-header"><h3 style="font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Average</h3></div>
          <div class="metric-value" style="font-size: 1.5em; margin-top: 8px;">${avg}<span>${unit}</span></div>
        </article>
        <article class="panel metric" style="padding: 16px;">
          <div class="metric-header"><h3 style="font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Maximum</h3></div>
          <div class="metric-value" style="font-size: 1.5em; margin-top: 8px; color: var(--danger, #ef4444);">${max}<span>${unit}</span></div>
        </article>
        <article class="panel metric" style="padding: 16px;">
          <div class="metric-header"><h3 style="font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Minimum</h3></div>
          <div class="metric-value" style="font-size: 1.5em; margin-top: 8px;">${min}<span>${unit}</span></div>
        </article>
      `;
    }
  }

  const ctx = document.getElementById("report-chart");
  if (!ctx || !window.Chart) return;
  
  if (activeChart) {
    activeChart.destroy();
  }

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
  Chart.defaults.font.family = 'inherit';
  
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
        backgroundColor: isDark ? 'rgba(89, 224, 170, 0.1)' : 'rgba(4, 120, 87, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        x: { 
          grid: { display: false },
          ticks: { maxTicksLimit: 8, maxRotation: 0 } 
        },
        y: { 
          beginAtZero: false,
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          position: 'right'
        }
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
