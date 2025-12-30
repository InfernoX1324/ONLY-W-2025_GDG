// ===============================
// ELEMENT REFERENCES
// ===============================
const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard-section');
const loadingOverlay = document.getElementById('loading-overlay');
const aiAssistant = document.getElementById('ai-assistant');

const fileInput = document.getElementById('csv-file');
const uploadZone = document.getElementById('upload-zone');
const runBtn = document.getElementById('run-test-btn');
const targetSelect = document.getElementById("target-select");

let selectedTarget = null;
targetSelect.addEventListener("change", () => {
  const newTarget = targetSelect.value;
  selectedTarget = newTarget;
  
  // Clear error status when target is selected
  if (selectedTarget && selectedTarget !== '') {
    statusText.textContent = 'File ready';
    uploadStatus.style.color = 'var(--success)';
    
    // If we're on the dashboard and target changes, automatically run new analysis
    if (dashboardSection.classList.contains('active')) {
      // Check if file is still available
      const file = fileInput.files[0];
      if (file) {
        // Automatically trigger new analysis with new target
        // The loading overlay will show automatically
        setTimeout(() => {
          runBtn.click();
        }, 100);
      } else {
        // File not available, clear old results
        analysisData = null;
        scoresContainer.innerHTML = '';
        chartImg.src = '';
        targetInfo.textContent = '';
        
        // Switch back to upload section to show message
        dashboardSection.classList.remove('active');
        uploadSection.classList.add('active');
        statusText.textContent = 'Target changed. Please upload file again to run analysis.';
        uploadStatus.style.color = 'var(--accent)';
      }
    }
  }
});

const backBtn = document.getElementById('back-btn');

const uploadStatus = document.getElementById('upload-status');
const statusText = uploadStatus.querySelector('.status-text');
const scoresContainer = document.getElementById('scores-container');
const chartImg = document.getElementById('robustness-chart');
const targetInfo = document.getElementById('target-info');

const assistantPanel = document.getElementById('assistant-panel');
const askBtn = document.getElementById('ask-buddy-btn');
const bubbleText = document.getElementById('bubble-text');

const loaderStep = document.getElementById('loader-step');
const progressFill = document.getElementById('progress-fill');

const canvas = document.getElementById('mascot-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let analysisData = null;

// ===============================
// MASCOT INITIALIZATION
// ===============================
function initMascot() {
  // Click to toggle panel
  document
  .querySelector('.mascot-container')
  .addEventListener('click', () => {
    assistantPanel.classList.toggle('active');
  });

}

// ===============================
// FILE UPLOAD HANDLERS
// ===============================
uploadZone.addEventListener('click', () => {
  fileInput.click();
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = '#d4af37';
});

uploadZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--border)';
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.csv')) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      updateUploadZone();
    }
  }
  uploadZone.style.borderColor = 'var(--border)';
});

fileInput.addEventListener('change', updateUploadZone);

function updateUploadZone() {
  const file = fileInput.files[0];
  if (file) {
    uploadZone.classList.add('active');
    uploadZone.innerHTML = `
      <svg class="upload-icon" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="40" fill="#4ade80" opacity="0.2"/>
        <path d="M40 60L55 75L80 45" stroke="#4ade80" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h3 class="upload-title">${file.name}</h3>
      <p class="upload-text">Ready for analysis</p>
    `;
    statusText.textContent = 'File ready';
    uploadStatus.style.color = 'var(--success)';
  }
  populateTargetDropdown(file);

}

