const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const mammoth = require("mammoth"); 
const pdf = require("pdf-parse");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();

const extractText = async (storagePath, fileType) => {
  try {
    console.log(`Starting text extraction for ${storagePath} (${fileType})`);
    const fileRef = bucket.file(storagePath);
    
    const [exists] = await fileRef.exists();
    if (!exists) {
      throw new Error(`File does not exist in bucket: ${storagePath}`);
    }

    const [fileBuffer] = await fileRef.download();
    console.log(`File downloaded successfully, size: ${fileBuffer.length} bytes`);
    
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log("Extracting text from DOCX file...");
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } else if (fileType === 'text/plain') {
      console.log("Extracting text from TXT file...");
      return fileBuffer.toString();
    } else if (fileType === 'application/pdf') {
      console.log("Extracting text from PDF file...");
      const data = await pdf(fileBuffer);
      return data.text;
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Currently, only .docx, .txt, and .pdf files are supported for analysis.`);
    }
  } catch (err) {
    console.error("Error in extractText:", err);
    throw new Error(`Text extraction failed: ${err.message}`);
  }
};

const getAiAnalysis = async (textContent) => {
  const API_KEY = (process.env.GEMINI_API_KEY || "").trim(); 
  
  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY" || API_KEY.length < 10) {
    console.error("Gemini API key is missing or invalid.");
    throw new Error("Missing or invalid API Key.");
  }

  const prompt = `You are a plagiarism and text analyzer. Analyze the following document.
  Provide your analysis *only* in a valid JSON object format, with no other text.
  The JSON object must have three keys:
  1. "overall_score": A number from 0-100.
  2. "summary": A one-paragraph summary.
  3. "matches": An array of "match" objects, where each match has:
     - "source_id": (string)
     - "percent": (number)
     - "snippets": (array of objects) each object having a "text" key.

  Document Text: """
  ${textContent.substring(0, 8000)}
  """
  
  JSON response:`;

  // Verified available models for this specific API key from diagnostics:
  const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-pro-latest"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    console.log(`Attempting analysis with model: ${modelName}...`);
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Referer": "https://research-review-v2.firebaseapp.com"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`Model ${modelName} failed (Status ${response.status}).`);
        
        if (response.status === 404) {
          console.log("Checking which models ARE available for this key...");
          try {
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
            const listData = await listResp.json();
            console.log("Available models for this key:", JSON.stringify(listData.models?.map(m => m.name) || listData));
          } catch (listErr) {
            console.error("Failed to list models:", listErr.message);
          }
        }
        
        lastError = `API request failed with status ${response.status}: ${errorBody}`;
        continue; 
      }
      
      const result = await response.json();
      console.log(`Gemini API (${modelName}) responded successfully.`);

      if (!result.candidates || result.candidates.length === 0) {
        console.warn(`Model ${modelName} returned no candidates.`);
        continue;
      }

      const firstCandidate = result.candidates[0];
      if (!firstCandidate.content || !firstCandidate.content.parts || !firstCandidate.content.parts[0].text) {
        console.warn(`Model ${modelName} returned an invalid response.`);
        continue;
      }
      
      let jsonText = firstCandidate.content.parts[0].text;
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      } else {
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
      
      return JSON.parse(jsonText); 

    } catch (e) {
      console.error(`Unexpected error with model ${modelName}:`, e);
      lastError = e.message;
      continue;
    }
  }

  return { 
    status: "error", 
    overall_score: 0, 
    summary: `AI analysis failed. Last error: ${lastError}`, 
    matches: [] 
  };
};

exports.runPlagiarismCheck = onDocumentCreated({ 
  document: "reports/{reportId}", 
  region: "us-west1", // The most stable region for Gemini API
  memory: "1GiB", 
  timeoutSeconds: 120, // Gives the AI plenty of time to process
  concurrency: 1 
}, async (event) => {

  const reportData = event.data.data();
  const reportRef = event.data.ref;

  if (reportData.status !== 'pending') {
    return console.log(`Report ${reportRef.id} is not 'pending' (current status: ${reportData.status}), skipping.`);
  }

  console.log(`Processing report ${reportRef.id} for file ${reportData.storagePath}...`);

  let textContent = "";
  let finalReport = {};

  try {
    textContent = await extractText(reportData.storagePath, reportData.fileType);
    if (!textContent || textContent.trim().length === 0) {
      throw new Error("File is empty or text could not be extracted.");
    }
    console.log(`Text extracted successfully, length: ${textContent.length} chars`);
    
    console.log("Calling Gemini API for analysis...");
    const aiResult = await getAiAnalysis(textContent);
    
    if (aiResult.status === "error") {
      console.error("getAiAnalysis returned an error status.");
    }

    finalReport = {
      ...aiResult,
      status: aiResult.status === "error" ? "error" : "complete",
    };
  } catch (e) {
    console.error(`Failed to process file ${reportData.storagePath}:`, e);
    finalReport = {
      status: "error",
      summary: e.message.toString(),
      overall_score: 0,
      matches: [],
    };
  }

  console.log(`Updating Firestore document ${reportRef.id} with status: ${finalReport.status}`);
  try {
    await reportRef.update({
      ...finalReport,
      processedAt: new Date(),
      textContent: textContent.substring(0, 500) + (textContent.length > 500 ? "..." : ""),
    });
    console.log(`SUCCESS: Report ${reportRef.id} updated!`);
  } catch (updateErr) {
    console.error(`CRITICAL: Failed to update Firestore document ${reportRef.id}:`, updateErr);
  }
  return;
});
