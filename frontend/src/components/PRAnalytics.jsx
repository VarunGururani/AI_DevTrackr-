import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

const PRAnalytics = ({ data }) => {
  const { summary, monthlyData, recentPRs } = data;

  const pieData = [
    { name: 'Merged', value: summary.merged },
    { name: 'Open', value: summary.open },
    { name: 'Closed', value: summary.closed - summary.merged }
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pull Request Analytics</h3>
          <p className="text-sm text-gray-500">{summary.total} total PRs</p>
        </div>
      </div>

      {/* PR Status Pie Chart */}
      <div className="flex items-center gap-6 mb-6">
        <div className="h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">Merged: {summary.merged}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Open: {summary.open}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">Closed: {summary.closed - summary.merged}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-sm text-gray-500">Avg merge: {summary.avgMergeTimeHours}h</span>
          </div>
        </div>
      </div>

      {/* Monthly PR Trend */}
      {monthlyData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Trend</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(val) => val.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="opened" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="merged" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRAnalytics;
