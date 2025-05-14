import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function History() {
  const [sessions, setSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  // Fetch sessions (filtered by user)
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

  // Handle search filtering
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

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected sessions?`);
    if (!confirmed) return;

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
        setSelectMode(false);
        alert('Deleted successfully.');
      } else {
        alert('Failed to delete.');
      }
    } catch (error) {
      console.error(error);
      alert('Error occurred during deletion.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Chat Analysis History</h2>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search streamer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setSelectMode((prev) => !prev)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            {selectMode ? 'Cancel' : 'Select Mode'}
          </button>
          {selectMode && selectedIds.length > 0 && (
            <button
              onClick={deleteSelected}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
            >
              Delete Selected
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
        <div className="max-h-[770px] min-h-[770px] overflow-y-auto">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase sticky top-0 z-10">
              <tr>
                {selectMode && <th className="px-4 py-3 w-12"></th>}
                <th className="px-6 py-3">Streamer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Total Chats</th>
                <th className="px-6 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <tr
                  key={session._id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => !selectMode && navigate(`/history/${session._id}`)}
                >
                  {selectMode && (
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(session._id)}
                        onChange={() => toggleSelection(session._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {session.streamer_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(session.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{session.total_chats}</td>
                  <td className="px-6 py-4 truncate max-w-sm text-gray-700">
                    {session.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-6 text-gray-500">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;
