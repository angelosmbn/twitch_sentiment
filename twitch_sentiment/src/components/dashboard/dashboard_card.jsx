// components/DashboardCard.jsx
import React from 'react';

const DashboardCard = ({ title, value, icon }) => {
  return (
    <div className="bg-[#1f1f23] border border-[#2c2c32] rounded-lg shadow-md p-6 w-full sm:w-1/2 md:w-1/3 lg:w-1/4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-400 text-sm">{title}</h3>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="text-[#9146FF] text-3xl">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
