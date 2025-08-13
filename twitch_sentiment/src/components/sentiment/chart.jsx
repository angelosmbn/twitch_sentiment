import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Responsive breakpoints (px)
const BREAKPOINTS = {
  large: 1024,
  medium: 768,
};

const COLORS = {
  Positive: '#4CAF50',  // green
  Neutral: '#FFC107',   // yellow
  Negative: '#F44336',  // red
};

// Helper to aggregate sentiments over time (assuming messages have timestamps)
function aggregateSentimentsOverTime(messages) {
  // Example: group messages by message index as x-axis
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

// Helper to aggregate total sentiment counts for PieChart
function aggregateSentimentTotals(messages) {
  const totals = { Positive: 0, Neutral: 0, Negative: 0 };
  messages.forEach((msg) => {
    if (msg.sentiment && totals.hasOwnProperty(msg.sentiment)) {
      totals[msg.sentiment]++;
    }
  });
  return [
    { name: 'Positive', value: totals.Positive },
    { name: 'Neutral', value: totals.Neutral },
    { name: 'Negative', value: totals.Negative },
  ];
}

// Responsive hook for screen size
function useResponsiveSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return "large";
    if (window.innerWidth < BREAKPOINTS.medium) return "small";
    if (window.innerWidth < BREAKPOINTS.large) return "medium";
    return "large";
  });

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < BREAKPOINTS.medium) setSize("small");
      else if (window.innerWidth < BREAKPOINTS.large) setSize("medium");
      else setSize("large");
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

function SentimentLineGraph({ messages }) {
  const [showPositive, setShowPositive] = useState(true);
  const [showNeutral, setShowNeutral] = useState(true);
  const [showNegative, setShowNegative] = useState(true);

  // Memoize data transformation
  const data = useMemo(() => aggregateSentimentsOverTime(messages), [messages]);
  const pieData = useMemo(() => aggregateSentimentTotals(messages), [messages]);

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

  // Responsive sizing
  const screenSize = useResponsiveSize();

  // Responsive styles
  let containerPadding, titleFontSize, checkboxGap, chartHeight, legendFontSize, checkboxFontSize;
  let pieChartSize, pieLabelFontSize, pieLegendFontSize, pieInnerRadius, pieOuterRadius, pieShowLabels;
  if (screenSize === "large") {
    containerPadding = 24;
    titleFontSize = 22;
    checkboxGap = 20;
    chartHeight = 320;
    legendFontSize = 18;
    checkboxFontSize = 16;
    pieChartSize = 220;
    pieLabelFontSize = 18;
    pieLegendFontSize = 18;
    pieInnerRadius = 60;
    pieOuterRadius = 100;
    pieShowLabels = true;
  } else if (screenSize === "medium") {
    containerPadding = 16;
    titleFontSize = 18;
    checkboxGap = 14;
    chartHeight = 220;
    legendFontSize = 15;
    checkboxFontSize = 14;
    pieChartSize = 150;
    pieLabelFontSize = 14;
    pieLegendFontSize = 15;
    pieInnerRadius = 40;
    pieOuterRadius = 70;
    pieShowLabels = true;
  } else {
    // small
    containerPadding = 10;
    titleFontSize = 16;
    checkboxGap = 8;
    chartHeight = 160;
    legendFontSize = 13;
    checkboxFontSize = 12;
    pieChartSize = 110;
    pieLabelFontSize = 11;
    pieLegendFontSize = 12;
    pieInnerRadius = 25;
    pieOuterRadius = 45;
    pieShowLabels = false; // hide labels on very small screens
  }

  // PieChart legend for below the chart
  function PieLegend({ data }) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginTop: 8,
        flexWrap: 'wrap',
      }}>
        {data.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 18,
              height: 18,
              backgroundColor: COLORS[entry.name],
              borderRadius: 3,
            }} />
            <span style={{ color: 'white', fontSize: pieLegendFontSize }}>{entry.name}</span>
          </div>
        ))}
      </div>
    );
  }

  // PieChart label renderer
  const renderPieLabel = ({ name, percent }) => {
    if (!pieShowLabels) return null;
    return (
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: pieLabelFontSize,
          fill: 'white',
          fontWeight: 600,
        }}
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#1f1f23',
        padding: containerPadding,
        borderRadius: 12,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: "'Inter', sans-serif",
        minWidth: 0,
      }}
    >
      {/* Responsive styles for blending with sentiment.jsx */}
      <style>
        {`
          @media (max-width: 1023px) {
            .sentiment-line-title { font-size: 18px !important; }
            .sentiment-line-checkbox label { font-size: 14px !important; }
          }
          @media (max-width: 767px) {
            .sentiment-line-title { font-size: 15px !important; }
            .sentiment-line-checkbox label { font-size: 12px !important; }
          }
        `}
      </style>
      <h3
        className="sentiment-line-title"
        style={{
          marginBottom: 12,
          fontWeight: 'bold',
          fontSize: titleFontSize,
          lineHeight: 1.2,
        }}
      >
        Sentiment Over Time
      </h3>

      {/* Responsive PieChart */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 18,
          width: '100%',
        }}
      >
        <ResponsiveContainer
          width={pieChartSize}
          height={pieChartSize}
          minWidth={pieChartSize}
          minHeight={pieChartSize}
        >
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={pieInnerRadius}
              outerRadius={pieOuterRadius}
              label={pieShowLabels ? renderPieLabel : false}
              labelLine={pieShowLabels}
              isAnimationActive={false}
            >
              {pieData.map((entry, idx) => (
                <Cell key={entry.name} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#2a2a2a',
                borderRadius: 8,
                border: 'none',
                color: 'white',
                fontSize: pieLabelFontSize,
              }}
              labelStyle={{ color: '#bbb' }}
              itemStyle={{ color: 'white' }}
              formatter={(value, name) => [`${value}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <PieLegend data={pieData} />
      </div>

      {/* Checkboxes */}
      <div
        className="sentiment-line-checkbox"
        style={{
          marginBottom: 12,
          display: 'flex',
          gap: checkboxGap,
          flexWrap: 'wrap',
        }}
      >
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
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: checkboxFontSize,
                fontWeight: 600,
                gap: 6,
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleCheckboxChange(sentiment)}
                style={{
                  marginRight: 6,
                  accentColor: COLORS[sentiment],
                  width: 16,
                  height: 16,
                }}
              />
              <span style={{ color: COLORS[sentiment], fontWeight: '600' }}>
                {sentiment}
              </span>
            </label>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: chartHeight, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={chartHeight}>
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
    </div>
  );
}

export default SentimentLineGraph;
