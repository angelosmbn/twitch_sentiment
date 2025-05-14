import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { FaTrashAlt, FaArrowLeft } from 'react-icons/fa';

const COLORS = {
  positive: '#4CAF50',
  neutral: '#FFC107',
  negative: '#F44336',
};

function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  // Retrieve user ID from local storage
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user ? user.id : null;

  // Load all session IDs once
  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8080/api/history?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date)); // optional: newest first
        setAllSessions(sorted);
        const index = sorted.findIndex(s => s._id === id);
        setCurrentIndex(index);
      });
  }, [id, userId]);

  // Load specific session
  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8080/api/history/${id}`)
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(err => console.error('Failed to load session detail:', err));
  }, [id, userId]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this session?");
    if (!confirmed) return;

    try {
      const res = await fetch('http://localhost:8080/api/history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      if (res.ok) {
        alert("Session deleted.");
        navigate("/history");
      } else {
        alert("Failed to delete session.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting session.");
    }
  };

  const goTo = (offset) => {
    if (allSessions.length === 0) return;
  
    let newIndex = (currentIndex + offset + allSessions.length) % allSessions.length;
    const nextId = allSessions[newIndex]._id;
    navigate(`/history/${nextId}`);
  };
  

  if (!session || currentIndex === null) {
    return <div className="p-10 text-center text-gray-500">Loading...</div>;
  }

  const data = Object.entries(session.sentiment_counts).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }));

  return (
    <div className="p-6 flex flex-col items-center min-h-screen bg-gray-100">
      {/* Pagination */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-4">
        <button
          onClick={() => goTo(-1)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-gray-700">
          Page {currentIndex + 1} of {allSessions.length}
        </span>
        <button
          onClick={() => goTo(1)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Session Card */}
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-5xl w-full relative">
        {/* Back Button */}
        <button
          onClick={() => navigate("/history")}
          className="absolute top-8 left-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
        >
          <FaArrowLeft />
          Back
        </button>

        {/* Header */}
        <div className="flex justify-between items-start mb-6 mt-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              {session.streamer_name}'s Stream Summary
            </h2>
            <p className="text-gray-600 mt-1 text-sm italic">
              {new Date(session.date).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            <FaTrashAlt />
            Delete
          </button>
        </div>

        {/* Summary Text */}
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">{session.summary}</p>

        {/* Chart & Stats */}
        <div className="flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-2/3">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="w-full md:w-1/3 bg-gray-50 rounded-md p-5 shadow-inner space-y-4 text-gray-700">
            <div className="text-xl font-semibold border-b pb-2">Session Stats</div>
            <p><span className="font-medium">Total Chats:</span> {session.total_chats}</p>
            <p><span className="font-medium">Positive:</span> {session.sentiment_counts.positive} ({session.sentiment_percentages.positive}%)</p>
            <p><span className="font-medium">Neutral:</span> {session.sentiment_counts.neutral} ({session.sentiment_percentages.neutral}%)</p>
            <p><span className="font-medium">Negative:</span> {session.sentiment_counts.negative} ({session.sentiment_percentages.negative}%)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryDetail;