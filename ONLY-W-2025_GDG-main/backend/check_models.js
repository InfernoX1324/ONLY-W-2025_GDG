import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
});

async function listModels() {
  console.log("\nAVAILABLE MODELS:\n");

  // 🔑 models.list() returns an ASYNC ITERATOR
  for await (const model of client.models.list()) {
    console.log(
      `${model.name}  -->  ${model.supportedGenerationMethods?.join(", ")}`
    );
  }
}

listModels().catch(err => {
  console.error("Model listing failed:", err);
});