// ===============================
// RUN ANALYSIS
// ===============================
runBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    statusText.textContent = 'Please select a file';
    uploadStatus.style.color = 'var(--danger)';
    return;
  }

  // Get target value directly from select element and validate
  const targetValue = targetSelect.value || selectedTarget;
  if (!targetValue || targetValue === '' || targetValue === 'null') {
    statusText.textContent = 'Please select a target column';
    uploadStatus.style.color = 'var(--danger)';
    return;
  }

  loadingOverlay.classList.remove('hidden');

  const steps = [
    'Reading CSV structure...',
    'Computing baseline correlations...',
    'Injecting noise stress tests...',
    'Testing missing data resilience...',
    'Analyzing bias and drift...',
    'Generating robustness plots...',
    'Finalizing report...'
  ];

  let stepIndex = 0;
  const stepInterval = setInterval(() => {
    if (stepIndex < steps.length) {
      loaderStep.textContent = steps[stepIndex];
      const percent = Math.round(((stepIndex + 1) / steps.length) * 100);
      progressFill.style.width = percent + '%';
      stepIndex++;
    }
  }, 700);

  // Call backend endpoint: /run-test
  const formData = new FormData();
  formData.append('csv', file);
  formData.append('target', targetValue);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:182',message:'Before /run-test request',data:{fileName:file.name,fileSize:file.size,targetValue:targetValue,formDataKeys:Array.from(formData.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  try {
    // Step 1: Run the test
    const testResponse = await fetch('/run-test', {
      method: 'POST',
      body: formData
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:191',message:'After /run-test request',data:{status:testResponse.status,statusText:testResponse.statusText,ok:testResponse.ok,headers:Object.fromEntries(testResponse.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:199',message:'/run-test response not ok',data:{status:testResponse.status,errorData:errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error(errorData.error || `Analysis failed: ${testResponse.status} ${testResponse.statusText}`);
    }

    const testResult = await testResponse.json(); // Wait for Python to finish
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:196',message:'testResponse.json() result',data:{testResult:testResult},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Step 2: Fetch analysis results
    const analysisResponse = await fetch('/analysis.json');
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:212',message:'Before parsing analysis.json',data:{status:analysisResponse.status,statusText:analysisResponse.statusText,ok:analysisResponse.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:217',message:'/analysis.json response not ok',data:{status:analysisResponse.status,errorData:errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw new Error(errorData.error || `Failed to fetch analysis results: ${analysisResponse.status}`);
    }
    
    const result = await analysisResponse.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:205',message:'analysis.json parsed',data:{hasStatus:!!result.status,hasScore:!!result.score,keys:Object.keys(result)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    clearInterval(stepInterval);
    loaderStep.textContent = 'Analysis complete!';
    progressFill.style.width = '100%';

    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      showDashboard(result);
    }, 800);

  } catch (error) {
    clearInterval(stepInterval);
    loadingOverlay.classList.add('hidden');
    statusText.textContent = 'Analysis failed. Please try again.';
    uploadStatus.style.color = 'var(--danger)';
    console.error('Error:', error);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:216',message:'Error in run analysis',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }
});
function populateTargetDropdown(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const lines = reader.result.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',');
    const rows = lines.slice(1, 15).map(r => r.split(','));

    const numericCols = headers.filter((_, idx) =>
      rows.every(row => !isNaN(parseFloat(row[idx])))
    );

    targetSelect.innerHTML =
      `<option value="" disabled selected>Select target column</option>`;

    numericCols.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      targetSelect.appendChild(opt);
    });

    targetSelect.style.display = 'block';
  };

  reader.readAsText(file);
}


