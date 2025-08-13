import React, { useState } from "react";
import Swal from "sweetalert2";
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaUserFriends } from "react-icons/fa";

const CONTACT_EMAIL = "cortezfrancisemill@gmail.com";
const CONTACT_PHONE = "0992-837-5470 ";
const CONTACT_ADDRESS = "Cabambangan, Bacolor, Philippines";
const THESIS_GROUP = "Twitch Insights Sentiment Analysis";
const GROUP_INSTITUTION = "Pampanga State University";
const GROUP_MEMBERS = [
  "Cortez, Francis Emil M.",
  "Gaspan, Hyrum P.",
  "Gutierrez, Marvie M.",
  "Medrano, Vincent C.",
  "Pring, Christian Angelo M.",
  "Tadiaman, Justine S."
];
const WEB3FORMS_ACCESS_KEY = "db4e882c-25bb-4089-aff1-fe653c8d3440";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please fill in your name, email, and message.",
        background: "#1f1f2f",
        color: "#eee",
        confirmButtonColor: "#9146FF",
      });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address.",
        background: "#1f1f2f",
        color: "#eee",
        confirmButtonColor: "#9146FF",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSending(true);

    const data = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: form.subject || "Contact Inquiry",
      from_name: form.name,
      email: form.email,
      message: form.message,
    };

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setForm({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
        Swal.fire({
          icon: "success",
          title: "Message Sent!",
          text: "Your message has been sent successfully. We'll get back to you soon.",
          background: "#1f1f2f",
          color: "#eee",
          confirmButtonColor: "#9146FF",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed to Send",
          text: result.message || "There was an error sending your message. Please try again later.",
          background: "#1f1f2f",
          color: "#eee",
          confirmButtonColor: "#9146FF",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to Send",
        text: "There was an error sending your message. Please try again later.",
        background: "#1f1f2f",
        color: "#eee",
        confirmButtonColor: "#9146FF",
      });
    } finally {
      setSending(false);
    }
  };

  // Responsive container: always below nav, scrollable if needed, padding for all screens
  return (
    <div
      className="relative w-full min-h-[calc(100vh-72px)] pt-[88px] pb-8 px-2 md:px-6 lg:px-24 flex justify-center items-start font-sans"
      style={{ background: "transparent" }}
    >
      <div
        className="
          w-full
          max-w-6xl
          bg-[#0c0c0f]
          rounded-2xl
          shadow-2xl
          border border-gray-600
          flex flex-col
          md:flex-row
          overflow-hidden
        "
      >
        {/* Left Info Panel */}
        <div
          className="
            w-full
            md:w-1/2
            p-6
            md:p-8
            flex flex-col
            justify-center
            border-b
            md:border-b-0
            md:border-r
            border-[#9146FF]
            bg-[#0c0c0f]
          "
        >
          <div className="w-full flex flex-col mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#9146FF]">
              Contact Information
            </h2>
          </div>
          <div className="mb-4 md:mb-5 flex items-center text-gray-300 text-base sm:text-lg md:text-xl">
            <FaEnvelope className="mr-3 text-[#9146FF] text-xl sm:text-xl md:text-2xl" />
            <span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#9146FF] hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </span>
          </div>
          <div className="mb-4 md:mb-5 flex items-center text-gray-300 text-base sm:text-lg md:text-xl">
            <FaPhone className="mr-3 text-[#9146FF] text-xl sm:text-xl md:text-2xl" />
            <span>
              <a
                href={`tel:${CONTACT_PHONE.replace(/[^0-9+]/g, "")}`}
                className="hover:underline"
              >
                {CONTACT_PHONE}
              </a>
            </span>
          </div>
          <div className="mb-4 md:mb-5 flex items-center text-gray-300 text-base sm:text-lg md:text-xl">
            <FaMapMarkerAlt className="mr-3 text-[#9146FF] text-xl sm:text-xl md:text-2xl" />
            <span>{CONTACT_ADDRESS}</span>
          </div>
          {/* Institution - Twitch themed */}
          <div className="mb-4 md:mb-5 flex items-center text-gray-300 text-base sm:text-lg md:text-xl">
            <span className="mr-3">
              <svg width="24" height="24" viewBox="0 0 48 48" className="inline-block align-middle" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="#9146FF"/>
                <path d="M14 14V34H20V38L26 34H32V14H14Z" fill="#18181b"/>
                <path d="M20 20H28V22H20V20ZM20 24H28V26H20V24Z" fill="#9146FF"/>
              </svg>
            </span>
            <span className="font-semibold">
              Institution:{" "}
              <span className="font-normal">
                {GROUP_INSTITUTION}
              </span>
            </span>
          </div>
          <div className="mb-4 md:mb-5 flex items-center text-gray-300 text-base sm:text-lg md:text-xl">
            <FaUserFriends className="mr-3 text-[#9146FF] text-xl sm:text-xl md:text-2xl" />
            <span>
              <span className="font-semibold">Thesis Group: {THESIS_GROUP}</span>
            </span>
          </div>
          <div className="mb-2 text-gray-300 text-base sm:text-lg md:text-xl">
            <span className="font-semibold">Members:</span>
            <ul className="list-disc ml-6 mt-2 text-sm sm:text-base md:text-lg">
              {GROUP_MEMBERS.map((member, idx) => (
                <li key={idx} className="mb-1">{member}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Contact Form */}
        <div
          className="
            w-full
            md:w-1/2
            p-6
            md:p-8
            flex flex-col
            justify-center
            bg-[#0c0c0f]
          "
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#9146FF] mb-2 text-center">
            Contact Us
          </h2>
          <p className="text-gray-400 mb-6 md:mb-8 text-center text-sm sm:text-base">
            Have a question, suggestion, or feedback? Fill out the form and we'll get back to you!
          </p>
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 flex flex-col items-center w-full">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full justify-center">
              <div className="flex-1 max-w-full md:max-w-xs mx-auto">
                <label className="block text-gray-300 font-semibold mb-2 text-sm sm:text-base" htmlFor="name">
                  Name <span className="text-[#9146FF]">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-[#18181b] border border-[#9146FF] text-white focus:outline-none focus:ring-2 focus:ring-[#9146FF] transition text-sm sm:text-base"
                  placeholder="Your Name"
                  disabled={sending}
                  required
                />
              </div>
              <div className="flex-1 max-w-full md:max-w-xs mx-auto">
                <label className="block text-gray-300 font-semibold mb-2 text-sm sm:text-base" htmlFor="email">
                  Email <span className="text-[#9146FF]">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-[#18181b] border border-[#9146FF] text-white focus:outline-none focus:ring-2 focus:ring-[#9146FF] transition text-sm sm:text-base"
                  placeholder="you@email.com"
                  disabled={sending}
                  required
                />
              </div>
            </div>
            <div className="w-full max-w-full md:max-w-2xl mx-auto">
              <label className="block text-gray-300 font-semibold mb-2 text-sm sm:text-base" htmlFor="subject">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                id="subject"
                value={form.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-[#18181b] border border-[#9146FF] text-white focus:outline-none focus:ring-2 focus:ring-[#9146FF] transition text-sm sm:text-base"
                placeholder="Subject (optional)"
                disabled={sending}
              />
            </div>
            <div className="w-full max-w-full md:max-w-2xl mx-auto">
              <label className="block text-gray-300 font-semibold mb-2 text-sm sm:text-base" htmlFor="message">
                Message <span className="text-[#9146FF]">*</span>
              </label>
              <textarea
                name="message"
                id="message"
                value={form.message}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-[#18181b] border border-[#9146FF] text-white focus:outline-none focus:ring-2 focus:ring-[#9146FF] transition min-h-[100px] sm:min-h-[120px] resize-vertical text-sm sm:text-base"
                placeholder="Type your message here..."
                disabled={sending}
                required
              />
            </div>
            <div className="flex justify-center w-full">
              <button
                type="submit"
                disabled={sending}
                className={`px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-bold text-white bg-[#9146FF] hover:bg-[#6441A5] transition shadow-lg ${
                  sending ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
