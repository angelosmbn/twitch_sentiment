import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import SentimentStream from './components/sentiment/sentiment.jsx';
import History from './components/history/history';
import HistoryDetail from './components/history/history_detailed';
import LoginSignup from "./components/auth/LoginSignup";
import "./index.css";
import "./App.css";

function useBackendReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8080/healthz');
        if (res.ok) {
          setReady(true);
          clearInterval(interval);
        }
      } catch {
        // Backend not ready yet, keep polling
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return ready;
}

function Home() {
  return (
    <div className="p-10 text-center text-xl font-semibold text-white bg-[#0a0a0d]">
      Welcome to Twitch Insights. Use the navigation to explore sentiment analysis.
    </div>
  );
}

function About() {
  return (
    <div className="p-10 text-center text-xl font-semibold text-white bg-[#0a0a0d]">
      About Us: We analyze Twitch chat to give you live audience insights.
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const hideNavbar = location.pathname === "/auth";
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="min-h-screen overflow-y-hidden bg-[#0a0a0d]">
      {!hideNavbar && (
        <nav className="bg-[#0a0a0d] text-white px-6 py-4 shadow-md relative border-b border-gray-600">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Twitch Insights</h1>
            <div className="flex gap-6 items-center">
              <Link to="/" className="text-sm hover:text-[#888888] transition">HOME</Link>
              <Link to="/analyze" className="text-sm hover:text-[#888888] transition">ANALYZE</Link>
              <Link to="/history" className="text-sm hover:text-[#888888] transition">HISTORY</Link>
              <Link to="/about" className="text-sm hover:text-[#888888] transition">ABOUT US</Link>
            </div>
            <div className="relative flex items-center">
              <button onClick={() => setProfileOpen(!profileOpen)} className="text-white focus:outline-none cursor-pointer">
                <FaUserCircle size={36} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-48 w-48 bg-[#252529] text-white rounded-md shadow-lg z-1000">
                  <div className="px-4 py-3 border-b border-gray-600">
                    <p className="text-sm font-semibold">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-400">{user?.username}</p>
                  </div>
                  <ul className="py-1 text-sm">
                    <li>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-700">Settings</button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          localStorage.removeItem("user");
                          window.location.href = "/auth";
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyze" element={<SentimentStream />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<HistoryDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth" element={<LoginSignup />} />
      </Routes>
    </div>
  );
}

function App() {
  const backendReady = useBackendReady();

  if (!backendReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0d] text-white text-xl space-y-4">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
        <div>Loading backend, please wait...</div>
    
        <style>{`
          .loader {
            border-top-color: #9146FF;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
          }
        `}</style>
      </div>
    );
    
  }

  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
