const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const GitHubService = require('../services/githubService');
const RecommendationService = require('../services/recommendationService');

// @route   POST /api/ai/recommendations/prioritize
// @desc    Get AI-powered task prioritization
router.post('/prioritize', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const [issues, pullRequests] = await Promise.all([
      github.getIssues(owner, repo),
      github.getPullRequests(owner, repo)
    ]);

    const recommendationService = new RecommendationService();
    const prioritization = await recommendationService.suggestPrioritization(issues, pullRequests);

    res.json({
      repository: `${owner}/${repo}`,
      ...prioritization
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/ai/recommendations/bottlenecks
// @desc    Detect workflow bottlenecks
router.post('/bottlenecks', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const [commits, pullRequests, issues, contributors] = await Promise.all([
      github.getCommits(owner, repo),
      github.getPullRequests(owner, repo),
      github.getIssues(owner, repo),
      github.getContributors(owner, repo)
    ]);

    const recommendationService = new RecommendationService();
    const bottleneckAnalysis = await recommendationService.detectBottlenecks(
      commits, pullRequests, issues, contributors
    );

    res.json({
      repository: `${owner}/${repo}`,
      ...bottleneckAnalysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
