const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const GitHubService = require('../services/githubService');

// @route   POST /api/github/connect
// @desc    Connect GitHub account with personal access token
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { githubToken } = req.body;

    if (!githubToken) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }

    // Verify token by fetching user info
    const github = new GitHubService(githubToken);
    const githubUser = await github.getUser();

    // Update user with GitHub info
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        githubToken,
        githubUsername: githubUser.login
      },
      { new: true }
    ).select('-password');

    res.json({
      message: 'GitHub connected successfully',
      githubUsername: githubUser.login,
      user
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ error: 'Invalid GitHub token' });
    }
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/github/repos
// @desc    Get user's GitHub repositories
router.get('/repos', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const repos = await github.getRepos();

    const repoList = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updatedAt: repo.updated_at
    }));

    res.json(repoList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/github/repos/connect
// @desc    Connect a specific repository for tracking
router.post('/repos/connect', authMiddleware, async (req, res) => {
  try {
    const { repoName, repoFullName, repoUrl } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    // Check if repo already connected
    const alreadyConnected = user.connectedRepos.find(r => r.repoFullName === repoFullName);
    if (alreadyConnected) {
      return res.status(400).json({ error: 'Repository already connected' });
    }

    user.connectedRepos.push({ repoName, repoFullName, repoUrl });
    await user.save();

    res.json({
      message: 'Repository connected successfully',
      connectedRepos: user.connectedRepos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/github/repos/:owner/:repo/commits
// @desc    Get commits for a repository
router.get('/repos/:owner/:repo/commits', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { since } = req.query;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const commits = await github.getCommits(owner, repo, since);

    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/github/repos/:owner/:repo/pulls
// @desc    Get pull requests for a repository
router.get('/repos/:owner/:repo/pulls', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state } = req.query;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const pulls = await github.getPullRequests(owner, repo, state || 'all');

    res.json(pulls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/github/repos/:owner/:repo/issues
// @desc    Get issues for a repository
router.get('/repos/:owner/:repo/issues', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state } = req.query;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const issues = await github.getIssues(owner, repo, state || 'all');

    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/github/repos/:owner/:repo/contributors
// @desc    Get contributors for a repository
router.get('/repos/:owner/:repo/contributors', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const contributors = await github.getContributors(owner, repo);

    res.json(contributors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
