import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8080/api/history?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAllSessions(sorted);
        const index = sorted.findIndex(s => s._id === id);
        setCurrentIndex(index);
      });
  }, [id, userId]);

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
    return <div className="p-10 text-center text-gray-400 bg-[#121214] min-h-screen">Loading...</div>;
  }

  const data = Object.entries(session.sentiment_counts).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }));

  const totalMessages = session.total_chats;

  return (
    <div className="p-6 flex flex-col items-center min-h-screen bg-[#121214] text-white font-sans">
      {/* Pagination */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-4">
        <button
          onClick={() => goTo(-1)}
          disabled={allSessions.length === 0}
          className="px-3 py-1 bg-[#9146FF] text-white rounded-md hover:bg-[#772ce8] transition disabled:opacity-50 cursor-pointer"
        >
          Previous
        </button>
        <span className="text-gray-300 select-none">
          Page {currentIndex + 1} of {allSessions.length}
        </span>
        <button
          onClick={() => goTo(1)}
          disabled={allSessions.length === 0}
          className="px-3 py-1 bg-[#9146FF] text-white rounded-md hover:bg-[#772ce8] transition disabled:opacity-50 cursor-pointer"
        >
          Next
        </button>
      </div>

      {/* Session Card */}
      <div className="bg-[#1f1f23] rounded-lg shadow-xl p-8 max-w-5xl w-full relative">
        {/* Back Button */}
        <button
          onClick={() => navigate("/history")}
          className="absolute top-8 left-4 flex items-center gap-2 text-[#9146FF] hover:text-[#772ce8] transition cursor-pointer"
        >
          <FaArrowLeft />
          Back
        </button>

        {/* Header */}
        <div className="flex justify-between items-start mb-6 mt-12">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {session.streamer_name}'s Stream Summary
            </h2>
            <p className="text-gray-400 mt-1 text-sm italic">
              {new Date(session.date).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition cursor-pointer"
          >
            <FaTrashAlt />
            Delete
          </button>
        </div>

        {/* Summary Text */}
        <p className="text-gray-300 text-lg mb-8 leading-relaxed">{session.summary}</p>

        {/* Chart & Stats */}
        <div className="flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-2/3" style={{ position: 'relative', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f1f23', border: 'none' }}
                  itemStyle={{ color: 'white' }}
                  cursor={{ fill: 'rgba(145, 70, 255, 0.15)' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered total messages */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 30,
                pointerEvents: 'none',
                userSelect: 'none',
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              {totalMessages} <br />
              <span style={{ color: '#aaaaaa', fontSize: 16, fontWeight: 'normal' }}>
                Total Messages
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="w-full md:w-1/3 bg-[#2e2e3e] rounded-md p-5 shadow-inner space-y-4 text-gray-300">
            <div className="text-xl font-semibold border-b border-[#9146FF] pb-2 text-white">Session Stats</div>
            <p><span className="font-medium">Total Chats:</span> {totalMessages}</p>
            <p><span className="font-medium">Positive:</span> {session.sentiment_counts.positive} ({session.sentiment_percentages.positive}%)</p>
            <p><span className="font-medium">Neutral:</span> {session.sentiment_counts.neutral} ({session.sentiment_percentages.neutral}%)</p>
            <p><span className="font-medium">Negative:</span> {session.sentiment_counts.negative} ({session.sentiment_percentages.negative}%)</p>
          </div>
        </div>

        {/* Custom Legend below chart */}
        <div
          className="w-full flex justify-center mt-6 text-white text-center"
          style={{ borderRadius: '0.5rem' }}
        >
          <div className="grid grid-cols-3 gap-6 w-3/4 max-w-xl">
            {data.map(({ name, value }) => {
              const lowerName = name.toLowerCase();
              const percent = totalMessages ? ((value / totalMessages) * 100).toFixed(1) : 0;
              const bgColor =
                lowerName === 'positive'
                  ? 'rgba(76, 175, 80, 0.2)'
                  : lowerName === 'neutral'
                  ? 'rgba(255, 193, 7, 0.2)'
                  : 'rgba(244, 67, 54, 0.2)';
              const textColor =
                lowerName === 'positive'
                  ? 'text-green-500'
                  : lowerName === 'neutral'
                  ? 'text-yellow-500'
                  : 'text-red-500';

              return (
                <div key={name} className="p-3 border border-gray-700 rounded-md" style={{ backgroundColor: bgColor }}>
                  <div className={`font-extrabold mb-1 text-lg ${textColor}`}>{name}</div>
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="text-sm text-gray-400">{percent}% messages</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryDetail;
