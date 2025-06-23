import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaEye, FaFilter } from 'react-icons/fa';

function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); // Maximum of 10 users per page
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;

    if (!userId) {
      console.error('User ID is missing in localStorage');
      return;
    }

    // Check if the user is an admin
    setIsAdmin(user?.role === 'admin');

    if (!isAdmin) return;

    fetch(`http://localhost:8080/api/users?user_id=${userId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to load users');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
          setFilteredUsers(data);
        } else {
          console.error('Data is not an array', data);
        }
      })
      .catch(err => console.error('Failed to load users:', err));
  }, [isAdmin]);

  useEffect(() => {
    let filteredData = users.filter((user) =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply role filter
    if (roleFilter) {
      filteredData = filteredData.filter(user => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter) {
      filteredData = filteredData.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filteredData);
  }, [searchTerm, roleFilter, statusFilter, users]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete this user?',
      text: 'This user will be removed from the system.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      background: '#1f1f2f',
      color: '#eee',
      confirmButtonColor: '#e91916',
      cancelButtonColor: '#666',
    });
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Get current users
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Pagination
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredUsers.length / usersPerPage); i++) {
    pageNumbers.push(i);
  }

  // Filter cycling logic
  const cycleFilter = (type) => {
    if (type === 'role') {
      if (roleFilter === '') {
        setRoleFilter('admin');
      } else if (roleFilter === 'admin') {
        setRoleFilter('employee');
      } else {
        setRoleFilter('');
      }
    } else if (type === 'status') {
      if (statusFilter === '') {
        setStatusFilter('active');
      } else if (statusFilter === 'active') {
        setStatusFilter('inactive');
      } else {
        setStatusFilter('');
      }
    }
  };

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-black text-[#9146FF]">Manage Users</h2>

        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[#1f1f23] placeholder-gray-500 text-white border border-[#9146FF] rounded-md px-4 py-2 shadow-md focus:outline-none focus:ring-2 focus:ring-[#9146FF]"
        />
      </div>

      <div className="overflow-y-auto rounded-lg shadow-lg border border-[#2c2c32] bg-[#1f1f23]" style={{ height: 'calc(100vh - 172px)' }}>
        <div className="max-h-[770px] overflow-y-auto">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-[#26262c] text-white sticky top-0">
              <tr>
                <th className="px-6 py-3 font-semibold text-left w-40">Full Name</th>
                <th className="px-6 py-3 font-semibold text-left w-56">Email</th>
                <th className="px-6 py-3 font-semibold text-left w-40">
                  <div className="flex items-center">
                    Role
                    <FaFilter
                      className={`cursor-pointer ml-2 ${roleFilter ? 'text-[#9146FF]' : ''}`}
                      onClick={() => cycleFilter('role')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold text-left w-40">
                  <div className="flex items-center">
                    Status
                    <FaFilter
                      className={`cursor-pointer ml-2 ${statusFilter ? 'text-[#9146FF]' : ''}`}
                      onClick={() => cycleFilter('status')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length > 0 ? (
                currentUsers.map((user) => (
                  <tr key={user._id || user.id} className="border-t border-[#3a3a44] hover:bg-[#2f1a63] transition-colors">
                    <td className="px-6 py-4 font-medium">{user.first_name} {user.last_name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${user.role === 'admin' ? 'bg-[#9146FF] text-white' : 'bg-gray-600 text-white'}`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${user.status === 'active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-4 items-center justify-center">
                      <button
                        onClick={() => {
                          if (user._id) {
                            navigate(`/users/${user._id}`);
                          } else {
                            console.error('User ID is missing');
                          }
                        }}
                        className="text-[#9146FF] hover:text-[#6441A5] transition cursor-pointer"
                        title="View Details"
                      >
                        <FaEye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500 select-none">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredUsers.length > usersPerPage && (
          <div className="flex justify-center mt-4">
            <nav>
              <ul className="flex space-x-4">
                {pageNumbers.map(number => (
                  <li key={number}>
                    <button
                      onClick={() => handlePageChange(number)}
                      className={`px-4 py-2 rounded-md ${currentPage === number ? 'bg-[#9146FF] text-white' : 'bg-gray-700 text-white'} hover:bg-[#6441A5]`}
                    >
                      {number}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default Users;
