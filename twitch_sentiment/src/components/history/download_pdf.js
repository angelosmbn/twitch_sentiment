import { jsPDF } from 'jspdf';

export const downloadPDF = (session, userId) => {
  if (!session) return;

  const topChatters = session.top_chatters || { Positive: [], Neutral: [], Negative: [] };
  const totalChats = session.total_chats ?? Object.values(session.sentiment_counts || {}).reduce((acc, count) => acc + count, 0);

  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Chat Analysis History", 20, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Streamer: ${session.streamer_name}`, 20, 30);
  doc.text(`Date: ${new Date(session.date).toLocaleString()}`, 20, 40);
  doc.text(`Total Chats: ${totalChats}`, 20, 50);

  doc.setFontSize(14).setFont("helvetica", "bold").text("Sentiment Breakdown:", 20, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`Positive: ${session.sentiment_counts.positive} (${session.sentiment_percentages.positive}%)`, 20, 70);
  doc.text(`Neutral: ${session.sentiment_counts.neutral} (${session.sentiment_percentages.neutral}%)`, 20, 80);
  doc.text(`Negative: ${session.sentiment_counts.negative} (${session.sentiment_percentages.negative}%)`, 20, 90);

  doc.setFontSize(14).setFont("helvetica", "bold").text("AI Analysis Summary:", 20, 100);
  doc.setFont("helvetica", "normal");

  let summaryText = session.summary;
  let currentY = 110;
  const pageHeight = doc.internal.pageSize.height;

  let summaryLines = doc.splitTextToSize(summaryText, 180);
  doc.text(summaryLines, 20, currentY);
  currentY += summaryLines.length * 10;
  if (currentY > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14).setFont("helvetica", "bold").text("Top Chatter Analysis:", 20, currentY);
  currentY += 10;

  const addChatters = (chatters, sentiment) => {
    if (chatters.length > 0) {
      doc.setFont("helvetica", "bold").text(sentiment, 20, currentY);
      currentY += 10;
      chatters.forEach((chatter, index) => {
        if (currentY > pageHeight - 10) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont("helvetica", "normal");
        const messageCount = chatter.count ?? 0;
        doc.text(`${index + 1}. ${chatter.username} - ${messageCount} messages`, 20, currentY);
        currentY += 10;
      });
    } else {
      doc.setFont("helvetica", "normal").text(`No ${sentiment} Top Chatters available.`, 20, currentY);
      currentY += 10;
    }
  };

  addChatters(topChatters.Positive, "Positive");
  addChatters(topChatters.Neutral, "Neutral");
  addChatters(topChatters.Negative, "Negative");

  fetch('http://localhost:8080/api/log/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, streamer_name: session.streamer_name }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to log PDF generation');
      return res.json();
    })
    .then(data => console.log('Logged PDF:', data))
    .catch(err => console.error('Logging error:', err));

  doc.save(`${session.streamer_name}_chat_analysis.pdf`);
};