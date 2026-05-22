import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const LABEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const IssueTracking = ({ data }) => {
  const { summary, labelData, monthlyData, recentIssues } = data;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Issue Tracking</h3>
          <p className="text-sm text-gray-500">{summary.total} total issues - Avg resolution: {summary.avgResolutionDays} days</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            {summary.closed} closed
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            {summary.open} open
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Issue Trend */}
        {monthlyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Trend</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(val) => val.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="opened" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="closed" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Labels Distribution */}
        {labelData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">By Label</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={labelData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="count"
                    nameKey="label"
                    label={({ label, count }) => `${label}: ${count}`}
                    labelLine={false}
                  >
                    {labelData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LABEL_COLORS[index % LABEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent Issues Table */}
      {recentIssues.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Issues</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Title</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Labels</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Author</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.slice(0, 5).map((issue) => (
                  <tr key={issue.number} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500">#{issue.number}</td>
                    <td className="py-2 px-3 text-gray-900 font-medium truncate max-w-xs">{issue.title}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        issue.state === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {issue.state}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.slice(0, 2).map(label => (
                          <span key={label} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-500">{issue.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueTracking;
