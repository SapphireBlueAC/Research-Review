import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, UploadCloud, FileText, Users, Menu, X, Loader2, LogOut, CheckCircle, AlertCircle, FileUp, Sparkles, MessageSquare, Send, Shield, History, Bell } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

// Import Firebase services
import { auth, firestore, googleProvider, storage } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { 
  doc, setDoc, addDoc, collection, serverTimestamp, 
  query, where, onSnapshot, orderBy, getDoc, limit, updateDoc, writeBatch
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- HELPER: Audit Log (No changes) ---
const logAuditEvent = async (action, user, details) => {
  try {
    await addDoc(collection(firestore, "audit_log"), {
      action: action, userId: user.uid, userEmail: user.email,
      timestamp: serverTimestamp(), details: details,
    });
  } catch (err) { console.error("Failed to write audit log:", err); }
};


// --- HOOKS (No changes) ---
function useUserProfile(user) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const docRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) { setProfile(docSnap.data()); } 
      else { setProfile({ email: user.email, role: 'author' }); }
    });
    return () => unsubscribe();
  }, [user]);
  return profile;
}

function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    if (!userId) return;
    const notifQuery = query(collection(firestore, "notifications"), where("recipientId", "==", userId), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(notifQuery, (querySnapshot) => {
      const notifsData = [];
      querySnapshot.forEach((doc) => { notifsData.push({ id: doc.id, ...doc.data() }); });
      setNotifications(notifsData);
    });
    return () => unsubscribe();
  }, [userId]);
  const unreadCount = notifications.filter(n => !n.read).length;
  return { notifications, unreadCount };
}


// --- Authentication Components (No changes) ---

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setError(''); setLoading(true); try { if (isSigningUp) { const userCredential = await createUserWithEmailAndPassword(auth, email, password); const user = userCredential.user; await setDoc(doc(firestore, "users", user.uid), { uid: user.uid, email: user.email, role: "author", createdAt: new Date() }); } else { await signInWithEmailAndPassword(auth, email, password); } } catch (err) { setError(err.message); } finally { setLoading(false); } };
  const handleGoogleSignIn = async () => { setError(''); try { const result = await signInWithPopup(auth, googleProvider); const user = result.user; await setDoc(doc(firestore, "users", user.uid), { uid: user.uid, email: user.email, role: "author", createdAt: new Date() }, { merge: true }); } catch (err) { setError(err.message); } };
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center font-heading text-slate-900">{isSigningUp ? 'Create Account' : 'Welcome to Research Review'}</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-700">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500" /></div>
          <div><label className="block text-sm font-medium text-slate-700">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="flex items-center justify-center w-full px-4 py-2 font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : (isSigningUp ? 'Sign Up' : 'Sign In')}</button>
        </form>
        <div className="flex items-center my-6"><div className="flex-grow border-t border-slate-300"></div><span className="mx-4 text-sm text-slate-500">or</span><div className="flex-grow border-t border-slate-300"></div></div>
        <button onClick={handleGoogleSignIn} className="flex items-center justify-center w-full px-4 py-2 font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"><svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.601-3.37-11.203-7.973l-6.571 4.819C9.656 39.663 16.318 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.23-2.23 4.14-4.082 5.571l.001-.002 6.19 5.238C36.971 35.798 44 31 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>Sign in with Google</button>
        <p className="mt-6 text-sm text-center text-slate-600">{isSigningUp ? 'Already have an account?' : "Don't have an account?"}<button onClick={() => setIsSigningUp(!isSigningUp)} className="ml-1 font-medium text-slate-800 hover:underline">{isSigningUp ? 'Sign In' : 'Sign Up'}</button></p>
      </div>
    </div>
  );
}

// --- Main Application Components ---

