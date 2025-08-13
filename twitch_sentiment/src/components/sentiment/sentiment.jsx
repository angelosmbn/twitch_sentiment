import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Swal from 'sweetalert2';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';

// Custom hook to block navigation with SweetAlert2 confirm (React Router v6)
function usePrompt(message, when, setStreamStarted) {
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
        if (setStreamStarted) setStreamStarted(false); // Ensure streamStarted is false on leave
        originalPush(...args);
      }
    };

    return () => {
      navigator.push = originalPush;
    };
  }, [message, navigator, when, setStreamStarted]);

  useEffect(() => {
    if (!when) return;

    const beforeUnloadHandler = (e) => {
      e.preventDefault();
      e.returnValue = message;
      if (setStreamStarted) setStreamStarted(false); // Ensure streamStarted is false on leave
      return message;
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [message, when, setStreamStarted]);
}

// Custom Legend Renderer with longer rectangles and white text
const renderCustomizedLegend = (props) => {
  const { payload } = props;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 0,
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      {payload.map((entry) => (
        <div
          key={entry.value}
          style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}
        >
          <div
            style={{
              width: 40, // longer rectangle width
              height: 18,
              backgroundColor: entry.color,
              borderRadius: 3,
              marginRight: 8,
            }}
          />
          <span style={{ color: 'white', fontSize: 20 }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

function SentimentStream({ streamStarted, setStreamStarted }) {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107',
  };

  const navigate = useNavigate();

  // --- REMOVE login requirement for analysis ---
  // useEffect(() => {
  //   const user = JSON.parse(localStorage.getItem('user'));
  //   if (!user) {
  //     Swal.fire({
  //       icon: 'warning',
  //       title: 'You need to log in',
  //       text: 'Please log in to access the sentiment analysis.',
  //       background: '#1f1f23',
  //       color: '#dedee3',
  //       confirmButtonColor: '#6441A5',
  //     }).then(() => {
  //       navigate('/auth', { replace: true });
  //     });
  //   }
  // }, [navigate]);

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

  // Helper: get top chatters by dominant sentiment
  const getTopChattersBySentiment = (messages) => {
    const userCounts = {};

    messages.forEach(({ username, sentiment }) => {
      if (!userCounts[username]) {
        userCounts[username] = { Positive: 0, Neutral: 0, Negative: 0 };
      }
      if (userCounts[username][sentiment] !== undefined) {
        userCounts[username][sentiment]++;
      }
    });

    const categorized = {
      Positive: [],
      Neutral: [],
      Negative: [],
    };

    Object.entries(userCounts).forEach(([username, counts]) => {
      const dominantSentiment = Object.entries(counts).reduce(
        (maxSent, [sent, count]) => (count > maxSent.count ? { sentiment: sent, count } : maxSent),
        { sentiment: null, count: 0 }
      );

      if (dominantSentiment.sentiment && dominantSentiment.count > 0) {
        categorized[dominantSentiment.sentiment].push({
          username,
          count: dominantSentiment.count,
        });
      }
    });

    Object.keys(categorized).forEach((sentiment) => {
      categorized[sentiment].sort((a, b) => b.count - a.count);
      // Only keep top 5 for each sentiment
      categorized[sentiment] = categorized[sentiment].slice(0, 5);
    });

    return categorized;
  };

  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState([]);
  // const [streamStarted, setStreamStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [streamer, setStreamer] = useState('');
  const [sessionId, setSessionId] = useState(null);

  const [filter, setFilter] = useState('All');

  // New: Track if user has attempted to connect (clicked "Connect")
  const [hasTriedConnect, setHasTriedConnect] = useState(false);

  // New: Track if analysis page should be shown (true after first message received)
  const [showAnalysis, setShowAnalysis] = useState(false);

  const reconnectRef = useRef({ attempts: 0, max: 5 });
  const chatContainerRef = useRef(null);

  const [seconds, setSeconds] = useState(0);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!streamStarted) {
      setSeconds(0); // Reset timer to 0:00:00 when stream is not started
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);

    // Clear interval on component unmount or when stream stops
    return () => clearInterval(timer);
  }, [streamStarted]);

  // Pass setStreamStarted to usePrompt so it can set streamStarted to false on leave
  usePrompt(
    'The stream is running. Are you sure you want to leave and stop streaming?',
    streamStarted,
    setStreamStarted
  );

  // Set streamStarted to false if component unmounts (user leaves page)
  useEffect(() => {
    return () => {
      if (eventSource) eventSource.close();
      if (setStreamStarted) setStreamStarted(false);
    };
    // eslint-disable-next-line
  }, [eventSource, setStreamStarted]);

  // Modified setupSSE to set showAnalysis when first message is received
  const setupSSE = async () => {
    // Check if the user is offline
    if (!navigator.onLine) {
      setIsConnecting(true);
      const checkOnline = () => {
        if (navigator.onLine) {
          clearInterval(onlineCheckInterval);
          setupSSE();
        }
      };
      const onlineCheckInterval = setInterval(checkOnline, 3000);
      return;
    }

    setIsConnecting(false);

    const source = new EventSource('http://localhost:8080/api/sentiment/stream');

    source.onopen = () => {
      // SSE connection opened
    };

    source.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.status === 'reconnected') {
          if (eventSource) {
            eventSource.close();
            setEventSource(null);
          }
          Swal.fire({
            icon: 'success',
            title: 'Reconnected',
            text: 'Connection to Twitch chat was successfully restored!',
            background: '#1f1f23',
            color: '#dedee3',
            confirmButtonColor: '#6441A5',
          });
          reconnectRef.current.attempts = 0;
          return;
        }

        if (data?.error === 'No internet connection') {
          source.close();
          setIsConnecting(true);
          setTimeout(() => {
            setupSSE();
          }, 3000);
          return;
        }

        if (!data.message || !data.message.trim()) {
          return;
        }

        reconnectRef.current.attempts = 0;
        setMessages((prev) => [...prev, data]);
        if (!streamer) setStreamer(data.streamer);

        // When first message is received, show analysis page
        if (!streamStarted) {
          setIsConnecting(false);
          setStreamStarted(true);
        }
        setShowAnalysis(true);
      } catch (e) {
        // Invalid SSE message
      }
    };

    source.onerror = async () => {
      source.close();
      reconnectRef.current.attempts++;
      if (reconnectRef.current.attempts < reconnectRef.current.max) {
        setTimeout(setupSSE, 1000 * reconnectRef.current.attempts);
      } else {
        setIsConnecting(false);
      }
    };

    setEventSource(source);
  };

  useEffect(() => {
    const handleOnline = () => {
      if (!eventSource && streamStarted) {
        setupSSE();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [streamStarted, eventSource]);

  // Modified startStream to set hasTriedConnect and show loading
  const startStream = async () => {
    setIsConnecting(true);
    setHasTriedConnect(true);
    setShowAnalysis(false);

    // Allow analysis even if there is no user
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user ? user.id : null;
    const response = await fetch('http://localhost:8080/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, userId }),
    });

    if (response.ok) {
      setSessionId(uuidv4());
      reconnectRef.current.attempts = 0;
      setupSSE();
    } else {
      setIsConnecting(false);
      setHasTriedConnect(false);
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
    setShowAnalysis(false);
    setHasTriedConnect(false);
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

    // Get top 5 chatters or less if there are fewer than 5
    const topChattersList = Object.entries(topChatters).reduce((result, [sentiment, chatters]) => {
      result[sentiment] = chatters.slice(0, 5); // Take the top 5 or less if fewer than 5
      return result;
    }, {});

    const userData = JSON.parse(localStorage.getItem("user"));
    const saver_id = userData ? userData.id : null;

    const payload = {
      streamer,
      sessionId,
      messages,
      userId: user.id,
      topChatters: topChattersList,
      saver_id: saver_id
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
    if (eventSource) eventSource.close();
    setEventSource(null);
    setMessages([]);
    setStreamer('');
    setSessionId(null);
    setStreamStarted(false);
    setShowAnalysis(false);
    setHasTriedConnect(false);
  };

  // --- MODIFIED handleDisconnect: Only show Save if user is logged in ---
  const handleDisconnect = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    let result;
    if (user) {
      result = await Swal.fire({
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
    } else {
      result = await Swal.fire({
        title: 'Disconnect from Channel?',
        text: `Are you sure you want to disconnect from ${streamer}'s chat?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Disconnect',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        background: '#1f1f23',
        color: '#dedee3',
      });
      // Simulate "isDenied" for discard if user clicks "Disconnect"
      if (result.isConfirmed) {
        resetStream();
        return;
      }
    }

    if (result.isConfirmed && user) {
      const saved = await saveChat();
      if (saved) stopStream();
    } else if (result.isDenied) {
      resetStream();
    }
  };

  // The following useEffect is now only for closing eventSource, streamStarted is handled above
  // (moved setStreamStarted(false) to the above useEffect for unmount)
  // useEffect(() => {
  //   return () => {
  //     if (eventSource) eventSource.close();
  //   };
  // }, [eventSource]);

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

  // Filtered messages based on selected filter
  const filteredMessages = messages.filter((msg) => {
    if (filter === 'All') return true;
    return msg.sentiment === filter;
  });

  const topChatters = getTopChattersBySentiment(messages);

  // --- UI Logic for loading, input, and analysis page ---

  // If user has clicked connect, but not yet connected, show loading
  if (hasTriedConnect && (isConnecting || !showAnalysis)) {
    // If not yet connected (no message received), show loading spinner
    return (
      <div className="flex justify-center items-center" style={{ height: 'calc(100vh - 70px)', backgroundColor: '#0a0a0d' }}>
        <div className="flex flex-col justify-center items-center bg-[#0c0c0f] shadow-md rounded-xl p-8 w-full max-w-2xl text-white border border-gray-600">
          <h1 className="text-4xl font-extrabold mb-6 text-center">
            Connecting to Twitch Chat...
          </h1>
          <div className="flex flex-col items-center">
            <div className="loader mb-4" style={{
              border: "6px solid #f3f3f3",
              borderTop: "6px solid #6441A5",
              borderRadius: "50%",
              width: 60,
              height: 60,
              animation: "spin 1s linear infinite"
            }} />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg);}
                  100% { transform: rotate(360deg);}
                }
              `}
            </style>
            <span className="text-lg text-gray-300">Waiting for chat connection...</span>
            <span className="text-sm text-gray-500 mt-2">Please wait, this may take a few seconds.</span>
          </div>
          <button
            onClick={resetStream}
            className="w-full mt-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-red-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // If not started and not connecting, show input page
  if (!streamStarted && !isConnecting && !showAnalysis) {
    return (
      <div className="flex justify-center items-center" style={{ height: 'calc(100vh - 140px)', backgroundColor: '#0a0a0d' }}>
        <div className="flex flex-col justify-center items-center bg-[#0c0c0f] shadow-md rounded-xl p-8 w-full max-w-2xl text-white border border-gray-600">
          <h1 className="text-4xl font-extrabold mb-6 text-center">
            Twitch Chat Analysis
          </h1>
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
            className="w-full mt-6 bg-[#6441A5] text-white px-6 py-3 rounded-lg shadow-md hover:bg-[#9146FF] transition"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  // If analysis page should be shown (after first message received)
  // Purple scrollbar styles for Firefox (inline)
  const scrollbarStyles = {
    scrollbarWidth: 'thin',
    scrollbarColor: '#6441A5 #1f1f23',
  };

  // Responsive styles
  // Large: 2/6 left, 4/6 right, row
  // Medium: 1/3 left, 2/3 right, row, smaller padding/font
  // Small: stacked column, 100% width, smaller font/padding
  // We'll use Tailwind's responsive classes and a few inline styles for recharts

  return (
    <>
      {/* Responsive custom styles */}
      <style>
        {`
          @media (max-width: 1023px) {
            .sentiment-flex-main { flex-direction: column !important; padding-left: 0 !important; padding-right: 0 !important; }
            .sentiment-left-panel, .sentiment-right-panel { width: 100% !important; margin-left: 0 !important; }
            .sentiment-left-panel { flex-direction: row !important; gap: 1rem !important; height: auto !important; }
            .sentiment-analysis-panel, .sentiment-topchatter-panel { height: auto !important; min-width: 0 !important; }
            .sentiment-analysis-panel, .sentiment-topchatter-panel { flex: 1 1 0 !important; }
          }
          @media (max-width: 767px) {
            .sentiment-flex-main { flex-direction: column !important; padding: 0.5rem !important; }
            .sentiment-left-panel { flex-direction: column !important; gap: 0.75rem !important; }
            .sentiment-analysis-panel, .sentiment-topchatter-panel { padding: 1rem !important; }
            .sentiment-analysis-panel h3, .sentiment-topchatter-panel h3 { font-size: 1.25rem !important; }
            .sentiment-topchatter-panel h4 { font-size: 1rem !important; }
            .sentiment-right-panel { padding: 0.5rem !important; }
          }
        `}
      </style>
      <div
        className="p-6 px-10 flex flex-row bg-[#0a0a0d] text-white font-sans sentiment-flex-main"
        style={{ height: 'calc(100vh - 72px)' }}
      >
        {/* Left panel */}
        <div className="flex flex-col w-2/6 h-full gap-6 sentiment-left-panel">
          {/* Sentiment Analysis panel - slightly smaller */}
          <div
            className="bg-[#0c0c0f] shadow-md rounded-xl p-6 pb-0 border border-gray-600 flex flex-col sentiment-analysis-panel"
            style={{ height: '57%' }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-3xl font-bold">Sentiment Analysis</h3>
              <div className="bg-[#23243a] rounded-full px-3 py-1 text-gray-400 font-semibold text-base shadow-sm flex items-center justify-center" style={{ minWidth: 60 }}>
                {formatTime(seconds)}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4 rounded">
              Real-time sentiment breakdown of chat messages
            </p>
            {/*
              Responsive PieChart sizing:
              - Large screens: outerRadius 130
              - Medium screens: outerRadius 90
              - Small screens: outerRadius 60
            */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 'calc(100% - 60px)',
                minHeight: 180,
                maxHeight: 500,
              }}
              className="sm:min-h-[180px] min-h-[140px] md:min-h-[220px] lg:min-h-[260px]"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={80}
                minWidth={80}
              >
                <PieChart>
                  <Pie
                    data={aggregateSentiments(messages)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    // Responsive outerRadius based on window width
                    outerRadius={
                      window.innerWidth < 768
                        ? 100
                        : window.innerWidth < 1024
                        ? 60
                        : window.innerWidth < 1200
                        ? 70
                        : window.innerWidth < 1400
                        ? 80
                        : window.innerWidth < 1600
                        ? 90
                        : 120
                    }
                    fill="#8884d8"
                  >
                    {aggregateSentiments(messages).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend content={renderCustomizedLegend} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Chatter Analysis - taller */}
          <div
            className="bg-[#0c0c0f] shadow-md rounded-xl p-6 border border-gray-600 flex flex-col sentiment-topchatter-panel"
            style={{ height: '43%', maxHeight: 350 }}
          >
            <div className="flex items-center mb-2">
              <div className="flex flex-col w-full">
                <div className="flex items-center gap-4 w-full">
                  <h3 className="text-3xl font-bold">Top Chatter Analysis</h3>
                  <div className="flex-1" />
                  <div className="bg-[#23243a] rounded-full px-3 py-1 text-gray-400 font-semibold text-base shadow-sm flex items-center justify-center" style={{ minWidth: 60 }}>
                    {messages.length} messages
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4 rounded">
                  Users with most messages by sentiment
                </p>
              </div>
            </div>
            <div
              className="flex gap-4 h-full"
              style={{ overflow: 'hidden' }}
            >
              {['Positive', 'Neutral', 'Negative'].map((sentiment) => (
                <div
                  key={sentiment}
                  className="flex flex-col border border-gray-700 rounded-lg p-3"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    minWidth: 0,
                    ...scrollbarStyles,
                  }}
                >
                  <h4
                    className="text-xl font-semibold mb-3"
                    style={{ color: COLORS[sentiment] }}
                  >
                    {sentiment}
                  </h4>
                  {topChatters[sentiment].length === 0 && (
                    <p className="text-gray-500 text-sm">No data</p>
                  )}
                  {topChatters[sentiment].slice(0, 5).map(({ username, count }) => (
                    <div
                      key={username}
                      className="flex justify-between items-center mb-2 px-2 py-1 rounded cursor-default select-none hover:bg-gray-700"
                    >
                      <span className="truncate" title={username}>{username}</span>
                      <span
                        style={{
                          backgroundColor: COLORS[sentiment],
                          color: 'white',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: 14,
                          fontWeight: 'bold',
                          minWidth: 24,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div
          className="w-4/6 bg-[#1f1f23] shadow-md rounded-t-xl rounded-bl-xl ml-5 relative h-full flex flex-col border border-gray-600 sentiment-right-panel"
          style={{ ...scrollbarStyles }}
        >
          {/* Top row with filter buttons and status */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-gray-700 rounded-t-xl bg-[#0d0c0e]">
            {/* Filter buttons on left */}
            <div className="flex flex-wrap">
              {['All', 'Positive', 'Neutral', 'Negative'].map((type, i, arr) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-1 font-medium border border-gray-700 cursor-pointer
                    ${
                      filter === type
                        ? 'bg-[#6441A5] text-white border-[#6441A5]'
                        : 'bg-gray-700 text-gray-300 hover:bg-[#9146FF] hover:border-[#9146FF]'
                    }
                    ${
                      i === 0
                        ? 'rounded-l-md'
                        : i === arr.length - 1
                        ? 'rounded-r-md'
                        : ''
                    }
                    -ml-px first:ml-0 transition`}
                  style={{
                    fontSize: '1rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Connected status and disconnect button on right */}
            <div className="flex items-center space-x-4">
              <div className="text-white font-semibold whitespace-nowrap text-lg">
                Connected to <span style={{ color: '#a970ff' }}>{streamer || '...'}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md shadow-md transition"
                title="Disconnect from chat"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Chat messages */}
          <div
            className="space-y-4 overflow-y-auto shadow-inner p-3 bg-[#0e0e10] rounded-b-lg flex-grow"
            ref={chatContainerRef}
            onScroll={handleScroll}
            style={{ minHeight: 0, ...scrollbarStyles }}
          >
            {filteredMessages.map((msg, index) => {
              // If message is too long, split it into multiple lines
              const MAX_LENGTH = 120;
              let messageContent = msg.message;
              let messageLines = [];

              if (typeof messageContent === "string" && messageContent.length > MAX_LENGTH) {
                // Split at word boundaries, not in the middle of a word
                let words = messageContent.split(' ');
                let currentLine = '';
                for (let word of words) {
                  if ((currentLine + word).length > MAX_LENGTH) {
                    messageLines.push(currentLine.trim());
                    currentLine = '';
                  }
                  currentLine += word + ' ';
                }
                if (currentLine.trim().length > 0) {
                  messageLines.push(currentLine.trim());
                }
              } else {
                messageLines = [messageContent];
              }

              return (
                <div
                  key={index}
                  className={`p-4 rounded shadow-md bg-[#171726] border-l-4 w-full flex-shrink-0 ${
                    msg.sentiment === 'Positive'
                      ? 'border-green-500'
                      : msg.sentiment === 'Neutral'
                      ? 'border-yellow-500'
                      : 'border-red-500'
                  }`}
                >
                  <p className="text-white flex justify-between items-center">
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-pre-line break-words">
                      <strong style={{ color: '#a970ff' }}>{msg.username}:</strong>{" "}
                      {messageLines.map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i !== messageLines.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </span>
                    <span
                      className={`text-sm font-medium px-3 py-1 ml-4 rounded-full shadow-md ${
                        msg.sentiment === 'Positive'
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
              );
            })}
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
    </>
  );
}

export default SentimentStream;
