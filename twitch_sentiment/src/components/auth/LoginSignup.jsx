import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginSignup() {
  const [mode, setMode] = useState("login");
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirm_password: "",
    email: "",
  });
  const [invalidFields, setInvalidFields] = useState([]);
  const isLogin = mode === "login";
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setInvalidFields([]);
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInvalidFields([]);
  
    // Check if all fields are filled
    if (!formData.username || !formData.password || 
        (!isLogin && (!formData.first_name || !formData.last_name || !formData.email || !formData.confirm_password))) {
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
            username: formData.username,
            password: formData.password,
          }
        : {
            first_name: formData.first_name,
            last_name: formData.last_name,
            username: formData.username,
            password: formData.password,
            email: formData.email,  // Add email for sign-up
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
            username: "",
            password: "",
            confirm_password: "",
            email: "",
          });
        }
      } else {
        setErrorMsg(data.error || "Failed.");
        setInvalidFields(["username", "password"]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Server error. Please try again.");
    }
  };
  

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-md bg-[#12121f] text-white placeholder-[#9186c6] border ${
      invalidFields.includes(field)
        ? "border-red-700"
        : "border-[#9146FF] focus:ring-2 focus:ring-[#9146FF]"
    } font-sans transition`;

  return (
    <div className="flex min-h-screen bg-[#0a0a0d] justify-center items-center px-4 font-sans">
      <div className="rounded-xl shadow-lg w-full max-w-4xl flex overflow-hidden bg-[#141421]">
        {/* Left Panel */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-[#9146FF] to-[#4e2bb7] text-white p-10 flex-col justify-center items-center">
          <h2 className="text-3xl font-bold mb-4">
            {isLogin ? "Welcome Back!" : "Join Us"}
          </h2>
          <p className="text-center text-sm opacity-80">
            {isLogin
              ? "Sign in to continue analyzing Twitch insights."
              : "Create an account and start analyzing Twitch sentiment data."}
          </p>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 bg-[#0f0f1c] rounded-r-xl">
          <h2 className="text-2xl font-bold text-white mb-6">
            {isLogin ? "Login to Your Account" : "Create Your Account"}
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={inputClass("first_name")}
                />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={inputClass("last_name")}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass("email")}
                />
              </>
            )}
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className={inputClass("username")}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={inputClass("password")}
            />
            {!isLogin && (
              <input
                type="password"
                name="confirm_password"
                placeholder="Confirm Password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={inputClass("confirm_password")}
              />
            )}

            {errorMsg && (
              <div className="text-sm text-red-700 font-medium">{errorMsg}</div>
            )}

            <button
              type="submit"
              className="w-full bg-[#9146FF] hover:bg-[#6e34cc] text-white py-3 rounded-md font-semibold transition-shadow shadow-sm hover:shadow-lg cursor-pointer"
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
              <button
                onClick={() => {
                  // Logic for handling forgot password can be added here
                  console.log("Forgot Password clicked");
                }}
                className="text-[#9146FF] hover:underline font-medium cursor-pointer"
              >
                Forgot Password?
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginSignup;
