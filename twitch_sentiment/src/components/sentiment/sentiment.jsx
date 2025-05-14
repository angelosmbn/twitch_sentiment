import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

function SentimentStream() {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107',
  };

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
  const [eventSource, setEventSource] = useState(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [streamer, setStreamer] = useState('');
  const [sessionId, setSessionId] = useState(null);

  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  const startStream = async () => {
    const response = await fetch('http://localhost:8080/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const newSessionId = uuidv4(); // 🆕 Generate new session ID
      setSessionId(newSessionId);

      const source = new EventSource('http://localhost:8080/api/sentiment/stream');
      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
        if (!streamer) {
          setStreamer(data.streamer);
        }
      };
      setEventSource(source);
      setStreamStarted(true);
    } else {
      alert('Failed to start stream. Check the Twitch URL.');
    }
  };

  const stopStream = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setStreamStarted(false);
  };

  const resumeStream = () => {
    const source = new EventSource('http://localhost:8080/api/sentiment/stream');
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
      if (!streamer) {
        setStreamer(data.streamer);
      }
    };
    setEventSource(source);
    setStreamStarted(true);
  };

  const saveChat = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert('No user is logged in. Please log in to save the chat.');
      return;
    }
    const userId = user.id;

    const payload = {
      streamer,
      sessionId,
      messages,
      userId, // Add user ID to the payload
    };

    const response = await fetch('http://localhost:8080/save-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert('Chat saved successfully!');
    } else {
      alert('Failed to save chat.');
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

  useEffect(() => {
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [eventSource]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAutoScroll(true);
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (isAutoScroll !== isAtBottom) {
      setIsAutoScroll(isAtBottom);
      setShowScrollButton(!isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="p-6 flex flex-row" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="flex flex-col w-1/2 h-full">
        <div className="bg-white shadow-lg rounded-xl p-6 mb-5" style={{ height: '30%' }}>
          <div className="flex flex-col gap-6 mb-8 items-center w-full h-full">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6 w-full text-center">Twitch Chat Analysis</h1>
            <input
              type="text"
              value={url}
              placeholder="Enter Twitch URL e.g. https://www.twitch.tv/arteezy"
              onChange={(e) => setUrl(e.target.value)}
              disabled={streamStarted}
              className="w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {!streamStarted && messages.length === 0 ? (
              <button
                onClick={startStream}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-102"
              >
                Run
              </button>
            ) : streamStarted ? (
              <button
                onClick={stopStream}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-red-700 transition-transform transform hover:scale-102"
              >
                Stop
              </button>
            ) : (
              <div className="flex flex-row gap-4 w-full">
                <button
                  onClick={resumeStream}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition"
                >
                  Resume
                </button>
                <button
                  onClick={saveChat}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-purple-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={resetStream}
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-gray-700 transition"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 flex-grow" style={{ minHeight: '65%' }}>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 text-center">
            Chat Sentiment Distribution (Total Chats: {messages.length})
          </h2>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={aggregateSentiments(messages)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={90}
                outerRadius={180}
                fill="#8884d8"
                label
              >
                {aggregateSentiments(messages).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                iconType="rect"
                layout="horizontal"
                align="center"
                wrapperStyle={{ fontSize: '20px', paddingTop: '20px' }}
                formatter={(value) => (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '50px',
                        height: '20px',
                        marginRight: '8px',
                        backgroundColor: COLORS[value] || '#888',
                      }}
                    />
                    <span style={{ color: '#333' }}>{value}</span>
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="w-1/2 bg-white shadow-lg rounded-xl p-6 ml-5 relative h-full">
        <div className="text-xl font-bold text-gray-900 mb-4 text-center">
          Currently Streaming: <span className="text-blue-600">{streamer}</span>
        </div>

        <div
          className="space-y-4 max-h-[750px] min-h-[750px] overflow-y-auto shadow-lg p-3 bg-gray-100 rounded-lg"
          ref={chatContainerRef}
          onScroll={handleScroll}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded shadow-lg bg-white border-l-4 ${
                msg.sentiment === 'Positive'
                  ? 'border-green-500'
                  : msg.sentiment === 'Neutral'
                  ? 'border-yellow-500'
                  : 'border-red-500'
              }`}
            >
              <p className="text-gray-700 flex justify-between items-center">
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  <strong>{msg.username}:</strong> {msg.message}
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
          <div ref={chatEndRef} />
        </div>

        {showScrollButton && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={scrollToBottom}
              className="bg-blue-600 bg-opacity-50 text-white px-4 py-2 rounded-full shadow-md hover:bg-blue-700 transition"
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
