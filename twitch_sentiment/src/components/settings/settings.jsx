import { useState, useRef, useEffect } from 'react';
import { FaUserCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaCamera } from 'react-icons/fa';

function Settings() {
  // Use a state for user to allow updates to profile_image
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileImageFile, setProfileImageFile] = useState(null);

  // Add showPassword states to toggle visibility
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
    deletePassword: false,
  });

  const fileInputRef = useRef(null);

  // Fetch the latest profile image from backend on mount
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user?.profile_image && user?.id) {
        try {
          const response = await fetch(`http://localhost:8080/api/user/profile-image/${user.id}`);
          if (response.ok) {
            const blob = await response.blob();
            if (blob.type.startsWith('image/')) {
              const imageUrl = URL.createObjectURL(blob);
              setProfileImage(imageUrl);
              const updatedUser = { ...user, profile_image: imageUrl };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          }
        } catch (err) {
          // Optionally handle error
        }
      } else if (user?.profile_image) {
        setProfileImage(user.profile_image);
      }
    };
    fetchProfileImage();
    // eslint-disable-next-line
  }, [user?.id, user?.profile_image]);

  // Helper to get the display for the profile image (circle)
  const getProfileImageDisplay = () => {
    if (profileImage) {
      return (
        <img
          src={profileImage}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover"
        />
      );
    } else if (user?.first_name) {
      return (
        <span>
          {user.first_name.charAt(0).toUpperCase()}
        </span>
      );
    } else {
      return <FaUserCircle size={50} />;
    }
  };

  // Handle profile image click (open file dialog)
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  // Handle file input change
  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const previewUrl = event.target.result;

      const result = await Swal.fire({
        title: 'Change Profile Picture',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <img src="${previewUrl}" alt="Preview" style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;" />
            <p>Do you want to save this as your new profile picture?</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        focusConfirm: false,
        customClass: {
          popup: 'swal2-profile-image-popup'
        }
      });

      if (result.isConfirmed) {
        try {
          const formData = new FormData();
          formData.append('user_id', user.id);
          formData.append('profile_image', file);

          const response = await fetch('http://localhost:8080/api/user/upload-profile-image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload profile image');
          }

          const data = await response.json();
          // The backend returns a direct URL to the image
          setProfileImage(data.profile_image);

          // Update user in state and localStorage
          const updatedUser = { ...user, profile_image: data.profile_image };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));

          Swal.fire("Success", "Profile picture updated!", "success");
        } catch (error) {
          Swal.fire("Error", error.message, "error");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setErrorMsg('');
    const isInfoChanged = firstName !== user.first_name || lastName !== user.last_name || username !== user.username || email !== user.email;

    if (!isInfoChanged && !isChangingPassword) {
      setErrorMsg('No changes to personal information.');
      return;
    }

    if (password !== confirmPassword && isChangingPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (isChangingPassword) {
      try {
        const passwordCheckData = { user_id: user.id, old_password: oldPassword };
        const passwordCheckResponse = await fetch('http://localhost:8080/api/user/check-old-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(passwordCheckData),
        });

        const passwordCheckResult = await passwordCheckResponse.json();

        if (!passwordCheckResponse.ok) {
          setErrorMsg(passwordCheckResult.error || "Old password doesn't match.");
          return;
        }

        const passwordData = { user_id: user.id, old_password: oldPassword, new_password: password, confirm_password: confirmPassword };
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
        setErrorMsg(error.message);
      }
    }

    if (!isChangingPassword) {
      try {
        const updatedUserPayload = { user_id: user.id, first_name: firstName, last_name: lastName, email: email, username: username };
        const response = await fetch('http://localhost:8080/api/user/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUserPayload),
        });

        if (!response.ok) {
          throw new Error('Failed to update user info');
        }

        // If backend returns updated user, use it, else update fields manually
        let updatedUserData;
        try {
          const responseData = await response.json();
          // If backend returns profile_image, use it, else fallback to current
          updatedUserData = {
            ...user,
            ...responseData,
            profile_image: responseData.profile_image || user.profile_image
          };
        } catch {
          // fallback if response is not JSON
          updatedUserData = {
            ...user,
            first_name: firstName,
            last_name: lastName,
            email: email,
            username: username,
            profile_image: user.profile_image
          };
        }

        // Always update localStorage with the latest info set in state
        // (in case backend doesn't return the new values, use the ones just set)
        updatedUserData = {
          ...updatedUserData,
          first_name: firstName,
          last_name: lastName,
          email: email,
          username: username
        };

        setUser(updatedUserData);
        setProfileImage(updatedUserData.profile_image);
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        Swal.fire("Success", "User info updated successfully.", "success");
      } catch (error) {
        setErrorMsg(error.message);
      }
    }
    setIsEditing(false);
    setIsChangingPassword(false);
  };

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

  const handleChangePassword = () => {
    setActiveTab('password');
    setIsChangingPassword(true);
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setActiveTab('profile');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setErrorMsg('Please enter your password to confirm account deletion.');
      return;
    }

    try {
      const passwordCheckData = {
        user_id: user.id,
        password: deletePassword
      };

      const passwordCheckResponse = await fetch('http://localhost:8080/api/user/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordCheckData)
      });

      const passwordCheckResult = await passwordCheckResponse.json();

      if (!passwordCheckResponse.ok || passwordCheckResult.error) {
        Swal.fire("Error", "Incorrect password. Please try again.", "error");
        return;
      }

      Swal.fire({
        title: 'Are you sure?',
        text: 'You will not be able to recover this account!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      }).then((result) => {
        if (result.isConfirmed) {
          fetch('http://localhost:8080/api/user/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, password: deletePassword }),
          })
            .then((response) => {
              if (response.ok) {
                Swal.fire("Deleted!", "Your account has been deleted.", "success").then(() => {
                  localStorage.removeItem("user");
                  navigate("/");
                });
              } else {
                Swal.fire("Error", "Account deletion failed.", "error");
              }
            })
            .catch((error) => {
              Swal.fire("Error", error.message, "error");
            });
        }
      });
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPassword((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  return (
    <div className="flex justify-center items-start min-h-screen pt-8">
      <div className="w-full max-w-6xl bg-transparent rounded-xl p-8">
        <div className="flex flex-col lg:flex-row justify-between space-x-6">
          {/* Left Sidebar */}
          <div className="lg:w-1/3 w-full p-8 rounded-xl border border-white mb-6 lg:mb-0">
            <div className="flex flex-col items-center mb-6 relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[#9146FF] text-white text-3xl select-none relative">
                {getProfileImageDisplay()}
                {/* Camera Icon Button (moved to right) */}
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="absolute right-0 bottom-0 bg-[#9146FF] bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition"
                  style={{ transform: 'translate(25%, 25%)' }}
                  title="Change Profile Picture"
                >
                  <FaCamera size={18} color="#fff" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleProfileImageChange}
                />
              </div>
              <div className="mt-4 text-xl font-bold">{user?.first_name} {user?.last_name}</div>
              <div className="text-sm text-gray-400">{user?.email}</div>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => { setActiveTab('profile'); setIsEditing(false); setIsChangingPassword(false); }}
                className={`w-full p-3 text-left text-lg text-white rounded-md transition-colors
                  ${activeTab === 'profile'
                    ? 'bg-[#9146FF] hover:bg-[#772ce8]'
                    : 'bg-[#23243a] hover:bg-[#2d2e4a]'}`}
              >
                Profile
              </button>
              <button
                onClick={handleChangePassword}
                className={`w-full p-3 text-left text-lg text-white rounded-md transition-colors
                  ${activeTab === 'password'
                    ? 'bg-[#9146FF] hover:bg-[#772ce8]'
                    : 'bg-[#23243a] hover:bg-[#2d2e4a]'}`}
              >
                Change Password
              </button>
              <button
                onClick={() => { setActiveTab('delete'); setIsEditing(false); setIsChangingPassword(false); }}
                className={`w-full p-3 text-left text-lg text-white rounded-md transition-colors
                  ${activeTab === 'delete'
                    ? 'bg-[#9146FF] hover:bg-[#772ce8]'
                    : 'bg-[#23243a] hover:bg-[#2d2e4a]'}`}
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:w-2/3 w-full p-8 rounded-xl border border-white">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">{activeTab === 'profile' ? "Profile Settings" : activeTab === 'password' ? "Change Password" : "Delete Account"}</h2>
              <p className="text-lg text-gray-400 mt-2">
                {activeTab === 'profile' ? 'Manage your account information.' : activeTab === 'password' ? 'Change your password.' : 'Delete your account permanently.'}
              </p>
            </div>

            {activeTab === 'profile' && (
              <div className="space-y-6">
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

                {isEditing ? (
                  <div className="mt-4 flex justify-center space-x-4">
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 text-lg bg-gray-600 text-white rounded-md hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-3 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5]"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full p-3 text-lg text-white bg-[#9146FF] rounded-md hover:bg-[#6441A5]"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="oldPassword" className="block text-sm font-semibold">Old Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword.oldPassword ? 'text' : 'password'}
                      id="oldPassword"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('oldPassword')}
                      className="absolute right-3 top-6 text-white"
                    >
                      {showPassword.oldPassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold">New Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword.newPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute right-3 top-6 text-white"
                    >
                      {showPassword.newPassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold">Confirm Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword.confirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute right-3 top-6 text-white"
                    >
                      {showPassword.confirmPassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                </div>
                {errorMsg && (
                  <div className="text-sm text-red-700 font-medium mb-4">{errorMsg}</div>
                )}
                <div className="mt-4 flex justify-center space-x-4">
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 text-lg bg-[#9146FF] text-white rounded-md hover:bg-[#6441A5]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'delete' && (
              <div className="space-y-6 flex flex-col items-center justify-center text-center">
                <div className="w-full">
                  <label htmlFor="deletePassword" className="block text-sm font-semibold text-left">Enter your password to confirm:</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword.deletePassword ? 'text' : 'password'}
                      id="deletePassword"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full p-3 mt-2 bg-[#252529] border border-gray-600 rounded-md text-white"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('deletePassword')}
                      className="absolute right-3 top-6 text-white"
                    >
                      {showPassword.deletePassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="text-sm text-red-700 font-medium mb-4">{errorMsg}</div>
                )}

                <button
                  onClick={handleDeleteAccount}
                  className="px-6 py-3 text-lg bg-red-700 text-white rounded-md hover:bg-red-600"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
