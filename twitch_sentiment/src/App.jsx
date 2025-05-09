import SentimentStream from './components/sentiment/sentiment.jsx';
import "./index.css";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 overflow-y-hidden">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Twitch Insights</h1>
          <a
            href="https://www.twitch.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:text-gray-200 transition"
          >
            HOME
          </a>
          <a
            href="https://www.twitch.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:text-gray-200 transition"
          >
            ANALYZE
          </a>
          <a
            href="https://www.twitch.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:text-gray-200 transition"
          >
            ABOUT US
          </a>
          <a
            href="https://www.twitch.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:text-gray-200 transition"
          >
            SIGN IN / SIGN UP
          </a> 
        </div>
      </nav>

      {/* Main Content */}
      <SentimentStream />
    </div>
  );
}

export default App;
