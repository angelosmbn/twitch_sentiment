import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import SentimentStream from './components/sentiment/sentiment.jsx';
import History from './components/history/history';
import HistoryDetail from './components/history/history_detailed';
import LoginSignup from "./components/auth/LoginSignup";
import "./index.css";
import "./App.css";

function Home() {
  return (
    <div className="p-10 text-center text-xl font-semibold">
      Welcome to Twitch Insights. Use the navigation to explore sentiment analysis.
    </div>
  );
}

function About() {
  return (
    <div className="p-10 text-center text-xl font-semibold">
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
    <div className="min-h-screen bg-gray-100 overflow-y-hidden">
      {/* Navigation */}
      {!hideNavbar && (
        <nav className="bg-blue-600 text-white px-6 py-4 shadow-md relative">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* Left: Brand */}
            <h1 className="text-xl font-bold">Twitch Insights</h1>

            {/* Center: Links */}
            <div className="flex gap-6 items-center">
              <Link to="/" className="text-sm underline hover:text-gray-200 transition">HOME</Link>
              <Link to="/analyze" className="text-sm underline hover:text-gray-200 transition">ANALYZE</Link>
              <Link to="/history" className="text-sm underline hover:text-gray-200 transition">HISTORY</Link>
              <Link to="/about" className="text-sm underline hover:text-gray-200 transition">ABOUT US</Link>
            </div>

            {/* Right: Profile Dropdown */}
            <div className="relative flex items-center">
              <button onClick={() => setProfileOpen(!profileOpen)} className="text-white focus:outline-none">
                <FaUserCircle size={36} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-48 w-48 bg-white text-black rounded-md shadow-lg z-1000">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-500">{user?.username}</p>
                  </div>
                  <ul className="py-1 text-sm">
                    <li>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Settings</button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          localStorage.removeItem("user");
                          window.location.href = "/auth";
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
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

      {/* Route-based Content */}
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
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
