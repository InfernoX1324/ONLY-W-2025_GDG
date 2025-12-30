import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMascotExplanation } from './mascot.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const rootDir = path.join(__dirname, '..');

app.use(express.json());

// Serve Home_page.html as the default page
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'frontend', 'Home_page.html'));
});

app.use(express.static(path.join(rootDir, 'frontend')));
app.use('/output', express.static(path.join(__dirname, 'output')));

app.post('/run-test', upload.single('csv'), (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:20',message:'/run-test endpoint called',data:{hasFile:!!req.file,fileName:req.file?.filename,bodyKeys:Object.keys(req.body),target:req.body.target},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Error handling for missing file or target
  if (!req.file) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:25',message:'Missing file in /run-test',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const target = req.body.target;
  if (!target) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:32',message:'Missing target in /run-test',data:{body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return res.status(400).json({ error: 'Target column is required' });
  }
  
  console.log(`🚀 Starting analysis: ${req.file.filename} -> Target: "${target}"`);

  const py = spawn('python', [
    path.join(__dirname, 'integrated_tester.py'),
    req.file.path,
    target
  ]);

  py.stdout.on('data', (data) => console.log(`Python: ${data}`));
  py.stderr.on('data', (data) => console.error(`Python Error: ${data}`));

  py.on('close', (code) => {
    console.log(`✅ Python finished with code ${code}`);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:44',message:'Python process finished, sending response',data:{exitCode:code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (code !== 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:48',message:'Python process failed',data:{exitCode:code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return res.status(500).json({ error: 'Analysis failed', exitCode: code });
    }
    
    res.json({ status: 'done' });
  });
  
  py.on('error', (error) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:56',message:'Python spawn error',data:{errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Python spawn error:', error);
    res.status(500).json({ error: 'Failed to start analysis', message: error.message });
  });
});

app.get('/analysis.json', (req, res) => {
  const jsonPath = path.join(rootDir, 'analysis.json');
  const exists = fs.existsSync(jsonPath);
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:66',message:'/analysis.json endpoint called',data:{jsonPath:jsonPath,fileExists:exists},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  if (!exists) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:70',message:'analysis.json file not found',data:{jsonPath:jsonPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return res.status(404).json({ error: 'Analysis results not found. Please run analysis first.' });
  }
  
  res.sendFile(jsonPath);
});

app.post('/ask-buddy', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:42',message:'/ask-buddy endpoint called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  try {
    const explanation = await getMascotExplanation();
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:46',message:'getMascotExplanation success',data:{explanationLength:explanation?.length,hasExplanation:!!explanation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    res.json({ text: explanation });
  } catch (error) {
    console.error('Ask buddy error:', error);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45c1b164-f5fb-4462-af4c-76a5f36e2403',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:50',message:'/ask-buddy error caught',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    res.status(500).json({ text: 'AI explanation unavailable. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
