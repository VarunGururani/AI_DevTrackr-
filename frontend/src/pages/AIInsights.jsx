import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AIInsights = () => {
  const { user } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [sprintAnalysis, setSprintAnalysis] = useState(null);
  const [prioritization, setPrioritization] = useState(null);
  const [bottlenecks, setBottlenecks] = useState(null);
  const [commitSummary, setCommitSummary] = useState(null);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState('');

  const connectedRepos = user?.connectedRepos || [];

  useEffect(() => {
    if (connectedRepos.length > 0 && !selectedRepo) {
      setSelectedRepo(connectedRepos[0]);
    }
  }, [connectedRepos]);

  const getRepoParts = () => {
    if (!selectedRepo) return null;
    const [owner, repo] = selectedRepo.repoFullName.split('/');
    return { owner, repo };
  };

  const fetchSprintAnalysis = async () => {
    const parts = getRepoParts();
    if (!parts) return;
    setLoading(prev => ({ ...prev, sprint: true }));
    try {
      const res = await api.post('/ai/sprint-analysis', { ...parts, sprintDays: 14 });
      setSprintAnalysis(res.data);
    } catch (err) {
      setError('Failed to fetch sprint analysis');
    } finally {
      setLoading(prev => ({ ...prev, sprint: false }));
    }
  };

  const fetchPrioritization = async () => {
    const parts = getRepoParts();
    if (!parts) return;
    setLoading(prev => ({ ...prev, priority: true }));
    try {
      const res = await api.post('/ai/recommendations/prioritize', parts);
      setPrioritization(res.data);
    } catch (err) {
      setError('Failed to fetch prioritization');
    } finally {
      setLoading(prev => ({ ...prev, priority: false }));
    }
  };

  const fetchBottlenecks = async () => {
    const parts = getRepoParts();
    if (!parts) return;
    setLoading(prev => ({ ...prev, bottleneck: true }));
    try {
      const res = await api.post('/ai/recommendations/bottlenecks', parts);
      setBottlenecks(res.data);
    } catch (err) {
      setError('Failed to fetch bottleneck analysis');
    } finally {
      setLoading(prev => ({ ...prev, bottleneck: false }));
    }
  };

  const fetchCommitSummary = async () => {
    const parts = getRepoParts();
    if (!parts) return;
    setLoading(prev => ({ ...prev, commits: true }));
    try {
      const res = await api.post('/ai/summarize-commits', parts);
      setCommitSummary(res.data);
    } catch (err) {
      setError('Failed to fetch commit summary');
    } finally {
      setLoading(prev => ({ ...prev, commits: false }));
    }
  };

  const fetchAll = () => {
    setError('');
    fetchSprintAnalysis();
    fetchPrioritization();
    fetchBottlenecks();
    fetchCommitSummary();
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      repository: selectedRepo?.repoFullName,
      sprintAnalysis,
      prioritization,
      bottlenecks,
      commitSummary
    };

    const content = generateReportContent(report);
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devtrackr-report-${selectedRepo?.repoName}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReportContent = (report) => {
    return `<!DOCTYPE html>
<html><head><title>DevTrackr Report - ${report.repository}</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}
h1{color:#1e40af;border-bottom:2px solid #3b82f6;padding-bottom:10px}
h2{color:#374151;margin-top:30px}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0}
.metric{display:inline-block;margin:8px 16px 8px 0;padding:8px 12px;background:#dbeafe;border-radius:6px}
.severity-critical{color:#dc2626;font-weight:bold}
.severity-high{color:#f59e0b;font-weight:bold}
.severity-medium{color:#3b82f6}
</style></head><body>
<h1>DevTrackr Productivity Report</h1>
<p><strong>Repository:</strong> ${report.repository}</p>
<p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>

${report.commitSummary ? `
<h2>Commit Summary</h2>
<div class="card">
<p><strong>Total Commits Analyzed:</strong> ${report.commitSummary.commitCount}</p>
<p>${report.commitSummary.summary}</p>
</div>` : ''}

${report.sprintAnalysis ? `
<h2>Sprint Analysis</h2>
<div class="card">
<div class="metric">Commits: ${report.sprintAnalysis.metrics?.totalCommits || 0}</div>
<div class="metric">Daily Rate: ${report.sprintAnalysis.metrics?.dailyCommitRate || 0}/day</div>
<div class="metric">PRs Merged: ${report.sprintAnalysis.metrics?.pullRequests?.merged || 0}/${report.sprintAnalysis.metrics?.pullRequests?.total || 0}</div>
<div class="metric">Issues Closed: ${report.sprintAnalysis.metrics?.issues?.closed || 0}/${report.sprintAnalysis.metrics?.issues?.total || 0}</div>
<div class="metric">Health Score: ${report.sprintAnalysis.healthScore || 0}/100</div>
<p>${report.sprintAnalysis.aiSummary || ''}</p>
</div>` : ''}

${report.bottlenecks ? `
<h2>Bottleneck Analysis</h2>
<div class="card">
<p><strong>Overall Health:</strong> ${report.bottlenecks.overallHealth}</p>
${report.bottlenecks.bottlenecks?.map(b => `
<div class="card">
<p class="severity-${b.severity}"><strong>${b.title}</strong> (${b.severity})</p>
<p>${b.description}</p>
${b.suggestion ? `<p><em>Suggestion: ${b.suggestion}</em></p>` : ''}
</div>`).join('') || '<p>No bottlenecks detected!</p>'}
${report.bottlenecks.aiSummary ? `<p><strong>AI Summary:</strong> ${report.bottlenecks.aiSummary}</p>` : ''}
</div>` : ''}

${report.prioritization ? `
<h2>Task Prioritization</h2>
<div class="card">
<p><strong>Open Issues:</strong> ${report.prioritization.issues?.total || 0} (${report.prioritization.issues?.critical || 0} critical, ${report.prioritization.issues?.high || 0} high)</p>
${report.prioritization.recommendation ? `<p><strong>AI Recommendation:</strong> ${report.prioritization.recommendation}</p>` : ''}
</div>` : ''}

<hr><p><em>Generated by DevTrackr - AI Developer Productivity Dashboard</em></p>
</body></html>`;
  };

  if (!user?.githubUsername || connectedRepos.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl shadow-md p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect a Repository First</h2>
          <p className="text-gray-600 mb-6">AI insights require a connected GitHub repository.</p>
          <a href="/github" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            Connect GitHub
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
          <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-gray-600 mt-1">AI-powered productivity analysis and recommendations</p>
        </div>
        <div className="flex items-center space-x-4">
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
          <button
            onClick={fetchAll}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Analyze
          </button>
          {(sprintAnalysis || prioritization || bottlenecks) && (
            <button
              onClick={exportReport}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sprint Analysis */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sprint Analysis</h3>
            {loading.sprint && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>}
          </div>
          {sprintAnalysis ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Commits</p>
                  <p className="text-xl font-bold text-blue-900">{sprintAnalysis.metrics.totalCommits}</p>
                  <p className="text-xs text-blue-500">{sprintAnalysis.metrics.dailyCommitRate}/day</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600">Health Score</p>
                  <p className="text-xl font-bold text-green-900">{sprintAnalysis.healthScore}/100</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600">PRs Merged</p>
                  <p className="text-xl font-bold text-purple-900">
                    {sprintAnalysis.metrics.pullRequests.merged}/{sprintAnalysis.metrics.pullRequests.total}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-yellow-600">Issues Closed</p>
                  <p className="text-xl font-bold text-yellow-900">
                    {sprintAnalysis.metrics.issues.completionRate}%
                  </p>
                </div>
              </div>
              {sprintAnalysis.aiSummary && (
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary-500">
                  <p className="text-sm text-gray-700">{sprintAnalysis.aiSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Analyze" to generate sprint insights</p>
          )}
        </div>

        {/* Commit Summary */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Commit Summary</h3>
            {loading.commits && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>}
          </div>
          {commitSummary ? (
            <div>
              <div className="mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {commitSummary.commitCount} commits analyzed
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-700 whitespace-pre-line">{commitSummary.summary}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Analyze" to summarize recent commits</p>
          )}
        </div>

        {/* Bottleneck Detection */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bottleneck Detection</h3>
            {loading.bottleneck && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>}
          </div>
          {bottlenecks ? (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bottlenecks.overallHealth === 'healthy' ? 'bg-green-100 text-green-700' :
                  bottlenecks.overallHealth === 'critical' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {bottlenecks.overallHealth}
                </span>
                <span className="text-sm text-gray-500">{bottlenecks.totalBottlenecks} issues found</span>
              </div>
              <div className="space-y-3">
                {bottlenecks.bottlenecks.map((b, i) => (
                  <div key={i} className={`p-3 rounded-lg border-l-4 ${
                    b.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    b.severity === 'high' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{b.description}</p>
                    {b.suggestion && <p className="text-xs text-gray-500 mt-1 italic">{b.suggestion}</p>}
                  </div>
                ))}
                {bottlenecks.bottlenecks.length === 0 && (
                  <p className="text-green-600 text-sm">No bottlenecks detected! Workflow is healthy.</p>
                )}
              </div>
              {bottlenecks.aiSummary && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 border-l-4 border-orange-500">
                  <p className="text-sm text-gray-700">{bottlenecks.aiSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Analyze" to detect workflow bottlenecks</p>
          )}
        </div>

        {/* Task Prioritization */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Prioritization</h3>
            {loading.priority && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>}
          </div>
          {prioritization ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                  {prioritization.issues.critical} critical
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                  {prioritization.issues.high} high
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {prioritization.issues.medium} medium
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {prioritization.issues.low} low
                </span>
              </div>

              {prioritization.issues.prioritized.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h4 className="text-xs font-medium text-gray-600 uppercase">Top Priority Issues</h4>
                  {prioritization.issues.prioritized.slice(0, 5).map((issue) => (
                    <div key={issue.number} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 truncate">#{issue.number} {issue.title}</p>
                        <p className="text-xs text-gray-500">{issue.ageInDays} days old</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        issue.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        issue.priority === 'high' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {issue.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {prioritization.recommendation && (
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{prioritization.recommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Analyze" to get task prioritization</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
