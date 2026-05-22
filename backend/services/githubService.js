const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';

class GitHubService {
  constructor(token) {
    this.token = token;
    this.api = axios.create({
      baseURL: GITHUB_API_BASE,
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
  }

  // Get authenticated user info
  async getUser() {
    const { data } = await this.api.get('/user');
    return data;
  }

  // Get user's repositories
  async getRepos(page = 1, perPage = 30) {
    const { data } = await this.api.get('/user/repos', {
      params: { page, per_page: perPage, sort: 'updated' }
    });
    return data;
  }

  // Get commits for a repository
  async getCommits(owner, repo, since = null, page = 1, perPage = 100) {
    const params = { page, per_page: perPage };
    if (since) params.since = since;

    const { data } = await this.api.get(`/repos/${owner}/${repo}/commits`, { params });
    return data;
  }

  // Get pull requests for a repository
  async getPullRequests(owner, repo, state = 'all', page = 1, perPage = 50) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}/pulls`, {
      params: { state, page, per_page: perPage, sort: 'updated' }
    });
    return data;
  }

  // Get issues for a repository
  async getIssues(owner, repo, state = 'all', page = 1, perPage = 50) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}/issues`, {
      params: { state, page, per_page: perPage, sort: 'updated' }
    });
    return data;
  }

  // Get repository contributors
  async getContributors(owner, repo) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}/contributors`);
    return data;
  }

  // Get commit activity (weekly)
  async getCommitActivity(owner, repo) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}/stats/commit_activity`);
    return data;
  }

  // Get code frequency
  async getCodeFrequency(owner, repo) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}/stats/code_frequency`);
    return data;
  }

  // Get contributor stats
  async getContributorStats(owner, repo) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}/stats/contributors`);
    return data;
  }

  // Get repository details
  async getRepoDetails(owner, repo) {
    const { data } = await this.api.get(`/repos/${owner}/${repo}`);
    return data;
  }
}

module.exports = GitHubService;
