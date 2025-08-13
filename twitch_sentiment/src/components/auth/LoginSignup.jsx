import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function LoginSignup() {
  // Always check the URL for mode changes
  const location = useLocation();
  const getModeFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    const urlMode = searchParams.get("mode");
    return urlMode === "signup" ? "signup" : "login";
  };

  const [mode, setMode] = useState(getModeFromUrl());

  useEffect(() => {
    setMode(getModeFromUrl());
    // eslint-disable-next-line
  }, [location.search]);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    password: "",
    confirm_password: "",
    email: "",
  });
  const [invalidFields, setInvalidFields] = useState([]);
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm_password: false,
  });
  const isLogin = mode === "login";
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setInvalidFields([]);
    setErrorMsg("");
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInvalidFields([]);
  
    // Check if all fields are filled
    if (
      !formData.password ||
      !formData.email ||
      (!isLogin && (!formData.first_name || !formData.last_name || !formData.confirm_password))
    ) {
      setErrorMsg("All fields are required.");
      return;
    }
  
    // Check if passwords match in sign up
    if (!isLogin && formData.password !== formData.confirm_password) {
      setErrorMsg("Passwords do not match.");
      setInvalidFields(["password", "confirm_password"]);
      return;
    }
  
    try {
      const endpoint = isLogin ? "login" : "signup";
      const body = isLogin
        ? {
            email: formData.email,
            password: formData.password,
          }
        : {
            first_name: formData.first_name,
            last_name: formData.last_name,
            password: formData.password,
            email: formData.email,
          };
      
      const res = await fetch(`http://localhost:8080/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        if (isLogin) {
          console.log(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          navigate("/");
        } else {
          alert("Account created successfully!");
          setMode("login");
          setFormData({
            first_name: "",
            last_name: "",
            password: "",
            confirm_password: "",
            email: "",
          });
        }
      } else {
        setErrorMsg(data.error || "Failed.");
        setInvalidFields(isLogin ? ["email", "password"] : ["email", "password"]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Server error. Please try again.");
    }
  };
  

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-md bg-[#12121f] text-white border ${
      invalidFields.includes(field)
        ? "border-red-700"
        : "border-[#9146FF] focus:ring-2 focus:ring-[#9146FF]"
    } font-sans transition`;

  return (
    <div className="flex justify-center items-center px-4 font-sans" style={{ minHeight: "calc(100vh - 100px)" }}>
      <div className="rounded-xl shadow-lg w-full max-w-md flex overflow-hidden border border-white">
        {/* Main Panel (no left panel) */}
        <div className="w-full p-8 sm:p-12 rounded-xl flex flex-col items-center">
          {/* Welcome/Join Us message above the form */}
          <h2 className="text-3xl font-bold mb-2 text-white text-center">
            {isLogin ? "Welcome Back!" : "Join Us"}
          </h2>
          <p className="text-center text-sm opacity-80 mb-6 text-white">
            {isLogin
              ? "Sign in to continue analyzing Twitch insights."
              : "Create an account and start analyzing Twitch sentiment data."}
          </p>

          <form className="space-y-4 w-full" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex flex-col w-full">
                    <label
                      htmlFor="first_name"
                      className="text-base text-white mb-1 ml-1 font-semibold"
                    >
                      First Name
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-md bg-[#252529] text-white border ${
                        invalidFields.includes("first_name")
                          ? "border-red-700"
                          : "border-white focus:ring-2 focus:ring-white"
                      } font-sans transition`}
                    />
                  </div>
                  <div className="flex flex-col w-full">
                    <label
                      htmlFor="last_name"
                      className="text-base text-white mb-1 ml-1 font-semibold"
                    >
                      Last Name
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-md bg-[#252529] text-white border ${
                        invalidFields.includes("last_name")
                          ? "border-red-700"
                          : "border-white focus:ring-2 focus:ring-white"
                      } font-sans transition`}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex flex-col w-full">
              <label
                htmlFor="email"
                className="text-base text-white mb-1 ml-1 font-semibold"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-md bg-[#252529] text-white border ${
                  invalidFields.includes("email")
                    ? "border-red-700"
                    : "border-white focus:ring-2 focus:ring-white"
                } font-sans transition`}
              />
            </div>
            {/* Password field with show/hide */}
            <div className="flex flex-col w-full">
              <label
                htmlFor="password"
                className="text-base text-white mb-1 ml-1 font-semibold"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword.password ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-md bg-[#252529] text-white border ${
                    invalidFields.includes("password")
                      ? "border-red-700"
                      : "border-white focus:ring-2 focus:ring-white"
                  } font-sans transition`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("password")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white"
                  tabIndex={-1}
                >
                  {showPassword.password ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
            {!isLogin && (
              <div className="flex flex-col w-full">
                <label
                  htmlFor="confirm_password"
                  className="text-base text-white mb-1 ml-1 font-semibold"
                >
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="confirm_password"
                    type={showPassword.confirm_password ? "text" : "password"}
                    name="confirm_password"
                    placeholder="Confirm Password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-md bg-[#252529] text-white border ${
                      invalidFields.includes("confirm_password")
                        ? "border-red-700"
                        : "border-white focus:ring-2 focus:ring-white"
                    } font-sans transition`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm_password")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white"
                    tabIndex={-1}
                  >
                    {showPassword.confirm_password ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="text-sm text-red-700 font-medium">{errorMsg}</div>
            )}

            <button
              type="submit"
              className="w-full bg-[#9146FF] hover:bg-[#772ce8] text-white py-3 rounded-md font-semibold transition-shadow shadow-sm hover:shadow-lg cursor-pointer"
            >
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          <p className="text-sm text-gray-400 mt-6 text-center">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setErrorMsg("");
                setInvalidFields([]);
              }}
              className="text-[#9146FF] hover:underline font-medium cursor-pointer"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
          {isLogin && (
            <p className="text-sm text-gray-400 mt-2 text-center">
              <Link
                to="/forgot-password"
                className="text-[#9146FF] hover:underline font-medium cursor-pointer"
              >
                Forgot Password?
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginSignup;
