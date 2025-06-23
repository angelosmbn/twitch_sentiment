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

function SentimentStream() {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107',
  };

  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
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
    });

    return categorized;
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

  const [filter, setFilter] = useState('All');

  const reconnectRef = useRef({ attempts: 0, max: 5 });
  const chatContainerRef = useRef(null);

  usePrompt(
    'The stream is running. Are you sure you want to leave and stop streaming?',
    streamStarted
  );

  const setupSSE = async () => {
    console.log('setupSSE: Function called');
  
    // Check if the user is offline
    if (!navigator.onLine) {
      console.log('setupSSE: Offline detected');
      
      // Show "Reconnecting..." message in the UI
      setIsConnecting(true);  // This will trigger UI update for "Reconnecting..."
  
      // Periodically check if the user is back online
      const checkOnline = () => {
        if (navigator.onLine) {
          console.log('setupSSE: Back online, retrying setupSSE');
          clearInterval(onlineCheckInterval); // Clear the interval once online
          setupSSE(); // Retry SSE setup
        }
      };
  
      // Start checking every 3 seconds if the user is online
      const onlineCheckInterval = setInterval(checkOnline, 3000);
      return;
    }
  
    console.log('setupSSE: Online, setting up SSE');
  
    // Hide the "Reconnecting..." message once we're back online
    setIsConnecting(false);  // This will stop showing the "Reconnecting..." UI
  
    const source = new EventSource('http://localhost:8080/api/sentiment/stream');
  
    source.onopen = () => {
      console.log('setupSSE: SSE connection opened');
    };
  
    source.onmessage = async (event) => {
      console.log('setupSSE: Message received');
      try {
        const data = JSON.parse(event.data);
  
        if (data?.status === 'reconnected') {
          console.log('setupSSE: Reconnected status received');
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
          return; // Stop further execution after successful reconnection
        }
  
        if (data?.error === 'No internet connection') {
          console.log('setupSSE: No internet connection error received');
          source.close();
  
          // Set the reconnecting message in the UI
          setIsConnecting(true); // This will show the "Reconnecting..." message
  
          // Try reconnecting again after a short delay
          setTimeout(() => {
            setupSSE();
          }, 3000); // Retry after 3 seconds
          return;
        }
  
        if (!data.message || !data.message.trim()) {
          console.log('setupSSE: Empty message received, ignoring');
          return;
        }
  
        console.log('setupSSE: Valid message received, updating state');
        reconnectRef.current.attempts = 0;
        setMessages((prev) => [...prev, data]);
        if (!streamer) setStreamer(data.streamer);
        if (!streamStarted) {
          setIsConnecting(false);
          setStreamStarted(true);
        }
      } catch (e) {
        console.error('setupSSE: Invalid SSE message:', event.data);
      }
    };
  
    source.onerror = async () => {
      console.error('setupSSE: SSE connection error');
      source.close();
      reconnectRef.current.attempts++;
      console.log(`setupSSE: SSE connection error. Attempting to reconnect: ${reconnectRef.current.attempts} time(s)`);
  
      if (reconnectRef.current.attempts < reconnectRef.current.max) {
        setTimeout(setupSSE, 1000 * reconnectRef.current.attempts); // Retry after some time
      } else {
        setIsConnecting(false); // Hide "Reconnecting..." message
        console.log('setupSSE: Failed to reconnect, will continue trying');
      }
    };
  
    setEventSource(source);
    console.log('setupSSE: EventSource set');
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

  const startStream = async () => {
    setIsConnecting(true);

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
      if (saved) stopStream();
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

  // Filtered messages based on selected filter
  const filteredMessages = messages.filter((msg) => {
    if (filter === 'All') return true;
    return msg.sentiment === filter;
  });

  const topChatters = getTopChattersBySentiment(messages);

  if (!streamStarted && !isConnecting) {
    return (
      <div className="flex justify-center items-center" style={{ height: 'calc(100vh - 70px)', backgroundColor: '#0a0a0d' }}>
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

  // Purple scrollbar styles for Firefox (inline)
  const scrollbarStyles = {
    scrollbarWidth: 'thin',
    scrollbarColor: '#6441A5 #1f1f23',
  };

  return (
    <div
      className="p-6 px-10 flex flex-row bg-[#0a0a0d] text-white font-sans"
      style={{ height: 'calc(100vh - 70px)' }}
    >
      {/* Left panel */}
      <div className="flex flex-col w-2/6 h-full gap-6">
        {/* Sentiment Analysis panel - slightly smaller */}
        <div
          className="bg-[#0c0c0f] shadow-md rounded-xl p-6 pb-0 border border-gray-600 flex flex-col"
          style={{ height: '57%' }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-3xl font-bold">Sentiment Analysis</h3>
            <div className="text-gray-400 font-semibold text-lg">
              Total Messages: {messages.length}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4 rounded">
            Real-time sentiment breakdown of chat messages
          </p>
          <div
            style={{ position: 'relative', width: '100%', height: 'calc(100% - 100px)' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregateSentiments(messages)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  fill="#8884d8"
                  label
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
          className="bg-[#0c0c0f] shadow-md rounded-xl p-6 border border-gray-600 flex flex-col"
          style={{ height: '43%' }}
        >
          <h3 className="text-3xl font-bold mb-2">Top Chatter Analysis</h3>
          <p className="text-sm text-gray-500 mb-4 rounded">
            Users with most messages by sentiment
          </p>
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
                {topChatters[sentiment].map(({ username, count }) => (
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
        className="w-4/6 bg-[#1f1f23] shadow-md rounded-t-xl rounded-bl-xl ml-5 relative h-full flex flex-col border border-gray-600"
        style={{ ...scrollbarStyles }}
      >
        {/* Top row with filter buttons and status */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-700 rounded-t-xl bg-[#0d0c0e]">
          {/* Filter buttons on left */}
          <div className="flex">
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

          {filteredMessages.map((msg, index) => (
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
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  <strong style={{ color: '#a970ff' }}>{msg.username}:</strong> {msg.message}
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