// ===============================
// SHOW DASHBOARD
// ===============================
function showDashboard(data) {
  analysisData = data;

  if (data.status === 'error') {
    alert('Error during analysis: ' + data.reason);
    return;
  }

  // Update target info
  if (data.target_detected) {
    targetInfo.textContent = `Target column: ${data.target_detected}`;
  }

  // Display scores
  scoresContainer.innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Overall Robustness</div>
      <div class="metric-value">${data.score}%</div>
      <div class="metric-change">${getStatusLabel(data.score)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Noise Resilience</div>
      <div class="metric-value">${data.noise_score}%</div>
      <div class="metric-change">${getStatusLabel(data.noise_score)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Missing Data Handling</div>
      <div class="metric-value">${data.missing_score}%</div>
      <div class="metric-change">${getStatusLabel(data.missing_score)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Bias/Drift Score</div>
      <div class="metric-value">${data.bias_score}%</div>
      <div class="metric-change">${getStatusLabel(data.bias_score)}</div>
    </div>
  `;
  //aaaaaaaaaaaaaaaaaaaaaaaaaaa
    if (data.safe_limits) {                  
    scoresContainer.innerHTML += `
      <div class="metric-card highlight">
        <div class="metric-label">Max Safe Noise</div>
        <div class="metric-value">${data.safe_limits.max_noise_percent}%</div>
        <div class="metric-change">Guideline</div>
      </div>

      <div class="metric-card highlight">
        <div class="metric-label">Max Safe Missing</div>
        <div class="metric-value">${data.safe_limits.max_missing_percent}%</div>
        <div class="metric-change">Guideline</div>
      </div>

      <div class="metric-card highlight">
        <div class="metric-label">Max Safe Bias</div>
        <div class="metric-value">${data.safe_limits.max_bias_factor}</div>
        <div class="metric-change">Guideline</div>
      </div>
    `;
  }
  if (data.dominant_feature) {
  scoresContainer.innerHTML += `
    <div class="metric-card warning">
      <div class="metric-label">Dominant Feature Detected</div>
      <div class="metric-value">${data.dominant_feature.feature}</div>
      <div class="metric-change">
        Influence: ${data.dominant_feature.influence}
      </div>
    </div>
  `;
}

  //aaaaaaaaaaaaaaa
  // Load the generated plot from Python (served from /output)
  const chartUrl = '/output/stress_plot.png?t=' + new Date().getTime();
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:325',message:'Setting chart image src',data:{chartUrl:chartUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  chartImg.src = chartUrl;
  
  chartImg.onload = () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:332',message:'Chart image loaded successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  };
  
  chartImg.onerror = (err) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:337',message:'Chart image failed to load',data:{error:err.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  };

  uploadSection.classList.remove('active');
  dashboardSection.classList.add('active');

  setTimeout(() => {
    aiAssistant.classList.remove('hidden');
    bubbleText.textContent = 'Hi! Click me to get AI-powered insights about your data.';
  }, 600);
}

function getStatusLabel(score) {
  if (score >= 80) return '▲ Excellent';
  if (score >= 60) return '● Good';
  if (score >= 40) return '▼ Fair';
  return '▼ Needs Improvement';
}

// ===============================
// BACK TO UPLOAD
// ===============================
backBtn.addEventListener('click', () => {
  dashboardSection.classList.remove('active');
  uploadSection.classList.add('active');
  
  // Reset file input
  fileInput.value = '';
  
  // Reset target selection
  selectedTarget = null;
  targetSelect.value = '';
  targetSelect.style.display = 'none';
  targetSelect.innerHTML = '<option value="" disabled selected>Select target column</option>';
  
  // Reset upload zone
  uploadZone.classList.remove('active');
  uploadZone.innerHTML = `
    <svg class="upload-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 20V80M60 20L40 40M60 20L80 40" stroke="#d4af37" stroke-width="3" stroke-linecap="round"/>
      <rect x="30" y="70" width="60" height="30" rx="4" stroke="#d4af37" stroke-width="2" stroke-dasharray="4 4" opacity="0.6"/>
    </svg>
    <div class="upload-content">
      <h3 class="upload-title">Drop CSV file here</h3>
      <p class="upload-text">or click to browse your files</p>
      <div class="upload-specs">
        <span class="spec-item">📄 CSV Format</span>
      </div>
    </div>
  `;
  
  // Reset status
  statusText.textContent = 'Ready to upload';
  uploadStatus.style.color = 'var(--text-secondary)';
  
  // Clear analysis data
  analysisData = null;
  
  // Hide AI assistant
  aiAssistant.classList.add('hidden');
  assistantPanel.classList.remove('active');
  
  // Clear scores container
  scoresContainer.innerHTML = '';
  chartImg.src = '';
  targetInfo.textContent = '';
});

// ===============================
// ASSISTANT INTERACTIONS
// ===============================
askBtn.addEventListener('click', async () => {
  if (!analysisData) {
    bubbleText.textContent = 'Please run an analysis first to get AI insights.';
    return;
  }

  bubbleText.textContent = 'Asking AI assistant to explain results...';
  askBtn.disabled = true;

  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:405',message:'Before /ask-buddy request',data:{hasAnalysisData:!!analysisData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Call backend AI endpoint
    const response = await fetch('/ask-buddy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:414',message:'After /ask-buddy request',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:418',message:'/ask-buddy error response',data:{errorData:errorData,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw new Error(errorData.text || `Server error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:424',message:'/ask-buddy success response',data:{hasText:!!result.text,textLength:result.text?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Display AI explanation
    if (result.text) {
      bubbleText.textContent = result.text;
    } else {
      bubbleText.textContent = 'No explanation available. The AI service may be temporarily unavailable.';
    }

  } catch (error) {
    console.error('AI explanation error:', error);
    bubbleText.textContent = `Failed to get AI explanation: ${error.message || 'Network error'}. Please check your connection and try again.`;
  } finally {
    askBtn.disabled = false;
  }
});


// ===============================
// INITIALIZE
// ===============================
window.addEventListener('load', initMascot);
