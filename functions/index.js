const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const mammoth = require("mammoth"); 
const pdf = require("pdf-parse");
require("dotenv").config();

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();

const extractText = async (storagePath, fileType) => {
  try {
    const fileRef = bucket.file(storagePath);
    const [fileBuffer] = await fileRef.download();
    
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
  const API_KEY = process.env.GEMINI_API_KEY; 
  
  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY" || API_KEY.length < 10) {
    console.error("Gemini API key is missing or invalid. Check your environment variables.");
    throw new Error("Missing or invalid API Key for analysis service.");
  }

  // Safest, most stable model endpoint for text processing
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const prompt = `You are a plagiarism and text analyzer. Analyze the following document.
  Provide your analysis *only* in a valid JSON object format, with no other text.
  The JSON object must have three keys:
  1. "overall_score": A number from 0-100 representing a "similarity" score (how generic or likely to be copied this text is).
  2. "summary": A one-paragraph summary of the text.
  3. "matches": An array of "match" objects, where each match has:
     - "source_id": (string) a mock source, e.g., "wikipedia.org"
     - "percent": (number) 0-100
     - "snippets": (array of objects) each object having a "text" key with the matched string.

  Document Text: """
  ${textContent.substring(0, 8000)}
  """
  
  JSON response:`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.0
        },
      }),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }
    
    const result = await response.json();
    if (!result.candidates || !result.candidates[0].content.parts[0].text) {
      throw new Error("AI returned an invalid or empty response.");
    }
    
    let jsonText = result.candidates[0].content.parts[0].text;
    
    // Safety Catch: Strip out any markdown formatting the AI accidentally included
    jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonText); 
  } catch (e) {
    console.error("Failed to call Gemini API or parse JSON:", e);
    return { 
      status: "error", 
      overall_score: 0, 
      summary: `AI analysis failed: ${e.message}`, 
      matches: [] 
    };
  }
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
    return console.log(`Report ${reportRef.id} is not 'pending', skipping.`);
  }

  console.log(`Processing report ${reportRef.id} for file ${reportData.storagePath}...`);

  let textContent = "";
  let finalReport = {};

  try {
    textContent = await extractText(reportData.storagePath, reportData.fileType);
    if (!textContent || textContent.trim().length === 0) {
      throw new Error("File is empty or text could not be extracted.");
    }
    
    console.log("Calling Gemini API for analysis...");
    const aiResult = await getAiAnalysis(textContent);
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

  await reportRef.update({
    ...finalReport,
    processedAt: new Date(),
    textContent: textContent.substring(0, 500) + "...",
  });
  
  console.log(`SUCCESS: Report ${reportRef.id} is complete! Status: ${finalReport.status}`);
  return;
});
