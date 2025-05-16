import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function History() {
  const [sessions, setSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8080/api/history?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        setFiltered(data);
      })
      .catch((err) => console.error('Failed to load history:', err));
  }, [userId]);

  useEffect(() => {
    const filteredData = sessions.filter((session) =>
      session.streamer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFiltered(filteredData);
  }, [searchTerm, sessions]);

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s._id));
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} selected sessions?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      background: '#1e1e2f',
      color: '#eee',
      confirmButtonColor: '#FFFFFF', // changed confirm button color to white
      cancelButtonColor: '#444',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('http://localhost:8080/api/history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (response.ok) {
        const newData = sessions.filter((s) => !selectedIds.includes(s._id));
        setSessions(newData);
        setFiltered(newData);
        setSelectedIds([]);
        await Swal.fire({
          icon: 'success',
          title: 'Deleted successfully.',
          background: '#1e1e2f',
          color: '#eee',
          confirmButtonColor: '#FFFFFF', // white button
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed to delete.',
          background: '#1e1e2f',
          color: '#eee',
          confirmButtonColor: '#FFFFFF',
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: 'error',
        title: 'Error occurred during deletion.',
        background: '#1e1e2f',
        color: '#eee',
        confirmButtonColor: '#FFFFFF',
      });
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  return (
    <div className="p-8 max-w-6xl mx-auto bg-[#18181b] min-h-screen rounded-lg shadow-lg text-gray-300 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-extrabold text-white select-none">Chat Analysis History</h2>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search streamer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#2e2e3e] placeholder-gray-500 text-white border border-white rounded-md px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
          {selectedIds.length > 0 && (
            <button
              onClick={deleteSelected}
              className="bg-red-600 px-4 py-2 rounded-md shadow-md hover:bg-red-700 text-white transition"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-lg border border-white bg-[#2e2e3e]">
        <div className="max-h-[770px] min-h-[770px] overflow-y-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-[#3e3e59] text-white sticky top-0 z-10 select-none">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 text-white bg-[#18181b] border-gray-600 rounded focus:ring-white"
                  />
                </th>
                <th className="px-6 py-3 font-semibold">Streamer</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Total Chats</th>
                <th className="px-6 py-3 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => {
                const isSelected = selectedIds.includes(session._id);
                return (
                  <tr
                    key={session._id}
                    className={`border-t border-[#444466] hover:bg-[#3b1d94] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#3b1d94]' : ''
                    }`}
                    onClick={() => navigate(`/history/${session._id}`)}
                  >
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(session._id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-white bg-[#18181b] border-gray-600 rounded focus:ring-white"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium">{session.streamer_name}</td>
                    <td className="px-6 py-4">{new Date(session.date).toLocaleString()}</td>
                    <td className="px-6 py-4">{session.total_chats}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{session.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-6 text-gray-400 select-none">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;
