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

function HistoryAdmin() {
  const [sessions, setSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [nameSort, setNameSort] = useState('');
  const [dateSort, setDateSort] = useState('latest');
  const [chatSort, setChatSort] = useState('');
  const [activeFilter, setActiveFilter] = useState('none');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8080/api/history?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        setFiltered(data);
      })
      .catch(err => console.error('Failed to load history:', err));
  }, [userId]);

  useEffect(() => {
    let filteredData = [...sessions];

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
  }, [nameSort, dateSort, chatSort, sessions, activeFilter]);

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
          body: JSON.stringify({ ids: [id], user_id: userId }),
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
    <div className="p-10 max-w-7xl mx-auto bg-[#0e0e10] min-h-screen rounded-lg shadow-2xl text-gray-300 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-4xl font-black text-[#9146FF]">Chat Analysis Historyss</h2>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-lg border border-[#2c2c32] bg-[#1f1f23]">
        <div className="max-h-[700px] overflow-y-auto">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-[#26262c] text-white sticky top-0">
              <tr>
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
                <th className="px-6 py-3 text-center w-40">
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

export default HistoryAdmin;
