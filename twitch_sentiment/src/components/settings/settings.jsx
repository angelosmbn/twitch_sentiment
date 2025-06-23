import { useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Settings() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  // Initialize states with the existing user data
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State to handle errors
  const [errorMsg, setErrorMsg] = useState('');

  const [profileImage, setProfileImage] = useState(user?.first_name.charAt(0).toUpperCase());

  // Handle the save functionality
  const handleSave = async () => {
    setErrorMsg(''); // Reset any previous error messages

    // Check if there are changes in the personal information
    const isInfoChanged = firstName !== user.first_name || lastName !== user.last_name || username !== user.username || email !== user.email;

    // If no personal information has changed, show a message and skip the request
    if (!isInfoChanged && !isChangingPassword) {
      setErrorMsg('No changes to personal information.');
      return;
    }

    // Check if the passwords match if changing the password
    if (password !== confirmPassword && isChangingPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    // Check if the old password is correct
    if (isChangingPassword) {
      try {
        const passwordCheckData = {
          user_id: user.id,
          old_password: oldPassword
        };

        // Make the API call to check if the old password matches
        const passwordCheckResponse = await fetch('http://localhost:8080/api/user/check-old-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(passwordCheckData),
        });

        const passwordCheckResult = await passwordCheckResponse.json();

        // If the old password doesn't match
        if (!passwordCheckResponse.ok) {
          setErrorMsg(passwordCheckResult.error || "Old password doesn't match.");
          return;
        }

        // Proceed with changing the password
        const passwordData = {
          user_id: user.id,
          old_password: oldPassword,
          new_password: password,
          confirm_password: confirmPassword,
        };

        const passwordResponse = await fetch('http://localhost:8080/api/user/change-password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(passwordData),
        });

        if (!passwordResponse.ok) {
          throw new Error('Failed to change password');
        }

        Swal.fire("Success", "Password updated successfully.", "success").then(() => {
          setOldPassword('');
          setPassword('');
          setConfirmPassword('');
        });
      } catch (error) {
        setErrorMsg(error.message);  // Show the error message above the fields
      }
    }

    // Proceed with saving user info if personal information has changed
    if (!isChangingPassword) {
      try {
        const updatedUser = {
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          username: username,
        };

        
          const response = await fetch('http://localhost:8080/api/user/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser),
          });
        

        if (!response.ok) {
          throw new Error('Failed to update user info');
        }

        // Update localStorage with new info
        const updatedUserData = { ...user, first_name: firstName, last_name: lastName, email: email, username: username };
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        Swal.fire("Success", "User info updated successfully.", "success");
      } catch (error) {
        setErrorMsg(error.message);
      }
    }
    setIsEditing(false);
    setIsChangingPassword(false);
  };

  // Handle cancel editing
  const handleCancel = () => {
    setFirstName(user?.first_name);
    setLastName(user?.last_name);
    setUsername(user?.username);
    setEmail(user?.email);
    setIsEditing(false);
    setIsChangingPassword(false);
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
  };

  // Handle change password
  const handleChangePassword = () => {
    setIsChangingPassword(true);
  };

  // Handle cancel password change
  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
  };

  return (
    <div className="bg-[#1f1f23] max-h-[calc(100vh-95px)] max-w-5xl mx-auto mt-3 overflow-y-auto">
      <div className="flex justify-center items-center min-h-[10vh]">
        <div className="w-full max-w-3xl p-10 text-white">
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
            {!isChangingPassword && (
              <>
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    readOnly={!isEditing}
                  />
                </div>
              </>
            )}

            {isChangingPassword && (
              <>
                <div>
                  <label htmlFor="oldPassword" className="block text-sm font-semibold">Old Password</label>
                  <input
                    type="password"
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                  />
                </div>
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
              </>
            )}

            {/* Show error message if any validation errors */}
            {errorMsg && (
              <div className="text-sm text-red-700 font-medium mb-4">{errorMsg}</div>
            )}

            <div className="text-center mt-4 space-x-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5] transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 text-lg bg-gray-600 text-white rounded-md hover:bg-gray-500 transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <div className="space-x-4">
                  {!isChangingPassword && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5] transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleChangePassword}
                        className="px-6 py-3 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5] transition"
                      >
                        Change Password
                      </button>
                    </>
                  )}
                </div>
              )}
              {isChangingPassword && (
                <button
                  onClick={handleSave}
                  className="px-6 py-3 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5] transition"
                >
                  Save Changes
                </button>
              )}
              {isChangingPassword && (
                <button
                  onClick={handleCancelPasswordChange}
                  className="px-6 py-3 text-lg bg-gray-600 text-white rounded-md hover:bg-gray-500 transition"
                >
                  Cancel Password Change
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
