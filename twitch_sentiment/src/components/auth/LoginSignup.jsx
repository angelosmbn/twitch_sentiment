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
  });
  const [invalidFields, setInvalidFields] = useState([]);
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setInvalidFields([]);
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInvalidFields([]);

    if (!formData.username || !formData.password || (!isLogin && (!formData.first_name || !formData.last_name || !formData.confirm_password))) {
      setErrorMsg("All fields are required.");
      return;
    }

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
          };

      const res = await fetch(`http://localhost:8080/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
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
    `w-full px-4 py-3 border rounded-md ${
      invalidFields.includes(field)
        ? "border-red-500"
        : "border-gray-300 focus:ring-blue-400"
    }`;

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600 justify-center items-center px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl flex overflow-hidden">
        {/* Left Panel */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-indigo-600 to-blue-600 text-white p-10 flex-col justify-center items-center">
          <h2 className="text-3xl font-bold mb-4">
            {isLogin ? "Welcome Back!" : "Join Us"}
          </h2>
          <p className="text-center text-sm">
            {isLogin
              ? "Sign in to continue analyzing Twitch insights."
              : "Create an account and start analyzing Twitch sentiment data."}
          </p>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 bg-white">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
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
              <div className="text-sm text-red-600 font-medium">{errorMsg}</div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium transition"
            >
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setErrorMsg("");
                setInvalidFields([]);
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginSignup;
