const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const GitHubService = require('../services/githubService');
const AIService = require('../services/aiService');
const RecommendationService = require('../services/recommendationService');

// @route   POST /api/export/report
// @desc    Generate a full productivity report
router.post('/report', authMiddleware, async (req, res) => {
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

    const aiService = new AIService();
    const recommendationService = new RecommendationService();

    const [commitSummary, sprintAnalysis, bottleneckAnalysis, prioritization] = await Promise.all([
      aiService.summarizeCommits(commits),
      aiService.analyzeSprintProgress(commits, pullRequests, issues, 14),
      recommendationService.detectBottlenecks(commits, pullRequests, issues, contributors),
      recommendationService.suggestPrioritization(issues, pullRequests)
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      repository: `${owner}/${repo}`,
      summary: {
        totalCommits: commits.length,
        totalPRs: pullRequests.length,
        totalIssues: issues.length,
        totalContributors: contributors.length
      },
      commitSummary,
      sprintAnalysis,
      bottleneckAnalysis,
      prioritization
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
