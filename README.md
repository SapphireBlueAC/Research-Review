# Research Review: AI-Powered Plagiarism Checker

Research Review is a full-stack, real-time web application that serves as a powerful document analysis tool. It uses a secure Firebase backend to manage users and files, and integrates with the Gemini API to provide real-time plagiarism scores and AI-powered summaries for uploaded documents.

This project was built from scratch, featuring a complete React frontend, a serverless Cloud Function backend, and a real-time database architecture using Firestore emulators.

---

### Core Features

* **Secure User Authentication:** Full auth system with Email/Password and Google OAuth sign-in.
* **Real-time AI Analysis:** Upload `.txt` and `.docx` files. A backend Cloud Function reads the text, calls the **Gemini API** for analysis, and provides a **consistent** plagiarism score and summary (achieved by setting `temperature: 0.0`).
* **Real-Time Database:** The app is fully event-driven. The "Reports" page listens for changes in Firestore, instantly updating a file's status from `Pending` to `Complete` without a page refresh.
* **Role-Based Access Control:** Features a simple admin system. Users with the `role: "admin"` in Firestore gain access to a special Admin Portal.
* **Admin Portal:**
    * **User Management:** A protected page that lists all registered users in the system.
    * **Audit Log:** A real-time feed that logs critical events like `FILE_UPLOAD` and `POST_CREATE`.
* **Community & Messaging:**
    * **Community Feed:** A real-time public forum where users can create and view posts.
    * **1-to-1 Messaging:** A private, real-time chat system between users.
    * **Notifications:** A real-time notification system (with an unread badge) that alerts users to new messages.

### Tech Stack

#### **Frontend (Client-side)**
* **React:** Used for building all UI components.
* **Vite:** Powers the local development server and builds the project.
* **Tailwind CSS:** Used for all utility-first styling.
* **Lucide-React:** For all icons.
* **React-Dropzone:** For the file upload component.
* **Firebase Client SDK:** Manages authentication (`onAuthStateChanged`) and real-time data (`onSnapshot`).

#### **Backend (Server-side)**
* **Firebase:** The core backend platform, including:
    * **Firebase Emulators:** Used for 100% local development (Auth, Firestore, Storage, Functions).
    * **Firestore:** NoSQL database for storing user data, reports, posts, and messages.
    * **Firebase Storage:** For hosting all uploaded `.txt` and `.docx` files.
    * **Firebase Authentication:** Manages user accounts.
* **Cloud Functions (Node.js):** The "brains" of the backend.
    * **`onDocumentCreated` Trigger:** The function is triggered *after* a "Pending" report is created, solving all race conditions.
    * **`node-fetch`**: Used to make secure, server-to-server calls to the Gemini API.
    * **`mammoth`**: Used to read and extract plain text from `.docx` files.
    * **`dotenv`**: Used to securely manage the Gemini API key, keeping it out of the code and safe from the Git repository.

---

### **How to Run This Project Locally**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/SapphireBlueAC/Research-Review.git](https://github.com/SapphireBlueAC/Research-Review.git)
    cd Research-Review
    
2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    
3.  **Install Backend Dependencies:**
    ```bash
    cd functions
    npm install
    cd ..
    
4.  **Create Your Firebase Project:**
    * Go to [firebase.google.com](https://firebase.google.com/) and create a new project.
    * Enable **Authentication** (Email/Password, Google), **Firestore** (in "Native Mode"), and **Storage**.
    * Add a **Web App** to your project.
    * Copy the `firebaseConfig` object and paste it into `src/firebase.js`.

5.  **Get Your Gemini API Key:**
    * Go to [ai.google.dev](https://ai.google.dev/) and get an API key.
    * Create a new file in the `functions` folder named `.env`.
    * Add your key to it like this: `GEMINI_API_KEY=AIzaSy...your...key...`
    * *(This file is in the `.gitignore` and will not be uploaded.)*

6.  **Run the Emulators (Terminal 1):**
    ```bash
    firebase emulators:start
    
7.  **Run the App (Terminal 2):**
    ```bash
    npm run dev
    
Your app is now running at `http://localhost:5173/`.
