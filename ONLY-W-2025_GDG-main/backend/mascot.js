// mascot.js
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getMascotExplanation() {
  try {
    // analysis.json lives in project root (../analysis.json)
    const jsonPath = path.join(__dirname, '..', 'analysis.json');

    if (!fs.existsSync(jsonPath)) {
      return 'Still running robustness analysis 🧪';
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    if (data.status !== 'success') {
      return `Analysis failed ❌ Reason: ${data.reason}`;
    }

    // Gemini client (uses GOOGLE_API_KEY or GEMINI_API_KEY from .env)
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing GOOGLE_API_KEY or GEMINI_API_KEY in .env');
      return 'Server misconfigured: missing AI API key.';
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Valid, current model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `
You are DataBuddy 🤖, an ML robustness assistant.
- Respond in plain text only.
- Do NOT use *, **, #, -, or any Markdown.
- Do NOT use code blocks or slashes like //.

Target variable detected: ${data.target_detected || 'unknown'}
Overall robustness score: ${data.score || 0}%
Noise robustness score: ${data.noise_score || 0}%
Missingness robustness score: ${data.missing_score || 0}%
Bias / drift robustness score: ${data.bias_score || 0}%

Explain these results in simple language for a 10th-grade student.
Be very concise and to the point.
Use at most 5 short bullet points.
Avoid jargon.
must say DONE! after explaination is over 
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('Mascot error:', err);
    return 'AI explanation unavailable, but robustness analysis completed correctly.';
  }
}
