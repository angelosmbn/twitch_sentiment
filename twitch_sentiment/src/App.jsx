import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import SentimentStream from './components/sentiment/sentiment.jsx';
import History from './components/history/history';
import HistoryDetail from './components/history/history_detailed';
import LoginSignup from "./components/auth/LoginSignup";
import Settings from "./components/settings/settings";
import Users from "./components/users/users";
import UsersDetail from "./components/users/users_detailed";
import Logs from "./components/logs/logs";
import Dashboard from "./components/dashboard/dashboard";
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
  const [adminMode, setAdminMode] = useState(() => {
    // Retrieve the adminMode from localStorage, default to false
    const savedAdminMode = localStorage.getItem('adminMode');
    return savedAdminMode === 'true'; // Convert the stored value to a boolean
  });

  const [hasRedirected, setHasRedirected] = useState(false); // Flag to track redirection
  const hideNavbar = location.pathname === "/auth";
  const user = JSON.parse(localStorage.getItem("user"));
  const is_admin = user?.role === "admin";

  const dropdownRef = useRef(null);

  // Effect to persist adminMode in localStorage when it changes
  useEffect(() => {
    // Save the updated adminMode to localStorage when it changes
    localStorage.setItem('adminMode', adminMode);
  }, [adminMode]);

  useEffect(() => {
    // Only redirect when adminMode is toggled
    const handleAdminModeToggle = () => {
      // When adminMode is enabled, redirect to /dashboard
      if (adminMode && location.pathname !== '/dashboard') {
        window.location.href = '/dashboard'; // Redirect to dashboard
      }
      else if (!user && location.pathname == '/auth') {
        
      }
      // When adminMode is disabled, redirect to /
      else if (!adminMode && location.pathname !== '/') {
        window.location.href = '/'; // Redirect to home
      }
    };

    handleAdminModeToggle();
  }, [adminMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-y-hidden bg-[#0a0a0d]">
      {/* Top Navigation (Header) */}
      {!hideNavbar && (
        <nav className="bg-[#0a0a0d] text-white px-6 py-4 shadow-md relative border-b border-gray-600">
          <div className="max-w-8xl mx-auto flex justify-between items-center px-10 relative">
            {/* Left Title */}
            <h1 className="text-2xl font-bold z-10">
              <span className="text-white">Twitch</span>{" "}
              <span className="text-[#9146FF]">Insights</span>
            </h1>

            {/* Centered Links */}
            {!adminMode && (
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center">
                <Link to="/" className="text-lg hover:text-[#888888] transition">HOME</Link>

                {user && (
                  <>
                    <Link to="/analyze" className="text-lg hover:text-[#888888] transition">ANALYZE</Link>
                    <Link to="/history" className="text-lg hover:text-[#888888] transition">HISTORY</Link>
                  </>
                )}

                <Link to="/about" className="text-lg hover:text-[#888888] transition">ABOUT US</Link>

              </div>
            )}

            {/* Right Profile or Sign In/Sign Up */}
            <div className="relative flex items-center z-10">
              {user ? (
                <>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="text-white focus:outline-none cursor-pointer"
                  >
                    <FaUserCircle size={36} />
                  </button>
                  {profileOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-48 w-56 bg-[#252529] text-white rounded-md shadow-lg z-1000"
                    >
                      <div className="px-4 py-3 border-b border-gray-600">
                        <p className="text-sm font-semibold">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-gray-400">{user?.username}</p>
                      </div>
                      <ul className="py-1 text-sm">
                        {/* Admin Mode Toggle */}
                        {is_admin && (
                          <li className="flex items-center justify-between px-4 py-2">
                            <span>Admin Mode</span>
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={adminMode}
                                onChange={(e) => setAdminMode(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-[#9146FF] relative">
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full"></div>
                              </div>
                            </label>
                          </li>
                        )}
                        <li>
                          <Link
                            to="/settings"
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 hover:bg-gray-700"
                          >
                            Settings
                          </Link>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              localStorage.clear();
                              window.location.href = "/auth"; // Use window.location.href for sign-out
                            }}
                            className="w-full block text-left px-4 py-2 hover:bg-gray-700 text-red-400"
                          >
                            Sign Out
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/auth"
                  className="text-lg transition cursor-pointer"
                  style={{
                    color: "#9146FF",
                    textShadow: "0 0 5px #6441A5",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#FFFFFF")}
                  onMouseLeave={(e) => (e.target.style.color = "#9146FF")}
                >
                  Sign In / Sign Up
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content (2 Rows: Navigation on left, content on the right) */}
      
        

        {/* Right Content Area */}
        
          {adminMode ? (
            <div className="flex">
                {/* Left Sidebar - Fixed height, shown when Admin Mode is ON */}
        {adminMode && (
          <div className="w-64 bg-[#252529] text-white py-4" style={{ height: `calc(100vh - 72px)` }}>
            <ul className="space-y-4 px-6">
              <li>
                <Link to="/dashboard" className="block text-lg hover:bg-gray-700 p-2 rounded-md">Dashboard</Link>
              </li>
              <li>
                <Link to="/all_history" className="block text-lg hover:bg-gray-700 p-2 rounded-md">All History</Link>
              </li>
              {is_admin && (
                <>
                  <li>
                    <Link to="/users" className="block text-lg hover:bg-gray-700 p-2 rounded-md">Users</Link>
                  </li>
                  <li>
                    <Link to="/logs" className="block text-lg hover:bg-gray-700 p-2 rounded-md">Logs</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
            <div className="flex-1 p-4" style={{ height: `calc(100vh - 72px)`}}>
            <div className="admin-content">
              <Routes>
                <Route path="/users" element={<Users />} />
                <Route path="/users/:id" element={<UsersDetail />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/all_history" element={<History />} />
                <Route path="/history/:id" element={<HistoryDetail />} />
              </Routes>
            </div>
            </div>
            </div>
          ) : (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/analyze" element={<SentimentStream />} />
                <Route path="/history" element={<History />} />
                <Route path="/history/:id" element={<HistoryDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/auth" element={<LoginSignup />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
          )}
      
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
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