function Sidebar({ activePage, onPageChange, isOpen, onClose, userRole, unreadCount }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'New Upload', icon: UploadCloud },
    { name: 'Reports', icon: FileText },
    { name: 'Community', icon: Users },
    { name: 'Messages', icon: MessageSquare },
    { name: 'Notifications', icon: Bell },
  ];
  const adminItems = [ { name: 'Admin', icon: Shield }, { name: 'Audit Log', icon: History } ];
  const handleSignOut = async () => { await signOut(auth); };
  
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose}></div>}
      <nav className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700"><h1 className="text-2xl font-heading text-white">Research Review</h1><button onClick={onClose} className="md:hidden text-slate-400 hover:text-white"><X size={24} /></button></div>
        <div className="p-4 flex-grow">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.name || (activePage === 'ReportDetail' && item.name === 'Reports');
            const isNotifications = item.name === 'Notifications';
            return (
              <button key={item.name} onClick={() => onPageChange(item.name)} className={`flex items-center justify-between w-full px-3 py-3 rounded-lg text-left text-sm font-medium transition-colors duration-150 ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center"><Icon size={20} className="mr-3" />{item.name}</div>
                {isNotifications && unreadCount > 0 && (<span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">{unreadCount}</span>)}
              </button>
            );
          })}
          {userRole === 'admin' && (
            <div className="mt-4 border-t border-slate-700 pt-6">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.name;
                return (
                  <button key={item.name} onClick={() => onPageChange(item.name)} className={`flex items-center w-full px-3 py-3 rounded-lg text-left text-sm font-medium transition-colors duration-150 ${isActive ? 'bg-red-700 text-white' : 'text-red-300 hover:bg-red-800 hover:text-white'}`}>
                    <Icon size={20} className="mr-3" />
                    {item.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-700"><button onClick={handleSignOut} className="flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"><LogOut size={20} className="mr-3" />Sign Out</button></div>
      </nav>
    </>
  );
}

function Header({ pageTitle, onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b border-slate-200 md:px-6">
      <button onClick={onMenuClick} className="mr-4 text-slate-600 md:hidden" aria-label="Open sidebar"><Menu size={24} /></button>
      <h1 className="text-2xl md:text-3xl font-heading text-slate-900">{pageTitle}</h1>
    </header>
  );
}

// --- File Upload Page (No changes) ---
function NewUploadPage({ user, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const onDrop = useCallback((acceptedFiles) => { const f = acceptedFiles[0]; if (f) { setFile(f); setStatus('idle'); setError(null); setUploadProgress(0); } }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'], }, multiple: false });
  const handleUpload = () => { if (!file) return; setStatus('uploading'); setError(null); const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`); const uploadTask = uploadBytesResumable(storageRef, file); uploadTask.on('state_changed', (snapshot) => { const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100; setUploadProgress(progress); }, (error) => { console.error("Upload failed:", error); setError("Upload failed: " + error.message); setStatus('error'); }, () => { getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => { try { const reportDoc = await addDoc(collection(firestore, "reports"), { authorId: user.uid, fileName: file.name, fileSize: file.size, fileType: file.type, storagePath: uploadTask.snapshot.ref.fullPath, downloadURL: downloadURL, status: "pending", createdAt: serverTimestamp(), }); await logAuditEvent('FILE_UPLOAD', user, { fileName: file.name, storagePath: uploadTask.snapshot.ref.fullPath, reportId: reportDoc.id }); setStatus('success'); setFile(null); onUploadSuccess(); } catch (e) { console.error("Error adding document: ", e); setError("Error creating report in database."); setStatus('error'); } }); }); };
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="p-8 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold font-heading">Submit New Document</h2>
        <p className="mt-2 text-slate-600">Upload your .pdf, .docx, or .txt file for analysis.</p>
        <div {...getRootProps()} className={`mt-6 border-2 border-dashed rounded-lg p-12 text-center cursor-pointer ${isDragActive ? 'border-slate-800 bg-slate-100' : 'border-slate-300 hover:border-slate-400'}`}>
          <input {...getInputProps()} />
          <FileUp size={48} className="mx-auto text-slate-500" />
          {isDragActive ? <p className="mt-4 text-slate-800">Drop the file here ...</p> : <p className="mt-4 text-slate-600">Drag & drop a file here, or click to select a file</p>}
          <p className="mt-1 text-xs text-slate-500">Accepted: .pdf, .docx, .txt</p>
        </div>
        {file && <div className="mt-4 p-4 bg-slate-50 rounded-lg"><p className="font-medium text-slate-800">Selected file:</p><p className="text-sm text-slate-600">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p></div>}
        {status === 'uploading' && <div className="mt-4"><p className="text-sm font-medium text-slate-700">Uploading...</p><div className="w-full bg-slate-200 rounded-full h-2.5 mt-1"><div className="bg-slate-800 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div><p className="text-right text-sm text-slate-700">{Math.round(uploadProgress)}%</p></div>}
        {status === 'success' && <div className="mt-4 flex items-center p-4 bg-green-50 text-green-800 rounded-lg"><CheckCircle size={20} className="mr-3" /><p>Upload successful! Your analysis is pending.</p></div>}
        {status === 'error' && <div className="mt-4 flex items-center p-4 bg-red-50 text-red-800 rounded-lg"><AlertCircle size={20} className="mr-3" /><p>{error}</p></div>}
        <button onClick={handleUpload} disabled={!file || status === 'uploading'} className="flex items-center justify-center w-full px-4 py-3 mt-6 font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50">
          {status === 'uploading' ? <Loader2 className="animate-spin" /> : <><UploadCloud size={20} className="mr-2" />Upload and Analyze</>}
        </button>
      </div>
    </div>
  );
}

