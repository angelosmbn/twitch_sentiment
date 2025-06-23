import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit } from 'react-icons/fa';
import Swal from 'sweetalert2';

function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8080/api/users/${id}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setEditedUser(data);
      })
      .catch(err => console.error('Failed to load user:', err));
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(user);
  };

  const handleSave = async () => {
    try {
      const editor_user = JSON.parse(localStorage.getItem("user"));

      // Access the id property
      const userId = editor_user ? editor_user.id : null;
      const response = await fetch(`http://localhost:8080/api/users/edit/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...editedUser, userId }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);  // Update state with the new user data
        setIsEditing(false);
        Swal.fire('Saved!', 'The user details have been updated.', 'success');
      } else {
        Swal.fire('Error!', 'Failed to update user details.', 'error');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      Swal.fire('Error!', 'An error occurred while saving.', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  if (!user) {
    return <div className="p-10 text-center text-gray-400 bg-[#121214] min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-8 flex flex-col items-center min-h-screen bg-[#121214] text-white font-sans">
        <div className="bg-[#1f1f23] rounded-lg shadow-xl p-8 max-w-5xl w-full">
            {/* Back and Edit buttons alignment */}
        <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/users")}
          className="flex items-center gap-2 text-[#9146FF] hover:text-[#772ce8] transition cursor-pointer"
        >
          <FaArrowLeft />
          Back
        </button>

        {/* Edit button */}
        {!isEditing && (
          <FaEdit
            onClick={handleEdit}
            className="text-3xl text-yellow-500 cursor-pointer transition-all duration-300 hover:text-yellow-400"
          />
        )}
      </div>

      {/* Header below buttons */}
      <h2 className="text-4xl font-semibold text-[#9146FF] mb-10 text-center">User Details</h2>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <label className="block text-lg font-medium mb-2 w-1/3">First Name</label>
            {isEditing ? (
              <input
                type="text"
                name="first_name"
                value={editedUser.first_name}
                onChange={handleInputChange}
                className="w-2/3 p-3 bg-[#2a2a2a] text-white rounded-md border-2 border-[#3e3e3e] focus:outline-none text-lg"
              />
            ) : (
              <p className="text-lg text-gray-400 w-2/3">{user.first_name}</p>
            )}
          </div>
          <div className="flex justify-between items-center">
            <label className="block text-lg font-medium mb-2 w-1/3">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                name="last_name"
                value={editedUser.last_name}
                onChange={handleInputChange}
                className="w-2/3 p-3 bg-[#2a2a2a] text-white rounded-md border-2 border-[#3e3e3e] focus:outline-none text-lg"
              />
            ) : (
              <p className="text-lg text-gray-400 w-2/3">{user.last_name}</p>
            )}
          </div>
          <div className="flex justify-between items-center">
            <label className="block text-lg font-medium mb-2 w-1/3">Email</label>
            <p className="text-lg text-gray-400 w-2/3">{user.email}</p>
          </div>
          <div className="flex justify-between items-center">
            <label className="block text-lg font-medium mb-2 w-1/3">Role</label>
            {isEditing ? (
              <select
                name="role"
                value={editedUser.role}
                onChange={handleInputChange}
                className="w-2/3 p-3 bg-[#2a2a2a] text-white rounded-md border-2 border-[#3e3e3e] focus:outline-none text-lg"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <p className="text-lg text-gray-400 w-2/3">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            )}
          </div>
          <div className="flex justify-between items-center">
            <label className="block text-lg font-medium mb-2 w-1/3">Status</label>
            {isEditing ? (
              <select
                name="status"
                value={editedUser.status}
                onChange={handleInputChange}
                className="w-2/3 p-3 bg-[#2a2a2a] text-white rounded-md border-2 border-[#3e3e3e] focus:outline-none text-lg"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            ) : (
              <p className="text-lg text-gray-400 w-2/3">{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</p>
            )}
          </div>

          {isEditing ? (
            <div className="flex justify-center space-x-6 mt-6">
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-[#9146FF] text-white rounded-md hover:bg-[#772ce8] transition-all"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-[#6441A5] text-white rounded-md hover:bg-[#4b2e91] transition-all"
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default UserDetail;