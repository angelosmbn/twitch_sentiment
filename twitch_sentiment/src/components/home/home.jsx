import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: "Real-time Analysis",
    description:
      "Monitor chat sentiment and trends as they happen, helping you make quick decisions.",
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1l-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Sentiment Tracking",
    description:
      "Understand the emotional tone of your chat with advanced sentiment analysis.",
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Historical Data",
    description:
      "Access past chat analytics to identify patterns and improve engagement.",
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-twitch-dark">
      {/* Hero Section */}
      <section className="relative py-25 px-6">
        <div className="max-w-7xl mx-auto">
          <header className="text-center pt-10 pb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Understand Your{" "}
              <span className="text-[#9146FF]">Twitch Chat</span> Better
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Real-time sentiment analysis and chat insights to help streamers and
              moderators make data-driven decisions.
            </p>
            <div className="flex justify-center gap-4 mt-10">
              <Link
                to="/analyze"
                className="px-6 py-3 bg-[#9146FF] hover:bg-[#a970ff] text-white font-medium rounded transition-colors"
              >
                Start Analyzing
              </Link>
            </div>
          </header>

          {/* Feature Cards */}
          <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="p-6 rounded border border-twitch-hover flex flex-col items-center text-center transition-colors duration-200"
              >
                <div className="mb-4 p-4 rounded-full bg-twitch-purple bg-opacity-10">
                  {/* Clone the icon and set stroke color to #9146FF */}
                  {React.cloneElement(feature.icon, { stroke: "#9146FF" })}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
};

export default Home;