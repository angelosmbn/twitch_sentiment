import { jsPDF } from 'jspdf';

export const downloadPDF = (session, userId) => {
  if (!session) return;

  const doc = new jsPDF();
  const leftMargin = 20;
  const rightMargin = 190;
  const lineHeight = 8;
  const maxWidth = 170;
  let y = 20;

  const twitchPurple = [100, 65, 165];
  const lightGray = [245, 245, 245];

  const totalChats = session.total_chats ??
    Object.values(session.sentiment_counts || {}).reduce((acc, count) => acc + count, 0);

  const topChatters = session.top_chatters || {
    Positive: [],
    Neutral: [],
    Negative: []
  };

  const sentimentCounts = session.sentiment_counts || {};
  const sentimentPercentages = session.sentiment_percentages || {};

  const addLine = (text, size = 12, font = "normal", color = [0, 0, 0]) => {
    doc.setFont("helvetica", font);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, leftMargin, y);
    y += lineHeight;
    checkPageEnd();
  };

  const checkPageEnd = () => {
    const pageHeight = doc.internal.pageSize.height;
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const addSectionHeader = (title) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...twitchPurple);
    doc.text(title, leftMargin, y);
    y += 6;
    doc.setDrawColor(...twitchPurple);
    doc.line(leftMargin, y, rightMargin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...twitchPurple);
  doc.text("Twitch Chat Analysis Report", leftMargin, y);
  y += 14;

  doc.setDrawColor(...twitchPurple);
  doc.line(leftMargin, y, rightMargin, y);
  y += 6;

  doc.setTextColor(0, 0, 0);

  // Meta Information
  addLine(`Streamer: ${session.streamer_name}`, 12, "normal");
  addLine(`Date: ${new Date(session.date).toLocaleString()}`, 12, "normal");
  addLine(`Total Chat Messages: ${totalChats}`, 12, "normal");

  y += 6;

  addSectionHeader("Sentiment Breakdown");
  addLine(`Positive: ${sentimentCounts.positive ?? 0} (${sentimentPercentages.positive ?? 0}%)`);
  addLine(`Neutral:  ${sentimentCounts.neutral ?? 0} (${sentimentPercentages.neutral ?? 0}%)`);
  addLine(`Negative: ${sentimentCounts.negative ?? 0} (${sentimentPercentages.negative ?? 0}%)`);

  y += 6;

  addSectionHeader("AI Analysis Summary");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const summaryText = doc.splitTextToSize(session.summary || "No summary provided.", maxWidth);
  doc.text(summaryText, leftMargin, y);
  y += summaryText.length * lineHeight;
  y += 6;

  addSectionHeader("Top Chatter Analysis");

  const addChatterBox = (sentiment, chatters, color = [80, 80, 80]) => {
    if (chatters.length === 0) {
      addLine(`No ${sentiment} chatters found.`, 11, "normal");
      return;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(`${sentiment} Chatters:`, leftMargin, y);
    y += lineHeight;

    chatters.forEach((chatter, index) => {
      checkPageEnd();
      const line = `${index + 1}. ${chatter.username} - ${chatter.count} messages`;

      // Removed background color for each chatter line

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(line, leftMargin, y);
      y += lineHeight + 2;
    });

    y += 4;
  };

  addChatterBox("Positive", topChatters.Positive, [0, 150, 0]);
  addChatterBox("Neutral", topChatters.Neutral, [255, 215, 0]);
  addChatterBox("Negative", topChatters.Negative, [180, 0, 0]);

  // Footer Log
  fetch('http://localhost:8080/api/log/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, streamer_name: session.streamer_name }),
  })
    .then(res => res.json())
    .then(data => console.log('Logged PDF:', data))
    .catch(err => console.error('Logging error:', err));

  // Save
  doc.save(`${session.streamer_name}_chat_analysis.pdf`);
};
