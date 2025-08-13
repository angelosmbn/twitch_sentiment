import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from 'react';
import { FaBars } from 'react-icons/fa';
import SentimentStream from './components/sentiment/sentiment.jsx';
import History from './components/history/history';
import HistoryDetail from './components/history/history_detailed';
import LoginSignup from "./components/auth/LoginSignup";
import ForgotPassword from "./components/auth/forgot_password";
import Settings from "./components/settings/settings";
import Users from "./components/users/users";
import UsersDetail from "./components/users/users_detailed";
import Logs from "./components/logs/logs";
import Dashboard from "./components/dashboard/dashboard";
import Home from "./components/home/home";
import About from "./components/about/about";
import Contact from "./components/contact/contact";
import ResetPassword from "./components/auth/reset_password";
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

function AppLayout() {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(() => {
    const savedAdminMode = localStorage.getItem('adminMode');
    return savedAdminMode === 'true';
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const is_admin = user?.role === "admin";
  const dropdownRef = useRef(null);
  const [streamStarted, setStreamStarted] = useState(false);

  useEffect(() => {
    let timeoutId;
  
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
  
      if (!streamStarted && user) {
        timeoutId = setTimeout(() => {
          // Auto logout
          localStorage.clear();
          window.location.href = "/auth";
        }, 15 * 60 * 1000); // 15 minutes
      }
    };
  
    const activityEvents = ["mousemove", "keydown", "click", "touchstart"];
  
    activityEvents.forEach((event) =>
      window.addEventListener(event, resetTimer)
    );
  
    resetTimer(); // start timer on mount
  
    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [streamStarted, user]);
  

  useEffect(() => {
    localStorage.setItem('adminMode', adminMode);
  }, [adminMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest("#profile-dropdown-btn")
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  // Responsive: close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setSidebarOpen(false);
  }, [location.pathname, adminMode]);

  // Improved navigation links with highlighting and better font
  const navItems = [
    { to: "/", label: "HOME", match: (path) => path === "/" },
    { to: "/analyze", label: "ANALYZE", match: (path) => path.startsWith("/analyze") },
    { to: "/history", label: "HISTORY", match: (path) => path.startsWith("/history") && !path.startsWith("/history/") },
    { to: "/contact", label: "CONTACT US", match: (path) => path.startsWith("/contact") },
    { to: "/about", label: "ABOUT US", match: (path) => path.startsWith("/about") },
  ];

  // Only show HISTORY if user is logged in
  const filteredNavItems = user
    ? navItems
    : navItems.filter(item => item.label !== "HISTORY");

  // Desktop nav links
  const navLinks = (
    <nav className="flex gap-2 lg:gap-4 xl:gap-6 items-center font-sans select-none">
      {filteredNavItems.map((item) => {
        const isActive = item.match(location.pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`relative px-4 py-1.5 rounded-lg text-base xl:text-lg font-extrabold tracking-wide transition-all duration-200
              font-[Poppins,Inter,sans-serif]
              ${isActive
                ? "text-[#9146FF]"
                : "text-white hover:text-[#9146FF]"}
              `}
            style={{
              letterSpacing: "0.04em",
              fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif",
              transition: "all 0.18s cubic-bezier(.4,0,.2,1)",
            }}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  // For mobile and medium nav: add sign in/up if not logged in
  const mobileNavLinks = (
    <>
      <div className="flex flex-col gap-1 font-sans">
        {filteredNavItems.map((item) => {
          const isActive = item.match(location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative px-4 py-2 rounded-lg text-lg font-bold tracking-wide transition-all duration-200
                font-[Poppins,Inter,sans-serif]
                ${isActive
                  ? "text-[#9146FF] bg-[#23232a]"
                  : "text-white hover:text-[#9146FF] hover:bg-[#23232a]"}
                `}
              style={{
                fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif",
                border: isActive ? "2px solid #9146FF" : "2px solid transparent",
              }}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {!user && (
        <Link
          to="/auth"
          className="text-lg font-bold tracking-wide hover:text-[#9146FF] transition font-[Poppins,Inter,sans-serif] mt-2 px-4 py-2 rounded-lg bg-[#9146FF] text-white shadow-md"
          style={{
            fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: "0.04em",
          }}
          onClick={() => setMobileNavOpen(false)}
        >
          Sign In / Sign Up
        </Link>
      )}
    </>
  );

  // Improved admin sidebar links with better font and highlighting
  const adminSidebarItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      match: (path) => path === "/dashboard"
    },
    {
      to: "/all_history",
      label: "All History",
      match: (path) => path === "/all_history"
    },
    ...(is_admin
      ? [
          {
            to: "/users",
            label: "Users",
            match: (path) => path === "/users" || path.startsWith("/users/")
          },
          {
            to: "/logs",
            label: "Logs",
            match: (path) => path === "/logs"
          }
        ]
      : [])
  ];

  const adminSidebarLinks = (
    <ul className="space-y-2">
      {adminSidebarItems.map((item) => {
        const isActive = item.match(location.pathname);
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              className={`
                block text-lg font-semibold px-6 py-3 rounded-xl transition-all duration-200
                font-[Poppins,Inter,sans-serif]
                tracking-wide
                ${isActive
                  ? "bg-[#23232a] text-[#9146FF] shadow-md border-l-4 border-[#9146FF]"
                  : "text-white hover:text-[#9146FF] hover:bg-[#23232a]"}
              `}
              style={{
                fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif",
                letterSpacing: "0.04em",
                borderLeft: isActive ? "4px solid #9146FF" : "4px solid transparent",
                boxShadow: isActive ? "0 2px 12px 0 rgba(145,70,255,0.10)" : undefined,
                transition: "all 0.18s cubic-bezier(.4,0,.2,1)",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded bg-[#9146FF] opacity-80"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "6px",
                    height: "60%",
                    borderRadius: "6px",
                    background: "#9146FF",
                    opacity: 0.8,
                  }}
                ></span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  
  return (
    <div className="min-h-screen bg-[#0a0a0d] overflow-y-auto">
      {/* Top Navigation (Header) */}
      <nav className="bg-[#0a0a0d] text-white px-4 md:px-6 py-4 shadow-md relative border-b border-gray-600 font-sans">
        <div className="max-w-8xl mx-auto flex items-center px-2 md:px-10 relative">
          {/* Left Title (hide on small and medium screens) */}
          <Link
            to="/"
            className="select-none cursor-pointer text-2xl md:text-3xl font-extrabold z-10 flex-shrink-0 hidden lg:block font-[Poppins,Inter,sans-serif] tracking-tight"
            style={{ userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none" }}
            tabIndex={0}
            aria-label="Go to Home"
          >
            <span className="text-white">Twitch</span>{" "}
            <span className="text-[#9146FF]">Insights</span>
          </Link>

          {/* Centered Links (Desktop only, hide on md and below) */}
          {!adminMode && (
            <div className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 items-center">
              {navLinks}
            </div>
          )}

          {/* Spacer to push right icon to the end */}
          <div className="flex-1"></div>

          {/* Hamburger for mobile and medium (always rightmost) */}
          {!adminMode && (
            <button
              className="lg:hidden ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#9146FF]"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen((prev) => !prev)}
            >
              <FaBars size={24} />
            </button>
          )}

          {/* Right Profile or Sign In/Sign Up (show only on large screens) */}
          <div className="relative flex items-center z-10">
            {user ? (
              <div className="relative flex items-center">
                <button
                  id="profile-dropdown-btn"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="focus:outline-none cursor-pointer relative"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                >
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt="Profile"
                      className={`w-9 h-9 rounded-full object-cover transition-shadow duration-200 ${profileOpen ? "ring-4 ring-[#9146FF]/30 shadow-lg" : ""}`}
                      style={{ minWidth: "2.25rem", minHeight: "2.25rem", userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none" }}
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center bg-[#9146FF] text-white font-bold text-xl transition-shadow duration-200 ${profileOpen ? "ring-4 ring-[#9146FF]/30 shadow-lg" : ""}`}
                      style={{ minWidth: "2.25rem", minHeight: "2.25rem", userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none" }}
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </button>
                {/* Dropdown */}
                <div
                  ref={dropdownRef}
                  className={`absolute right-0 mt-2 w-72 bg-[#18181b] text-white rounded-2xl shadow-2xl z-50 transition-all duration-200 origin-top-right
                    ${profileOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
                  `}
                  style={{
                    top: "calc(100% + 0.5rem)",
                    minWidth: "18rem",
                    border: "1px solid #23232a",
                    boxShadow: "0 8px 32px 0 rgba(145,70,255,0.25), 0 1.5px 4px 0 rgba(0,0,0,0.15)"
                  }}
                >
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[#23232a] rounded-t-2xl bg-[#23232a]">
                    {user?.profile_image ? (
                      <img
                        src={user.profile_image}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover shadow-md"
                        style={{ userSelect: "none" }}
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#9146FF] text-white font-bold text-2xl shadow-md"
                        style={{ userSelect: "none" }}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold leading-tight">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{user?.username}</p>
                    </div>
                  </div>
                  <ul className="py-2 text-base">
                    {/* Admin Mode Toggle */}
                    {is_admin && (
                      <li className="flex items-center justify-between px-5 py-3 hover:bg-[#23232a] transition rounded-xl">
                        <span className="font-medium">Admin Mode</span>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adminMode}
                            onChange={(e) => {
                              setAdminMode(e.target.checked);
                              if (e.target.checked) {
                                window.location.href = "/dashboard";
                              } else {
                                window.location.href = "/";
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-[#9146FF] relative transition-colors duration-200">
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full"></div>
                          </div>
                        </label>
                      </li>
                    )}
                    {!adminMode && (
                      <li>
                        <Link
                          to="/settings"
                          onClick={() => setProfileOpen(false)}
                          className="block px-5 py-3 hover:bg-[#23232a] rounded-xl transition font-medium"
                        >
                          Settings
                        </Link>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={async () => {
                          try {
                            const userId = user?._id || user?.userId || user?.id;
                            if (userId) {
                              await fetch("http://localhost:8080/api/log/sign_out", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ userId }),
                              });
                            }
                          } catch (e) {
                            // Optionally handle error
                          } finally {
                            localStorage.clear();
                            window.location.href = "/auth";
                          }
                        }}
                        className="w-full block text-left px-5 py-3 hover:bg-[#23232a] text-red-400 rounded-xl transition font-medium"
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex gap-2">
                <Link
                  to="/auth?mode=login"
                  style={{ textDecoration: "none" }}
                >
                  <button
                    type="button"
                    className="text-lg tracking-wide font-bold px-4 py-1.5 rounded-lg border border-white transition font-[Poppins,Inter,sans-serif] bg-transparent"
                    style={{
                      color: "#FFFFFF",
                      background: "transparent",
                      fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif",
                      letterSpacing: "0.04em",
                      boxShadow: "none",
                      borderColor: "#FFFFFF",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      e.target.style.color = "#9146FF";
                      e.target.style.borderColor = "#9146FF";
                    }}
                    onMouseLeave={e => {
                      e.target.style.color = "#FFFFFF";
                      e.target.style.borderColor = "#FFFFFF";
                    }}
                  >
                    Sign In
                  </button>
                </Link>
                <Link to="/auth?mode=signup" style={{ textDecoration: "none" }}>
                  <button
                    type="button"
                    className="text-lg tracking-wide font-bold px-4 py-1.5 rounded-lg transition font-[Poppins,Inter,sans-serif]"
                    style={{
                      background: "#9146FF",
                      color: "#FFFFFF",
                      border: "none",
                      fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif",
                      letterSpacing: "0.04em",
                      boxShadow: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = "#7c3aed";
                      e.target.style.color = "#fff";
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = "#9146FF";
                      e.target.style.color = "#fff";
                    }}
                  >
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile & Medium Navigation Drawer */}
        {!adminMode && (
          <div
            className={`fixed inset-0 z-40 bg-black bg-opacity-40 transition-opacity duration-200 lg:hidden ${mobileNavOpen ? "block" : "hidden"}`}
            onClick={() => setMobileNavOpen(false)}
          >
            <div
              className={`fixed top-0 left-0 h-full w-64 bg-[#18181b] shadow-lg z-50 transform transition-transform duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <span className="text-xl font-bold text-white">Menu</span>
                <button
                  className="text-white text-2xl focus:outline-none"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close menu"
                >
                  &times;
                </button>
              </div>
              <div className="flex flex-col gap-2 px-6 py-4 overflow-y-auto" style={{maxHeight: "calc(100vh - 64px)"}}>
                {mobileNavLinks}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      {adminMode ? (
        <div className="flex flex-col md:flex-row h-[calc(100vh-72px)]" style={{ overflowY: "hidden" }}>
          {/* Sidebar for admin - responsive */}
          <div>
            {/* Hamburger for sidebar on small screens */}
            <button
              className="md:hidden m-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#9146FF] bg-[#18181b] text-white"
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <FaBars size={22} />
            </button>
            {/* Sidebar Drawer (mobile) */}
            <div
              className={`fixed inset-0 z-40 bg-black bg-opacity-40 transition-opacity duration-200 md:hidden ${sidebarOpen ? "block" : "hidden"}`}
              onClick={() => setSidebarOpen(false)}
            >
              <div
                className={`fixed top-0 left-0 h-full w-64 bg-[#18181b] shadow-lg z-50 transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                  <span className="text-xl font-bold text-white font-[Poppins,Inter,sans-serif] tracking-wide">Admin</span>
                  <button
                    className="text-white text-2xl focus:outline-none"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                  >
                    &times;
                  </button>
                </div>
                <nav className="py-4">{adminSidebarLinks}</nav>
              </div>
            </div>
            {/* Sidebar (desktop) */}
            <div className="hidden md:block w-56 lg:w-64 bg-[#18181b] text-white py-8 font-[Poppins,Inter,sans-serif] h-full min-h-[calc(100vh-72px)]">
              <div className="mb-8 px-6">
                <span className="text-2xl font-extrabold tracking-tight text-[#9146FF] font-[Poppins,Inter,sans-serif]">Admin</span>
              </div>
              {adminSidebarLinks}
            </div>
          </div>
          {/* Main admin content */}
          <div className="flex-1 p-2 md:p-4" style={{ minHeight: 0 }}>
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
        <div className="flex flex-col min-h-[calc(100vh-72px)]">
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/analyze"
                element={
                  <SentimentStream
                    streamStarted={streamStarted}
                    setStreamStarted={setStreamStarted}
                  />
                }
              />
              <Route path="/history" element={<History />} />
              <Route path="/history/:id" element={<HistoryDetail />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<LoginSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      )}

      {/* Responsive styles for custom breakpoints */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');
        @media (max-width: 640px) {
          .admin-content {
            padding: 0.5rem !important;
          }
        }
        @media (min-width: 641px) and (max-width: 1023px) {
          .admin-content {
            padding: 1rem !important;
            overflow-y: auto !important;
            max-height: calc(100vh - 72px) !important;
          }
          /* Hide header title and right profile/signin on md (medium) screens */
          nav h1,
          nav .relative.flex.items-center.z-10 {
            display: none !important;
          }
        }
        @media (min-width: 1024px) {
          .admin-content {
            padding: 1.5rem !important;
          }
        }
        /* Ensure scrolling for main content on small and medium screens */
        @media (max-width: 1023px) {
          html, body, #root, .min-h-screen, .flex-1, .admin-content {
            overflow-y: auto !important;
          }
        }
        /* Admin sidebar font and highlight improvements */
        .font-[Poppins\\,Inter\\,sans-serif] {
          font-family: 'Poppins', 'Inter', 'Segoe UI', 'Arial', sans-serif !important;
        }
      `}</style>
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
