const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const GitHubService = require('../services/githubService');
const AIService = require('../services/aiService');

// @route   POST /api/ai/summarize-commits
// @desc    AI summarize commits for a repository
router.post('/summarize-commits', authMiddleware, async (req, res) => {
  try {
    const { owner, repo, since } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const commits = await github.getCommits(owner, repo, since);

    const ai = new AIService();
    const summary = await ai.summarizeCommits(commits);

    res.json({
      repository: `${owner}/${repo}`,
      commitCount: commits.length,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/ai/inactive-contributors
// @desc    Detect inactive contributors
router.post('/inactive-contributors', authMiddleware, async (req, res) => {
  try {
    const { owner, repo, dayThreshold } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const [contributors, commits] = await Promise.all([
      github.getContributors(owner, repo),
      github.getCommits(owner, repo)
    ]);

    const ai = new AIService();
    const analysis = await ai.detectInactiveContributors(contributors, commits, dayThreshold || 14);

    res.json({
      repository: `${owner}/${repo}`,
      ...analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/ai/sprint-analysis
// @desc    Analyze sprint progress
router.post('/sprint-analysis', authMiddleware, async (req, res) => {
  try {
    const { owner, repo, sprintDays } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const [commits, pullRequests, issues] = await Promise.all([
      github.getCommits(owner, repo),
      github.getPullRequests(owner, repo),
      github.getIssues(owner, repo)
    ]);

    const ai = new AIService();
    const analysis = await ai.analyzeSprintProgress(commits, pullRequests, issues, sprintDays || 14);

    res.json({
      repository: `${owner}/${repo}`,
      ...analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
