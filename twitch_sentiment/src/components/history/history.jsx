import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaEye,
  FaDownload,
  FaTrashAlt,
  FaArrowDown,
  FaSortAmountDown
} from 'react-icons/fa';

import { downloadPDF } from './download_pdf';

function History() {
  const [sessions, setSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [nameSort, setNameSort] = useState('');
  const [dateSort, setDateSort] = useState('latest');
  const [chatSort, setChatSort] = useState('');
  const [activeFilter, setActiveFilter] = useState('none');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const adminMode = JSON.parse(localStorage.getItem("adminMode"));

  useEffect(() => {
    if (!userId) return;

    // Use GET request with query parameters for user_id and adminMode
    const params = new URLSearchParams({
      user_id: userId,
      adminMode: adminMode
    });

    fetch(`http://localhost:8080/api/history?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        setFiltered(data);
      })
      .catch(err => console.error('Failed to load history:', err));
  }, [userId, adminMode]);

  useEffect(() => {
    let filteredData = [...sessions];

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      filteredData = filteredData.filter(session => {
        // Search by streamer name, and if adminMode, also by user_full_name
        const streamerMatch = session.streamer_name?.toLowerCase().includes(lowerSearch);
        const userMatch = adminMode && session.user_full_name
          ? session.user_full_name.toLowerCase().includes(lowerSearch)
          : false;
        return streamerMatch || userMatch;
      });
    }

    if (nameSort) {
      filteredData.sort((a, b) =>
        nameSort === 'asc'
          ? a.streamer_name.localeCompare(b.streamer_name)
          : b.streamer_name.localeCompare(a.streamer_name)
      );
    }

    if (activeFilter !== 'chats') {
      filteredData.sort((a, b) =>
        dateSort === 'latest'
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date)
      );
    }

    if (activeFilter !== 'date') {
      filteredData.sort((a, b) =>
        chatSort === 'most'
          ? b.total_chats - a.total_chats
          : a.total_chats - b.total_chats
      );
    }

    setFiltered(filteredData);
  }, [nameSort, dateSort, chatSort, sessions, activeFilter, searchTerm, adminMode]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete this history?',
      text: 'This history will be deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      background: '#1f1f2f',
      color: '#eee',
      confirmButtonColor: '#e91916',
      cancelButtonColor: '#666',
    });

    if (result.isConfirmed) {
        try {
          const user = JSON.parse(localStorage.getItem("user"));
          const userId = user?.id;

          const res = await fetch('http://localhost:8080/api/history/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id], user_id: userId, adminMode }),
          });

          if (res.ok) {
            Swal.fire('Archived!', 'The session has been archived.', 'success');
            setSessions(sessions.filter((s) => s._id !== id));
            setFiltered(filtered.filter((s) => s._id !== id));
          } else {
            Swal.fire('Error!', 'Failed to archive the session.', 'error');
          }
        } catch (err) {
          console.error(err);
          Swal.fire('Error!', 'An error occurred.', 'error');
        }
    }
  };

  return (
    <div className={adminMode ? "" : "p-10 px-40 mx-auto min-h-screen rounded-lg shadow-2xl text-gray-300 font-sans"}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-black text-[#9146FF]">Chat Analysis History</h2>

        <input
          type="text"
          placeholder={adminMode ? "Search by streamer or user..." : "Search by streamer..."}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-[#1f1f23] placeholder-gray-500 text-white border border-[#9146FF] rounded-md px-2 py-2 shadow-md focus:outline-none focus:ring-2 focus:ring-[#9146FF] w-96"
        />
      </div>

      <div
        className="overflow-y-auto rounded-lg shadow-lg border border-[#2c2c32] bg-[#1f1f23]"
        style={adminMode ? { height: 'calc(100vh - 212px)' } : { height: 'calc(100vh - 212px)' }}
      >
        <div className="max-h-[770px] overflow-y-auto">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-[#26262c] text-white sticky top-0">
              <tr>
                {adminMode && <th className="px-6 py-3 text-left w-40">User</th>}
                <th className="px-6 py-3 text-left w-40">Streamer</th>
                <th className="px-6 py-3 text-left w-48">
                  <div className="flex items-center">
                    Date
                    <FaArrowDown
                      className={`ml-2 cursor-pointer ${dateSort === 'latest' ? 'text-[#9146FF]' : ''}`}
                      onClick={() => {
                        setActiveFilter('date');
                        setDateSort(dateSort === 'latest' ? 'oldest' : 'latest');
                      }}
                      title="Sort by Date and Time"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-center w-10">
                  <div className="flex justify-center">
                    Total Chats
                    <FaSortAmountDown
                      className={`ml-2 cursor-pointer ${chatSort === 'most' ? 'text-[#9146FF]' : ''}`}
                      onClick={() => {
                        setActiveFilter('chats');
                        setChatSort(chatSort === 'most' ? 'least' : 'most');
                      }}
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <tr
                  key={session._id}
                  className="border-t border-[#3a3a44] hover:bg-[#2f1a63] transition-colors"
                >
                  {adminMode && (
                    <td className="px-6 py-4 font-medium">{session.user_full_name}</td>
                  )}
                  <td className="px-6 py-4 font-medium">{session.streamer_name}</td>
                  <td className="px-6 py-4">{new Date(session.date).toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#9146FF] text-center">{session.total_chats}</td>
                  <td className="px-6 py-4 flex gap-4 justify-center text-center">
                    <button
                      onClick={() => navigate(`/history/${session._id}`)}
                      className="text-[#9146FF] hover:text-[#6441A5] transition cursor-pointer"
                      title="View Details"
                    >
                      <FaEye size={18} />
                    </button>
                    <button
                      onClick={() => downloadPDF(session, userId)} // ⬅️ Uses imported function
                      className="text-[#3b82f6] hover:text-[#2563eb] transition cursor-pointer"
                      title="Download PDF"
                    >
                      <FaDownload size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(session._id)}
                      className="text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Archive"
                    >
                      <FaTrashAlt size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-6 text-gray-500 select-none">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;
