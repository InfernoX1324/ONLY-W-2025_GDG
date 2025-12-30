const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard-section');
const loadingOverlay = document.getElementById('loading-overlay');
const fileInput = document.getElementById('csv-file');
const uploadZone = document.getElementById('upload-zone');
const runBtn = document.getElementById('run-test-btn');
const targetSelect = document.getElementById('target-select');
let selectedTarget = null;

targetSelect.addEventListener('change', () => selectedTarget = targetSelect.value);

uploadZone.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) uploadZone.classList.add('active');
  populateTargetDropdown(file);
};

function populateTargetDropdown(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',');
    const rows = lines.slice(1, 15).map(r => r.split(','));

    const numericCols = headers.filter((_, idx) => 
      rows.every(row => row[idx].trim() && !isNaN(parseFloat(row[idx])))
    );

    targetSelect.innerHTML = '<option value="">Select target</option>';
    numericCols.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      targetSelect.appendChild(opt);
    });
  };
  reader.readAsText(file);
}

runBtn.onclick = async () => {
  if (!fileInput.files[0] || !selectedTarget) {
    alert('Select file and target column');
    return;
  }

  loadingOverlay.classList.remove('hidden');

  const formData = new FormData();
  formData.append('csv', fileInput.files[0]);
  formData.append('target', selectedTarget);

  try {
    await fetch('/run-test', { method: 'POST', body: formData });
    const res = await fetch('/analysis.json');
    const data = await res.json();

    loadingOverlay.classList.add('hidden');
    showDashboard(data);
  } catch(e) {
    loadingOverlay.classList.add('hidden');
    alert('Error: ' + e.message);
  }
};

function showDashboard(data) {
  document.getElementById('target-info').textContent = `Target: ${data.target_detected}`;
  document.getElementById('stat-score').textContent = data.score;

  uploadSection.style.display = 'none';
  dashboardSection.style.display = 'block';
}