// --- Reports Page (UPDATED) ---
// Now shows real status and score from Firestore
function ReportsPage({ user, onViewReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const reportsQuery = query(collection(firestore, "reports"), where("authorId", "==", user.uid), orderBy("createdAt", "desc")); const unsubscribe = onSnapshot(reportsQuery, (querySnapshot) => { const reportsData = []; querySnapshot.forEach((doc) => { reportsData.push({ id: doc.id, ...doc.data() }); }); setReports(reportsData); setLoading(false); }); return () => unsubscribe(); }, [user.uid]);
  if (loading) { return <div className="flex justify-center items-center p-10"><Loader2 size={32} className="animate-spin text-slate-800" /></div>; }
  
  const getStatusChip = (status) => {
    if (status === 'complete') {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Complete</span>;
    }
    if (status === 'error') {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Error</span>;
    }
    return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
  };
  
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold font-heading">Your Reports</h2>
      {reports.length === 0 ? <p className="mt-4 text-slate-600">You have not uploaded any documents yet. Go to "New Upload" to get started.</p> : (
        <div className="mt-6 bg-white rounded-lg shadow-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">File Name</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Uploaded</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th></tr></thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <button onClick={() => onViewReport(report.id)} className="text-slate-800 hover:text-slate-600 hover:underline text-left" disabled={report.status !== 'complete'}>
                      {report.fileName}
                    </button>
                    {report.status !== 'complete' && <span className="text-xs text-slate-400 block">(Report not ready)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{getStatusChip(report.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{report.overall_score ? `${report.overall_score}%` : '--%'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Report Detail Page (UPDATED) ---
// Now reads real data from Firestore, no more mockResult
function ReportDetailPage({ reportId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    const docRef = doc(firestore, "reports", reportId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("No such document!");
        setReport(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [reportId]);

  const handleGenerateSummary = () => {
    setLoadingSummary(true);
    setSummary('');
    setTimeout(() => {
      const mockSummary = `This document shows a high similarity score (${report.overall_score}%), primarily driven by ${report.matches.length} sources. 
A significant portion (${report.matches[0].percent}%) matches ${report.matches[0].source_id}.
A further ${report.matches[1].percent}% matches ${report.matches[1].source_id}.
Key areas for review include the introductory definitions and the discussion on ethical offenses.`;
      setSummary(mockSummary.trim());
      setLoadingSummary(false);
    }, 2000);
  };

  if (loading) { return <div className="flex justify-center items-center p-10"><Loader2 size={32} className="animate-spin text-slate-800" /></div>; }
  if (!report) { return <div className="p-4 md:p-6 max-w-5xl mx-auto"><h2 className="text-2xl font-bold font-heading">Report not found.</h2></div> }
  
  if (report.status === 'pending') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold font-heading">Report for: {report.fileName}</h2>
        <div className="mt-8 p-10 bg-white rounded-lg shadow-xl">
          <Loader2 size={48} className="animate-spin text-slate-800 mx-auto" />
          <h3 className="mt-4 text-xl font-bold text-slate-800">Analysis in Progress</h3>
          <p className="mt-2 text-slate-600">Your report is currently being processed. This page will update automatically when it's complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold font-heading">Report for: {report.fileName}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="p-6 bg-white rounded-lg shadow-xl text-center">
          <span className="text-6xl font-bold font-heading text-red-600">{report.overall_score}%</span>
          <p className="mt-2 text-lg font-medium text-slate-700">Similarity Score</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-xl md:col-span-2">
          <h3 className="text-lg font-bold font-heading">Report Details</h3>
          <p className="mt-2 text-slate-600"><strong>Status:</strong> <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{report.status}</span></p>
          <p className="mt-1 text-slate-600"><strong>File Size:</strong> ({(report.fileSize / 1024 / 1024).toFixed(2)} MB)</p>
          <p className="mt-1 text-slate-600"><strong>Uploaded:</strong> {report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
        </div>
      </div>
      
      <div className="mt-8 p-6 bg-white rounded-lg shadow-xl">
        <div className="flex justify-between items-center"><h3 className="text-xl font-bold font-heading">AI-Assisted Summary</h3><button onClick={handleGenerateSummary} disabled={loadingSummary} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50">{loadingSummary ? (<Loader2 size={16} className="mr-2 animate-spin" />) : (<Sparkles size={16} className="mr-2" />)}Generate Summary</button></div>
        {loadingSummary && <div className="flex justify-center items-center h-24"><Loader2 size={24} className="animate-spin text-slate-600" /><p className="ml-3 text-slate-600">AI is analyzing the report...</p></div>}
        {summary && <p className="mt-4 text-slate-700 whitespace-pre-line">{summary}</p>}
        {!loadingSummary && !summary && <p className="mt-3 text-slate-500 italic">Click the "Generate Summary" button to get an AI-powered overview of this report.</p>}
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-bold font-heading">Matched Sources</h3>
        <div className="mt-4 space-y-6">
          {report.matches.map((match, index) => (
            <div key={index} className="p-6 bg-white rounded-lg shadow-xl">
              <h4 className="text-lg font-bold font-heading text-red-700">{match.percent}% Match</h4>
              <p className="text-sm text-slate-600 break-all"><strong>Source:</strong> <span className="text-blue-600">{match.source_id}</span></p>
              <div className="mt-4 space-y-3">
                {match.snippets.map((snippet, s_index) => (<blockquote key={s_index} className="p-3 border-l-4 border-red-500 bg-red-50 text-red-800">"{snippet.text}"</blockquote>))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Community Page (No changes) ---
function CommunityPage({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setLoading(true); const postsQuery = query(collection(firestore, "posts"), orderBy("createdAt", "desc")); const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => { const postsData = []; querySnapshot.forEach((doc) => { postsData.push({ id: doc.id, ...doc.data() }); }); setPosts(postsData); setLoading(false); }); return () => unsubscribe(); }, []);
  const handlePostSubmit = async (e) => { e.preventDefault(); if (!newPostTitle || !newPostBody) { setError("Title and body are required."); return; } setPostLoading(true); setError(''); try { const postDoc = await addDoc(collection(firestore, "posts"), { title: newPostTitle, body: newPostBody, authorId: user.uid, authorEmail: user.email, createdAt: serverTimestamp(), }); await logAuditEvent('POST_CREATE', user, { title: newPostTitle, postId: postDoc.id }); setNewPostTitle(''); setNewPostBody(''); } catch (err) { console.error("Error creating post:", err); setError("Failed to create post. Please try again."); } finally { setPostLoading(false); } };
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold font-heading">Community Feed</h2>
          {loading && <div className="flex justify-center items-center p-10"><Loader2 size={32} className="animate-spin text-slate-800" /></div>}
          {!loading && posts.length === 0 && <p className="text-slate-600">No posts yet. Be the first to start a discussion!</p>}
          {!loading && posts.map((post) => (
            <div key={post.id} className="p-6 bg-white rounded-lg shadow-xl">
              <h3 className="text-xl font-bold font-heading text-slate-900">{post.title}</h3>
              <p className="mt-2 text-slate-700 whitespace-pre-line">{post.body}</p>
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">Posted by: <span className="font-medium">{post.authorEmail}</span></p>
                <p className="text-xs text-slate-500">On: {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="md:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow-xl sticky top-24">
            <h3 className="text-lg font-bold font-heading">Start a Discussion</h3>
            <form onSubmit={handlePostSubmit} className="mt-4 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700">Title</label><input type="text" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700">Body</label><textarea value={newPostBody} onChange={(e) => setNewPostBody(e.target.value)} rows="5" className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500" /></div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={postLoading} className="flex items-center justify-center w-full px-4 py-2 font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50">
                {postLoading ? <Loader2 className="animate-spin" /> : <><Send size={16} className="mr-2" />Post</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Admin Page (No changes) ---
function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const usersQuery = query(collection(firestore, "users"), orderBy("createdAt", "desc")); const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => { const usersData = []; querySnapshot.forEach((doc) => { usersData.push({ id: doc.id, ...doc.data() }); }); setUsers(usersData); setLoading(false); }); return () => unsubscribe(); }, []);
  if (loading) { return <div className="flex justify-center items-center p-10"><Loader2 size={32} className="animate-spin text-slate-800" /></div>; }
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold font-heading">Admin Portal: User Management</h2>
      <div className="mt-6 bg-white rounded-lg shadow-xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User ID</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th></tr></thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{user.uid}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Messages Page (UPDATED with Notifications) ---
function MessagesPage({ user, profile }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  useEffect(() => { setLoadingUsers(true); const usersQuery = query(collection(firestore, "users"), where("uid", "!=", user.uid)); const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => { const usersData = []; querySnapshot.forEach((doc) => usersData.push({ id: doc.id, ...doc.data() })); setUsers(usersData); setLoadingUsers(false); }); return () => unsubscribe(); }, [user.uid]);
  useEffect(() => { if (!selectedUser) return; setLoadingMessages(true); const convoId = [user.uid, selectedUser.uid].sort().join('_'); const convoRef = doc(firestore, "conversations", convoId); const messagesRef = collection(convoRef, "messages"); const messagesQuery = query(messagesRef, orderBy("createdAt"), limit(50)); const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => { const messagesData = []; querySnapshot.forEach((doc) => messagesData.push({ id: doc.id, ...doc.data() })); setMessages(messagesData); setLoadingMessages(false); }); return () => unsubscribe(); }, [selectedUser, user.uid]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const handleSendMessage = async (e) => { e.preventDefault(); if (newMessage.trim() === '' || !selectedUser) return; const convoId = [user.uid, selectedUser.uid].sort().join('_'); const convoRef = doc(firestore, "conversations", convoId); const messagesRef = collection(convoRef, "messages"); const localNewMessage = newMessage; setNewMessage(''); await addDoc(messagesRef, { text: localNewMessage, senderId: user.uid, createdAt: serverTimestamp(), }); await setDoc(convoRef, { lastMessage: localNewMessage, lastUpdatedAt: serverTimestamp(), participants: [user.uid, selectedUser.uid], }, { merge: true }); await addDoc(collection(firestore, "notifications"), { recipientId: selectedUser.uid, senderEmail: profile.email, text: `Sent you a message: "${localNewMessage.substring(0, 30)}..."`, read: false, createdAt: serverTimestamp(), }); };
  return (
    <div className="flex h-[calc(100vh-4rem)]"><div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto"><h2 className="p-4 text-xl font-bold font-heading border-b border-slate-200">Conversations</h2>{loadingUsers ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> : <div>{users.map((u) => (<button key={u.uid} onClick={() => setSelectedUser(u)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 ${selectedUser?.uid === u.uid ? 'bg-slate-100' : ''}`}><p className="font-medium text-slate-800">{u.email}</p><p className="text-sm text-slate-500 truncate">{u.role}</p></button>))}</div>}</div>
      <div className="w-2/3 flex flex-col bg-slate-50">
        {!selectedUser ? <div className="flex-grow flex items-center justify-center"><p className="text-slate-500">Select a user to start chatting.</p></div> : <>
          <div className="p-4 bg-white border-b border-slate-200 shadow-sm"><h3 className="font-bold text-slate-900">{selectedUser.email}</h3></div>
          <div className="flex-grow p-4 overflow-y-auto">
            {loadingMessages ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> : <div className="space-y-4">{messages.map((msg) => (<div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}><div className={`p-3 rounded-lg max-w-xs ${msg.senderId === user.uid ? 'bg-slate-800 text-white' : 'bg-white shadow-md'}`}>{msg.text}</div></div>))}<div ref={messagesEndRef} /></div>}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="w-full px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-500" />
            <button type="submit" className="ml-3 p-3 bg-slate-800 text-white rounded-full hover:bg-slate-700"><Send size={20} /></button>
          </form>
        </>}
      </div>
    </div>
  );
}

// --- Audit Log Page (No changes) ---
function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const logsQuery = query(collection(firestore, "audit_log"), orderBy("timestamp", "desc"), limit(50)); const unsubscribe = onSnapshot(logsQuery, (querySnapshot) => { const logsData = []; querySnapshot.forEach((doc) => { logsData.push({ id: doc.id, ...doc.data() }); }); setLogs(logsData); setLoading(false); }); return () => unsubscribe(); }, []);
  if (loading) { return <div className="flex justify-center items-center p-10"><Loader2 size={32} className="animate-spin text-slate-800" /></div>; }
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold font-heading">Admin Portal: Audit Log</h2>
      <p className="mt-2 text-slate-600">Showing the last 50 system events.</p>
      <div className="mt-6 bg-white rounded-lg shadow-xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th></tr></thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{log.userEmail}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{log.action}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{log.details.fileName || log.details.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Notifications Page (No changes) ---
function NotificationsPage({ notifications, onMarkAllAsRead }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-heading">Notifications</h2>
        <button onClick={onMarkAllAsRead} className="text-sm font-medium text-slate-600 hover:text-slate-900">Mark all as read</button>
      </div>
      {notifications.length === 0 ? <p className="mt-6 text-slate-600">You have no new notifications.</p> : (
        <div className="mt-6 space-y-4">
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-lg flex items-center ${notif.read ? 'bg-white' : 'bg-blue-50 border border-blue-200'}`}>
              <div className={`w-2 h-2 rounded-full mr-4 ${notif.read ? 'bg-transparent' : 'bg-blue-600'}`}></div>
              <div className="flex-grow">
                <p className="text-sm text-slate-700"><span className="font-medium">{notif.senderEmail}</span> {notif.text}</p>
                <p className="text-xs text-slate-500 mt-1">{notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// --- Page Content Component (UPDATED) ---
function PageContent({ activePage, user, profile, notifications, onMarkAllAsRead, onUploadSuccess, onViewReport, selectedReportId }) {
  let content;
  switch (activePage) {
    case 'New Upload':
      content = <NewUploadPage user={user} onUploadSuccess={onUploadSuccess} />; break;
    case 'Reports':
      content = <ReportsPage user={user} onViewReport={onViewReport} />; break;
    case 'ReportDetail':
      content = <ReportDetailPage reportId={selectedReportId} />; break;
    case 'Community':
      content = <CommunityPage user={user} />; break;
    case 'Messages':
      content = <MessagesPage user={user} profile={profile} />; break;
    case 'Notifications':
      content = <NotificationsPage notifications={notifications} onMarkAllAsRead={onMarkAllAsRead} />; break;
    case 'Admin':
      content = <AdminPage />; break;
    case 'Audit Log':
      content = <AuditLogPage />; break;
    case 'Dashboard':
    default:
      content = (
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold font-heading">Welcome, {profile?.email}</h2>
          <p className="mt-2 text-slate-600">
            You are signed in. Your role is: <span className="font-bold">{profile?.role}</span>
          </p>
        </div>
      );
  }
  const padding = activePage === 'Messages' ? '' : 'p-4 md:p-6';
  return <div className={padding}>{content}</div>;
}

// --- Loading Component (No changes) ---
function LoadingScreen() {
  return <div className="flex items-center justify-center min-h-screen bg-slate-100"><Loader2 size={48} className="animate-spin text-slate-800" /></div>;
}

// --- Main App Component (No changes) ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null); 
  const profile = useUserProfile(user); 
  const { notifications, unreadCount } = useNotifications(user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePageChange = (page) => {
    setActivePage(page);
    if (page !== 'ReportDetail') { setSelectedReportId(null); }
    if (window.innerWidth < 768) { setIsSidebarOpen(false); }
  };

  const handleUploadSuccess = () => {
    setActivePage('Reports');
    setSelectedReportId(null);
  };
  
  const handleViewReport = (reportId) => {
    setSelectedReportId(reportId);
    setActivePage('ReportDetail');
  };
  
  const handleMarkAllAsRead = async () => {
    const batch = writeBatch(firestore);
    notifications.forEach((notif) => {
      if (!notif.read) {
        const notifRef = doc(firestore, "notifications", notif.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit();
  };

  let pageTitle = activePage;
  if (activePage === 'ReportDetail') { pageTitle = 'Report Detail'; }

  if (authLoading) { return <LoadingScreen />; }
  if (!user) { return <LoginPage />; }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={profile?.role}
        unreadCount={unreadCount}
      />
      <div className="flex flex-col flex-1 w-full overflow-y-auto">
        {activePage !== 'Messages' && (
          <Header
            pageTitle={pageTitle}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        )}
        <PageContent 
          activePage={activePage} 
          user={user} 
          profile={profile}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          onUploadSuccess={handleUploadSuccess}
          onViewReport={handleViewReport}
          selectedReportId={selectedReportId}
        />
      </div>
    </div>
  );
}
