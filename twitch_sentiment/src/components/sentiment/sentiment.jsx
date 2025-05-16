import { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';

// Custom hook to block navigation with SweetAlert2 confirm (React Router v6)
function usePrompt(message, when) {
  const { navigator } = useContext(NavigationContext);

  useEffect(() => {
    if (!when) return;

    const originalPush = navigator.push;

    navigator.push = async (...args) => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, leave',
        cancelButtonText: 'Stay',
        background: '#1f1f23',
        color: '#dedee3',
        confirmButtonColor: '#6441A5',
        cancelButtonColor: '#d33',
      });

      if (result.isConfirmed) {
        navigator.push = originalPush; // restore before navigating
        originalPush(...args);
      }
    };

    return () => {
      navigator.push = originalPush;
    };
  }, [message, navigator, when]);

  useEffect(() => {
    if (!when) return;

    const beforeUnloadHandler = (e) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [message, when]);
}

function SentimentStream() {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107',
  };

  const navigate = useNavigate();

  // Redirect if no logged-in user with SweetAlert
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in',
        text: 'Please log in to access the sentiment analysis.',
        background: '#1f1f23',
        color: '#dedee3',
        confirmButtonColor: '#6441A5',
      }).then(() => {
        navigate('/auth', { replace: true });
      });
    }
  }, [navigate]);

  const aggregateSentiments = (messages) => {
    const counts = { Positive: 0, Negative: 0, Neutral: 0 };
    for (const msg of messages) {
      if (counts[msg.sentiment] !== undefined) {
        counts[msg.sentiment]++;
      }
    }
    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }));
  };

  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState([]);
  const [streamStarted, setStreamStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [streamer, setStreamer] = useState('');
  const [sessionId, setSessionId] = useState(null);

  const chatContainerRef = useRef(null);

  usePrompt(
    'The stream is running. Are you sure you want to leave and stop streaming?',
    streamStarted
  );

  const startStream = async () => {
    setIsConnecting(true);

    const response = await fetch('http://localhost:8080/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const newSessionId = uuidv4();
      setSessionId(newSessionId);

      const source = new EventSource('http://localhost:8080/api/sentiment/stream');
      let firstMessageReceived = false;

      source.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (!data.message || !data.message.trim()) {
          return; // skip empty or whitespace-only messages
        }

        if (!firstMessageReceived) {
          firstMessageReceived = true;
          setIsConnecting(false);
          setStreamStarted(true);
        }

        setMessages((prev) => [...prev, data]);
        if (!streamer) {
          setStreamer(data.streamer);
        }
      };
      setEventSource(source);
    } else {
      setIsConnecting(false);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to start stream',
        text: 'Check the Twitch URL.',
        background: '#1f1f23',
        color: '#dedee3',
        confirmButtonColor: '#6441A5',
      });
    }
  };

  const stopStream = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setStreamStarted(false);
  };

  const saveChat = async () => {
    setIsAutoScroll(false);

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      await Swal.fire({
        icon: 'warning',
        title: 'No user logged in',
        text: 'Please log in to save the chat.',
        background: '#1f1f23',
        color: '#dedee3',
        confirmButtonColor: '#6441A5',
      });
      return false;
    }
    const userId = user.id;

    const payload = {
      streamer,
      sessionId,
      messages,
      userId,
    };

    const response = await fetch('http://localhost:8080/save-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await Swal.fire({
        icon: 'success',
        title: 'Chat saved successfully!',
        background: '#1f1f23',
        color: '#dedee3',
        confirmButtonColor: '#6441A5',
      });

      resetStream();
      return true;
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Failed to save chat',
        background: '#1f1f23',
        color: '#dedee3',
        confirmButtonColor: '#6441A5',
      });
      return false;
    }
  };

  const resetStream = () => {
    setMessages([]);
    setStreamer('');
    setSessionId(null);
    setStreamStarted(false);
    if (eventSource) eventSource.close();
    setEventSource(null);
  };

  const handleDisconnect = async () => {
    const result = await Swal.fire({
      title: 'Disconnect from Channel?',
      text: `Are you sure you want to disconnect from ${streamer}'s chat?`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Save',
      denyButtonText: 'Discard',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#6441A5',
      denyButtonColor: '#d33',
      background: '#1f1f23',
      color: '#dedee3',
    });

    if (result.isConfirmed) {
      const saved = await saveChat();
      if (saved) {
        stopStream();
      }
    } else if (result.isDenied) {
      resetStream();
    }
  };

  useEffect(() => {
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [eventSource]);

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      setIsAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;

    if (isAutoScroll !== isAtBottom) {
      setIsAutoScroll(isAtBottom);
      setShowScrollButton(!isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll) {
      const container = chatContainerRef.current;
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 50);
      }
    }
  }, [messages, isAutoScroll]);

  return (
    <div className="p-6 px-10 flex flex-row bg-[#0a0a0d] text-white font-sans" style={{ height: 'calc(100vh - 70px)' }}>
      {/* Left panel */}
      <div className="flex flex-col w-2/5 h-full">
        <div className="bg-[#0c0c0f] shadow-md rounded-xl p-6 mb-5 text-white border border-gray-600" style={{ height: '30%' }}>
          <div className="flex flex-col gap-6 mb-8 items-center w-full h-full">
            <h1 className="text-4xl font-extrabold text-white mb-6 w-full text-center">Twitch Chat Analysis</h1>
            {!streamStarted && !isConnecting && (
              <>
                <input
                  type="text"
                  value={url}
                  placeholder="Enter Twitch URL e.g. https://www.twitch.tv/arteezy"
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={streamStarted || isConnecting}
                  className="w-full px-5 py-3 bg-[#0e0e10] text-white border border-[#2e2e35] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9146FF]"
                />
                <button
                  onClick={startStream}
                  className="w-full bg-[#6441A5] text-white px-6 py-3 rounded-lg shadow-md hover:bg-[#9146FF] transition"
                >
                  Connect
                </button>
              </>
            )}

            {/* Loader while connecting */}
            {isConnecting && (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <svg
                  className="animate-spin h-12 w-12 text-[#6441A5]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
                <p className="mt-3 text-lg font-semibold text-[#6441A5]">Connecting...</p>
              </div>
            )}

            {streamStarted && (
              <div className="bg-gray-900 flex justify-between items-center w-full p-4 rounded-lg shadow-lg">
                <div className="text-lg text-white">
                  <strong>Connected to <span className="text-[#9146FF] font-bold text-xl">{streamer}</span></strong><br />
                  <span className="text-sm text-gray-400">{messages.length} messages collected</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="bg-red-500 text-white px-5 py-2 rounded-full shadow-md hover:bg-red-600 transition-transform transform hover:scale-105"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0c0c0f] shadow-md rounded-xl p-6 flex-grow border border-gray-600" style={{ height: 'calc(70% - 1.5rem)' }}>
          <h3 className="text-3xl font-bold text-white text-left">Sentiment Analysis</h3>
          <p className="text-sm text-gray-500 text-left mb-2 rounded">
            Real-time sentiment breakdown of chat messages
          </p>

          <div style={{ position: 'relative', width: '100%', height: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregateSentiments(messages)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={130}
                  fill="#8884d8"
                  label
                >
                  {aggregateSentiments(messages).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {streamStarted && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '30px',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  textAlign: 'center',
                  lineHeight: '1',
                }}
              >
                {messages.length} <br />
                <span style={{ color: '#aaaaaa', fontSize: '16px', fontWeight: 'normal' }}>
                  Total Messages
                </span>
              </div>
            )}
          </div>

          {streamStarted && (
            <div
              className="w-full flex justify-center mt-2 text-white text-center"
              style={{ borderRadius: '0.5rem' }}
            >
              <div className="grid grid-cols-3 gap-6 w-3/4">
                {aggregateSentiments(messages).map(({ name, value }) => {
                  const percent = messages.length
                    ? ((value / messages.length) * 100).toFixed(1)
                    : 0;
                  const bgColor =
                    name === 'Positive'
                      ? 'rgba(0, 255, 0, 0.2)'
                      : name === 'Neutral'
                        ? 'rgba(255, 255, 0, 0.2)'
                        : 'rgba(255, 0, 0, 0.2)';
                  const textColor =
                    name === 'Positive'
                      ? 'text-green-500'
                      : name === 'Neutral'
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
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-3/5 bg-[#1f1f23] shadow-md rounded-xl ml-5 relative h-full">
        <div className="text-2xl text-left w-full h-30 flex flex-col items-start justify-center rounded-tl-xl rounded-tr-xl" style={{ backgroundColor: '#1f1f23', padding: '10px 20px' }}>
          <div><strong>Chat: {streamer}</strong></div>
          <span style={{ fontSize: '1rem', color: '#888888' }}>Live chat with sentiment analysis</span>
        </div>

        <div
          className="space-y-4 max-h-[715px] min-h-[715px] overflow-y-auto shadow-inner p-3 bg-[#0e0e10] rounded-b-lg"
          ref={chatContainerRef}
          onScroll={handleScroll}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded shadow-md bg-[#1f1f23] border-l-4 ${msg.sentiment === 'Positive'
                ? 'border-green-500'
                : msg.sentiment === 'Neutral'
                  ? 'border-yellow-500'
                  : 'border-red-500'
                }`}
            >
              <p className="text-white flex justify-between items-center">
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  <strong>{msg.username}:</strong> {msg.message}
                </span>
                <span
                  className={`text-sm font-medium px-3 py-1 ml-4 rounded-full shadow-md ${msg.sentiment === 'Positive'
                    ? 'bg-green-200 text-green-800'
                    : msg.sentiment === 'Neutral'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-red-200 text-red-800'
                    }`}
                >
                  {msg.sentiment}
                </span>
              </p>
            </div>
          ))}
        </div>

        {showScrollButton && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={scrollToBottom}
              className="bg-[#6441A5] bg-opacity-50 text-white px-4 py-2 rounded-full shadow-md hover:bg-[#9146FF] transition"
            >
              Scroll to Latest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SentimentStream;
