// pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import DashboardCard from './dashboard_card';
import { FaUsers, FaUserCheck, FaComments, FaChartLine } from 'react-icons/fa';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalComments: 0,
    totalUsage: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/dashboard/summary');
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="">
      <h2 className="text-4xl font-black text-[#9146FF] mb-8">Dashboard Overview</h2>

      <div className="flex flex-wrap gap-6">
        <DashboardCard title="Total Users" value={stats.totalUsers} icon={<FaUsers />} />
        <DashboardCard title="Active Users" value={stats.activeUsers} icon={<FaUserCheck />} />
        <DashboardCard title="Total Comments" value={stats.totalComments} icon={<FaComments />} />
        <DashboardCard title="Total Usage" value={stats.totalUsage} icon={<FaChartLine />} />
      </div>
    </div>
  );
};

export default Dashboard;
