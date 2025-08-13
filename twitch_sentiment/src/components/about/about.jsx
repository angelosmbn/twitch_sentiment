import React from 'react';
import { Link } from 'react-router-dom';
import cortezImg from '../../assets/img/Cortez, Francis Emil M..jpg';
import gaspanImg from '../../assets/img/Gaspan, Hyrum.jpg';
import gutierrezImg from '../../assets/img/Gutierrez, Marvie M..jpg';
import pringImg from '../../assets/img/Pring, Christian Angelo M..jpg';
import medranoImg from '../../assets/img/Medrano, Vincent C..jpg';
import tadiamanImg from '../../assets/img/Tadiaman, Justine S..jpg';

const TWITCH_PURPLE = "#9146FF";

const About = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative py-3 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center pt-6 pb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-4" style={{ color: "#fff" }}>
              About <span style={{ color: TWITCH_PURPLE }}>Twitch Insight</span>
            </h1>
            <p className="text-xl mb-6 max-w-3xl mx-auto" style={{ color: "#d1d5db" }}>
              Our mission is to empower streamers with powerful tools to understand their 
              community better and enhance viewer engagement.
            </p>
          </div>

          {/* About Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 mb-12">
            {/* Left Column */}
            <div>
              <div className="p-4 rounded border mb-6" style={{ borderColor: "#374151" }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>Our Story</h2>
                <p className="mb-4" style={{ color: "#d1d5db" }}>
                  The researchers are third-year Information Technology students who developed Twitch Insight 
                  as their capstone project, aiming to enhance the streaming experience on Twitch.
                </p>
                <p style={{ color: "#d1d5db" }}>
                  This project focuses on helping streamers better understand their audience's reactions 
                  through real-time chat analysis, enabling them to create more engaging content and build 
                  stronger communities.
                </p>
              </div>

              <div className="p-4 rounded border" style={{ borderColor: "#374151" }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>Technology Used</h2>
                <p className="mb-4" style={{ color: "#d1d5db" }}>
                  The researchers developed a platform that integrates the Twitch API to fetch real-time chat messages 
                  and employs RoBERTa, a state-of-the-art natural language model, for accurate sentiment analysis.
                  Additionally, Google's Gemini API is utilized to generate comprehensive text summaries of the analyzed data.
                </p>
                <p style={{ color: "#d1d5db" }}>
                  This research implementation provides streamers with reliable, instant insights into their 
                  chat's emotional tone, engagement levels, and meaningful summaries of chat interactions.
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div
                className="p-4 rounded border flex flex-col justify-between"
                style={{
                  borderColor: "#374151",
                  height: "100%",
                  minHeight: "100%",
                }}
              >
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>Researchers</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 overflow-hidden"
                      style={{ backgroundColor: TWITCH_PURPLE }}
                    >
                      {cortezImg ? (
                        <img src={cortezImg} alt="Francis Emil M. Cortez" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>C</span>
                      )}
                    </div>
                    <p className="font-medium" style={{ color: "#fff" }}>Cortez, Francis Emil M.</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 overflow-hidden"
                      style={{ backgroundColor: TWITCH_PURPLE }}
                    >
                      {gaspanImg ? (
                        <img src={gaspanImg} alt="Hyrum P. Gaspan" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>H</span>
                      )}
                    </div>
                    <p className="font-medium" style={{ color: "#fff" }}>Gaspan, Hyrum P.</p>
                  </div>
                  <div className="text-center mt-4">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 overflow-hidden"
                      style={{ backgroundColor: TWITCH_PURPLE }}
                    >
                      {gutierrezImg ? (
                        <img src={gutierrezImg} alt="Marvie M. Gutierrez" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>M</span>
                      )}
                    </div>
                    <p className="font-medium" style={{ color: "#fff" }}>Gutierrez, Marvie M.</p>
                  </div>
                  <div className="text-center mt-4">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 overflow-hidden"
                      style={{ backgroundColor: TWITCH_PURPLE }}
                    >
                      {medranoImg ? (
                        <img src={medranoImg} alt="Vincent C. Medrano" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>V</span>
                      )}
                    </div>
                    <p className="font-medium" style={{ color: "#fff" }}>Medrano, Vincent C.</p>
                  </div>
                  <div className="text-center mt-4">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 overflow-hidden"
                      style={{ backgroundColor: TWITCH_PURPLE }}
                    >
                      {pringImg ? (
                        <img src={pringImg} alt="Christian Angelo M. Pring" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>C</span>
                      )}
                    </div>
                    <p className="font-medium" style={{ color: "#fff" }}>Pring, Christian Angelo M.</p>
                  </div>
                  <div className="text-center mt-4">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 overflow-hidden"
                      style={{ backgroundColor: TWITCH_PURPLE }}
                    >
                      {tadiamanImg ? (
                        <img src={tadiamanImg} alt="Justine S. Tadiaman" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>J</span>
                      )}
                    </div>
                    <p className="font-medium" style={{ color: "#fff" }}>Tadiaman, Justine S.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About; 