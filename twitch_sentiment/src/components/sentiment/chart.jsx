import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = {
  Positive: '#4CAF50',  // green
  Neutral: '#FFC107',   // yellow
  Negative: '#F44336',  // red
};

// Helper to aggregate sentiments over time (assuming messages have timestamps)
function aggregateSentimentsOverTime(messages) {
  // Example: group messages by minute (or any time unit), count sentiments per group
  // For demo, group by message index as x-axis

  const data = [];
  messages.forEach((msg, i) => {
    data.push({
      index: i,
      Positive: 0,
      Neutral: 0,
      Negative: 0,
      ...((msg.sentiment && { [msg.sentiment]: 1 }) || {}),
    });
  });

  // Transform to cumulative counts by sentiment
  let cum = { Positive: 0, Neutral: 0, Negative: 0 };
  return data.map((entry) => {
    cum.Positive += entry.Positive || 0;
    cum.Neutral += entry.Neutral || 0;
    cum.Negative += entry.Negative || 0;
    return {
      index: entry.index,
      Positive: cum.Positive,
      Neutral: cum.Neutral,
      Negative: cum.Negative,
    };
  });
}

function SentimentLineGraph({ messages }) {
  const [showPositive, setShowPositive] = useState(true);
  const [showNeutral, setShowNeutral] = useState(true);
  const [showNegative, setShowNegative] = useState(true);

  // Memoize data transformation
  const data = useMemo(() => aggregateSentimentsOverTime(messages), [messages]);

  const handleCheckboxChange = (sentiment) => {
    if (sentiment === 'Positive') setShowPositive(prev => !prev);
    else if (sentiment === 'Neutral') setShowNeutral(prev => !prev);
    else if (sentiment === 'Negative') setShowNegative(prev => !prev);
  };

  const legendPayload = [
    { value: 'Positive', color: COLORS.Positive, type: 'line', id: 'Positive' },
    { value: 'Neutral', color: COLORS.Neutral, type: 'line', id: 'Neutral' },
    { value: 'Negative', color: COLORS.Negative, type: 'line', id: 'Negative' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#1f1f23',
        padding: 16,
        borderRadius: 12,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <h3 style={{ marginBottom: 12, fontWeight: 'bold', fontSize: 22 }}>
        Sentiment Over Time
      </h3>

      {/* Checkboxes */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
        {['Positive', 'Neutral', 'Negative'].map((sentiment) => {
          const isChecked =
            sentiment === 'Positive'
              ? showPositive
              : sentiment === 'Neutral'
              ? showNeutral
              : showNegative;
          return (
            <label
              key={sentiment}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleCheckboxChange(sentiment)}
                style={{ marginRight: 8 }}
              />
              <span style={{ color: COLORS[sentiment], fontWeight: '600' }}>
                {sentiment}
              </span>
            </label>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid stroke="#333" strokeDasharray="3 3" />
          <XAxis
            dataKey="index"
            stroke="#aaa"
            tick={{ fontSize: 12 }}
            label={{ value: 'Message Index', position: 'insideBottomRight', offset: -5, fill: '#aaa' }}
          />
          <YAxis
            stroke="#aaa"
            tick={{ fontSize: 12 }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#aaa' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#2a2a2a', borderRadius: 8, border: 'none' }}
            labelStyle={{ color: '#bbb' }}
            itemStyle={{ color: 'white' }}
          />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ color: 'white', fontWeight: '600', userSelect: 'none' }}
            payload={legendPayload}
          />

          {showPositive && (
            <Line
              type="monotone"
              dataKey="Positive"
              stroke={COLORS.Positive}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          {showNeutral && (
            <Line
              type="monotone"
              dataKey="Neutral"
              stroke={COLORS.Neutral}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          {showNegative && (
            <Line
              type="monotone"
              dataKey="Negative"
              stroke={COLORS.Negative}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SentimentLineGraph;
