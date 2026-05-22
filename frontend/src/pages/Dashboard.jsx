import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CommitChart from '../components/CommitChart';
import PRAnalytics from '../components/PRAnalytics';
import IssueTracking from '../components/IssueTracking';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [commitData, setCommitData] = useState(null);
  const [prData, setPrData] = useState(null);
  const [issueData, setIssueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connectedRepos = user?.connectedRepos || [];

  useEffect(() => {
    if (connectedRepos.length > 0 && !selectedRepo) {
      setSelectedRepo(connectedRepos[0]);
    }
  }, [connectedRepos]);

  useEffect(() => {
    if (selectedRepo) {
      fetchDashboardData();
    }
  }, [selectedRepo]);

  const fetchDashboardData = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    setError('');

    const [owner, repo] = selectedRepo.repoFullName.split('/');

    try {
      const [commitRes, prRes, issueRes] = await Promise.all([
        api.get(`/analytics/commit-chart/${owner}/${repo}?days=30`),
        api.get(`/analytics/pr-analytics/${owner}/${repo}`),
        api.get(`/analytics/issue-tracking/${owner}/${repo}`)
      ]);

      setCommitData(commitRes.data);
      setPrData(prRes.data);
      setIssueData(issueRes.data);
    } catch (err) {
      setError('Failed to load dashboard data. Make sure GitHub is connected.');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.githubUsername) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl shadow-md p-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect GitHub to Get Started</h2>
          <p className="text-gray-600 mb-6">Link your GitHub account to see productivity analytics and AI insights.</p>
          <a href="/github" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            Connect GitHub
          </a>
        </div>
      </div>
    );
  }

  if (connectedRepos.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl shadow-md p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Repositories Tracked</h2>
          <p className="text-gray-600 mb-6">Connect a repository to start seeing analytics.</p>
          <a href="/github" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            Track a Repository
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Your development productivity at a glance</p>
        </div>
        <select
          value={selectedRepo?.repoFullName || ''}
          onChange={(e) => {
            const repo = connectedRepos.find(r => r.repoFullName === e.target.value);
            setSelectedRepo(repo);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        >
          {connectedRepos.map((repo) => (
            <option key={repo.repoFullName} value={repo.repoFullName}>
              {repo.repoFullName}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {commitData && prData && issueData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Commits</p>
                    <p className="text-3xl font-bold text-gray-900">{commitData.totalCommits}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Last {commitData.period.days} days</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pull Requests</p>
                    <p className="text-3xl font-bold text-gray-900">{prData.summary.total}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{prData.summary.merged} merged</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Open Issues</p>
                    <p className="text-3xl font-bold text-gray-900">{issueData.summary.open}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">of {issueData.summary.total} total</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Merge Time</p>
                    <p className="text-3xl font-bold text-gray-900">{prData.summary.avgMergeTimeHours}h</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">PR merge time</p>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {commitData && <CommitChart data={commitData} />}
            {prData && <PRAnalytics data={prData} />}
          </div>

          {issueData && <IssueTracking data={issueData} />}
        </>
      )}
    </div>
  );
};

export default Dashboard;
