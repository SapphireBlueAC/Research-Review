# Research Review - Documentation and Tutorial

Welcome to Research Review, an AI-powered platform for document analysis and research collaboration. Whether you are a researcher using the tool or a developer setting it up for the first time, this guide covers everything you need.

---

## Developer Setup (If you just Cloned this Repo)

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18 or higher)
- Firebase CLI (npm install -g firebase-tools)
- Git

### 2. Clone and Install
```bash
# Clone the repository
git clone https://github.com/SapphireBlueAC/Research-Review.git
cd Research-Review

# Install Frontend dependencies
npm install

# Install Backend (Cloud Functions) dependencies
cd functions
npm install
cd ..
```

### 3. Environment Configuration
The backend requires a Google Gemini API Key.
1. Create a file named .env inside the functions/ folder.
2. Add your key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   *(You can get a free key from Google AI Studio)*

### 4. Running the Local Environment
We use Firebase Emulators to simulate the database and storage locally.
```bash
# Start the emulators
firebase emulators:start
```
In a separate terminal, start the React frontend:
```bash
npm run dev
```
The app will be available at: http://localhost:5173

---

## User Guide and Tutorial

### Uploading Documents
1. Log in via Email or Google.
2. Go to "New Upload".
3. Drag and drop a .pdf, .docx, or .txt file.
4. Click "Upload and Analyze".
5. Once the status changes to Complete in the "Reports" tab, click the file name to see your score.

### Understanding the AI Report
- Similarity Score: Shows how much of your text matches external sources.
- AI Summary: Click "Generate Summary" to get a high-level overview of the document.
- Matched Sources: See the exact snippets of text that the AI flagged as potential matches.

### Community and Collaboration
- Community Feed: Share your research thoughts and attach files for others to see.
- Private Messages: Click on a user's name in the "Messages" tab to start a secure, real-time chat.
- Notifications: Keep track of who is interacting with your posts or sending you messages.

---

## Troubleshooting for Cloners

- Error: Permission Denied (403): Your Gemini API key likely has Referrer restrictions. Go to the Google Cloud Console and set Website restrictions to None.
- Error: Model Not Found (404): Some API keys don't have access to gemini-1.5-flash. The backend will automatically try gemini-2.0-flash or gemini-pro as fallbacks.
- Functions Not Triggering: Ensure you ran firebase emulators:start and that your terminal shows firestore function initialized.

---

**Developed by SapphireBlueAC**
