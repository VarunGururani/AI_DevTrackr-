import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const GitHubConnect = () => {
  const { user, setUser } = useAuth();
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.githubUsername) {
      fetchRepos();
    }
  }, [user]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/github/repos');
      setRepos(response.data);
    } catch (err) {
      setError('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConnectLoading(true);

    try {
      const response = await api.post('/github/connect', { githubToken: token });
      setSuccess(`Connected as ${response.data.githubUsername}`);
      setUser(response.data.user);
      setToken('');
      fetchRepos();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect GitHub');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnectRepo = async (repo) => {
    try {
      await api.post('/github/repos/connect', {
        repoName: repo.name,
        repoFullName: repo.fullName,
        repoUrl: repo.url
      });
      setSuccess(`Repository "${repo.name}" connected for tracking`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect repository');
    }
  };

  const isRepoConnected = (repoFullName) => {
    return user?.connectedRepos?.some(r => r.repoFullName === repoFullName);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">GitHub Integration</h1>

      {/* Connection Status */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${user?.githubUsername ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.githubUsername ? 'GitHub Connected' : 'GitHub Not Connected'}
              </h3>
              {user?.githubUsername && (
                <p className="text-sm text-gray-500">Connected as @{user.githubUsername}</p>
              )}
            </div>
          </div>
          {user?.githubUsername && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
          )}
        </div>
      </div>

      {/* Connect GitHub Form */}
      {!user?.githubUsername && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect Your GitHub Account</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter your GitHub Personal Access Token to connect your account. 
            You can generate one at GitHub Settings &gt; Developer Settings &gt; Personal Access Tokens.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
          )}

          <form onSubmit={handleConnect} className="flex space-x-4">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <button
              type="submit"
              disabled={connectLoading}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
            >
              {connectLoading ? 'Connecting...' : 'Connect GitHub'}
            </button>
          </form>
        </div>
      )}

      {/* Repository List */}
      {user?.githubUsername && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Your Repositories</h3>
            <button
              onClick={fetchRepos}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <div key={repo.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{repo.name}</h4>
                      {repo.language && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-500 mt-1">{repo.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                      <span>Stars: {repo.stars}</span>
                      <span>Forks: {repo.forks}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectRepo(repo)}
                    disabled={isRepoConnected(repo.fullName)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isRepoConnected(repo.fullName)
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {isRepoConnected(repo.fullName) ? 'Connected' : 'Track'}
                  </button>
                </div>
              ))}
              {repos.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8">No repositories found</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GitHubConnect;
