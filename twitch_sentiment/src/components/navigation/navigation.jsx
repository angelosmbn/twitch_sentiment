import { useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Settings() {
  // Fetch user from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  // Set initial form values from user info
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState(user?.first_name.charAt(0).toUpperCase()); // Profile image as the first letter

  // Handle form submission to update user info
  const handleSave = async () => {
    if (password !== confirmPassword) {
      Swal.fire("Error", "Passwords do not match", "error");
      return;
    }

    // Prepare updated user data
    const updatedUser = {
      first_name: firstName,
      last_name: lastName,
      username: username,
      email: email,
      password: password || user?.password,  // If no new password, keep the old one
    };

    // Update user info in localStorage
    localStorage.setItem("user", JSON.stringify(updatedUser));

    Swal.fire("Success", "Your settings have been updated.", "success");
  };

  return (
    <div className="p-10 text-white bg-[#0a0a0d]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Settings</h2>
          <p className="text-lg text-gray-400 mt-2">Manage your account settings and preferences.</p>
        </div>

        {/* Profile Image */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[#9146FF] text-white text-3xl">
            {profileImage || <FaUserCircle size={50} />}
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold">First Name</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold">Last Name</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
            />
          </div>

          {/* Save Button */}
          <div className="text-center">
            <button
              onClick={handleSave}
              className="px-6 py-3 mt-4 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5] transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
