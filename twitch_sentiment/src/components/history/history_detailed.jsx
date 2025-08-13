import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegLightbulb, FaSignal, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { downloadPDF } from './download_pdf'; // Utility function

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
  // Get adminMode from localStorage (as in App.jsx)
  const [adminMode, setAdminMode] = useState(() => {
    const savedAdminMode = localStorage.getItem('adminMode');
    return savedAdminMode === 'true';
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

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
    const confirmed = await Swal.fire({
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

    if (!confirmed.isConfirmed) return;

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.id;

      const res = await fetch('http://localhost:8080/api/history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], user_id: userId }),
      });

      if (res.ok) {
        Swal.fire('Deleted!', 'The session has been hidden successfully.', 'success');
        navigate("/history");
      } else {
        Swal.fire('Error!', 'Failed to hide the session.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error!', 'An error occurred while hiding the session.', 'error');
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

  const scrollbarStyles = {
    scrollbarWidth: 'thin',
    scrollbarColor: '#6441A5 #1f1f23',
  };

  return (
    <div className={`${adminMode ? "" : "p-6"} flex flex-col items-center min-h-screen text-white font-sans`}>
      {/* Pagination */}
      <div className={`w-full ${adminMode ? "" : "px-40"} flex justify-between items-center mb-4`}>
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
      <div
        className={`bg-[#1f1f23] rounded-lg shadow-xl p-8 relative overflow-y-auto overflow-x-hidden ${adminMode ? "" : "mx-40"}`}
        style={{ maxHeight: adminMode ? 'calc(100vh - 150px)' : 'calc(100vh - 170px)', ...scrollbarStyles }}
      >
        {/* Header */}
        <div className="flex justify-between items-center absolute px-7 left-4 w-full">
          <button
            onClick={() => navigate(adminMode ? "/all_history" : "/history")}
            className="flex items-center gap-2 text-[#9146FF] hover:text-[#772ce8] transition cursor-pointer"
          >
            <FaArrowLeft />
            Back
          </button>
          <div className="flex flex-row items-center space-x-4">
            <button
              onClick={() => downloadPDF(session, userId)} // ✅ Fixed here
              className="flex items-center gap-2 text-white bg-[#9146FF] hover:bg-[#772ce8] transition px-4 py-2 rounded-md cursor-pointer"
            >
              <FaRegLightbulb />
              Download
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-md cursor-pointer mr-7"
            >
              <FaTrash />
              Delete
            </button>
          </div>
        </div>

        {/* Streamer Info */}
        <div className="flex justify-center items-center mb-6 mt-12">
          <FaSignal className="text-3xl text-[#9146FF]" />
          <h2 className="text-3xl font-bold text-white mx-4">
            {session.streamer_name}
          </h2>
        </div>
        <p className="text-gray-400 text-sm italic mb-6 text-center">
          Analysis from {new Date(session.date).toLocaleString()}
        </p>

        {/* Sentiment Cards */}
        <div className="flex justify-between mb-6 gap-6">
          {['positive', 'neutral', 'negative'].map((type) => (
            <div key={type} className="w-full md:w-1/3 bg-[#2e2e3e] rounded-md p-5 shadow-inner text-center text-white">
              <div className={`text-xl font-bold mb-2`} style={{ color: COLORS[type] }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
              <div className="text-3xl font-bold">
                {session.sentiment_counts[type]}
              </div>
              <div className="text-sm font-medium mt-1">
                {session.sentiment_percentages[type]}%
              </div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div className="bg-[#2e2e3e] rounded-md p-6 shadow-xl mb-6">
          <div className="flex items-center text-white text-2xl font-semibold mb-4">
            <FaRegLightbulb className="text-purple-500 mr-2 animate-pulse" />
            <span>AI Analysis Summary</span>
          </div>
          <p className="text-gray-300">{session.summary}</p>
        </div>

        {/* Top Chatters */}
        <div className="bg-[#2e2e3e] shadow-md rounded-xl p-6 border border-gray-600">
          <h3 className="text-3xl font-bold mb-2">Top Chatter Analysis</h3>
          <p className="text-sm text-gray-500 mb-4">Users with the most messages by sentiment</p>
          <div className="flex gap-4">
            {['Positive', 'Neutral', 'Negative'].map((sentiment) => (
              <div key={sentiment} className="flex-1 bg-[#20202b] border border-gray-700 rounded-lg p-3 overflow-y-auto" style={scrollbarStyles}>
                <h4 className={`text-xl font-semibold mb-3 ${sentiment === 'Positive' ? 'text-green-500' : sentiment === 'Neutral' ? 'text-yellow-500' : 'text-red-500'}`}>
                  {sentiment}
                </h4>
                {session.top_chatters[sentiment] && session.top_chatters[sentiment].length === 0 && (
                  <p className="text-gray-500 text-sm">No data</p>
                )}
                {session.top_chatters[sentiment]?.map((chatter, index) => (
                  <div key={index} className="flex justify-between items-center mb-2 px-2 py-1 rounded hover:bg-gray-700">
                    <span className="truncate" title={chatter.username}>{chatter.username}</span>
                    <span className={`rounded-full w-8 h-8 flex justify-center items-center font-bold text-sm text-white ${sentiment === 'Positive' ? 'bg-green-500' : sentiment === 'Neutral' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {chatter.count}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryDetail;
