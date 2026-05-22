const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const GitHubService = require('../services/githubService');

// @route   GET /api/analytics/dashboard/:owner/:repo
// @desc    Get full dashboard data for a repository
router.get('/dashboard/:owner/:repo', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);

    const [commits, pullRequests, issues, contributors, repoDetails] = await Promise.all([
      github.getCommits(owner, repo),
      github.getPullRequests(owner, repo),
      github.getIssues(owner, repo),
      github.getContributors(owner, repo),
      github.getRepoDetails(owner, repo)
    ]);

    res.json({
      repository: {
        name: repoDetails.name,
        fullName: repoDetails.full_name,
        description: repoDetails.description,
        language: repoDetails.language,
        stars: repoDetails.stargazers_count,
        forks: repoDetails.forks_count,
        openIssues: repoDetails.open_issues_count
      },
      summary: {
        totalCommits: commits.length,
        totalPRs: pullRequests.length,
        totalIssues: issues.length,
        totalContributors: contributors.length
      },
      commits: commits.slice(0, 50),
      pullRequests: pullRequests.slice(0, 30),
      issues: issues.slice(0, 30),
      contributors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/analytics/commit-chart/:owner/:repo
// @desc    Get commit data formatted for chart visualization
router.get('/commit-chart/:owner/:repo', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { days = 30 } = req.query;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
    const github = new GitHubService(user.githubToken);
    const commits = await github.getCommits(owner, repo, since);

    // Group commits by date
    const commitsByDate = {};
    const now = new Date();
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      commitsByDate[key] = 0;
    }

    commits.forEach(commit => {
      const date = (commit.commit.author.date || '').split('T')[0];
      if (commitsByDate.hasOwnProperty(date)) {
        commitsByDate[date]++;
      }
    });

    // Group commits by author
    const commitsByAuthor = {};
    commits.forEach(commit => {
      const author = commit.commit.author.name || 'Unknown';
      commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;
    });

    const chartData = Object.entries(commitsByDate)
      .map(([date, count]) => ({ date, commits: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const authorData = Object.entries(commitsByAuthor)
      .map(([author, count]) => ({ author, commits: count }))
      .sort((a, b) => b.commits - a.commits);

    res.json({
      period: { days: parseInt(days), since },
      totalCommits: commits.length,
      chartData,
      authorData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/analytics/pr-analytics/:owner/:repo
// @desc    Get pull request analytics
router.get('/pr-analytics/:owner/:repo', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const pullRequests = await github.getPullRequests(owner, repo);

    const open = pullRequests.filter(pr => pr.state === 'open');
    const closed = pullRequests.filter(pr => pr.state === 'closed');
    const merged = pullRequests.filter(pr => pr.merged_at);

    // Calculate average time to merge
    const mergeTimes = merged.map(pr => {
      const created = new Date(pr.created_at);
      const mergedAt = new Date(pr.merged_at);
      return (mergedAt - created) / (1000 * 60 * 60); // hours
    });
    const avgMergeTime = mergeTimes.length > 0
      ? Math.round(mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length)
      : 0;

    // PRs by month
    const prsByMonth = {};
    pullRequests.forEach(pr => {
      const month = pr.created_at.substring(0, 7); // YYYY-MM
      if (!prsByMonth[month]) {
        prsByMonth[month] = { opened: 0, merged: 0, closed: 0 };
      }
      prsByMonth[month].opened++;
      if (pr.merged_at) prsByMonth[month].merged++;
      else if (pr.state === 'closed') prsByMonth[month].closed++;
    });

    const monthlyData = Object.entries(prsByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    res.json({
      summary: {
        total: pullRequests.length,
        open: open.length,
        closed: closed.length,
        merged: merged.length,
        avgMergeTimeHours: avgMergeTime
      },
      monthlyData,
      recentPRs: pullRequests.slice(0, 10).map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/analytics/issue-tracking/:owner/:repo
// @desc    Get issue tracking analytics
router.get('/issue-tracking/:owner/:repo', authMiddleware, async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const user = await User.findById(req.user.userId);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const github = new GitHubService(user.githubToken);
    const issues = await github.getIssues(owner, repo);

    // Filter out pull requests (GitHub API includes PRs in issues)
    const pureIssues = issues.filter(i => !i.pull_request);

    const open = pureIssues.filter(i => i.state === 'open');
    const closed = pureIssues.filter(i => i.state === 'closed');

    // Calculate average resolution time
    const resolutionTimes = closed
      .filter(i => i.closed_at)
      .map(i => {
        const created = new Date(i.created_at);
        const closedAt = new Date(i.closed_at);
        return (closedAt - created) / (1000 * 60 * 60 * 24); // days
      });
    const avgResolutionTime = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 0;

    // Issues by label
    const labelCounts = {};
    pureIssues.forEach(issue => {
      issue.labels.forEach(label => {
        const name = label.name;
        labelCounts[name] = (labelCounts[name] || 0) + 1;
      });
    });

    const labelData = Object.entries(labelCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Issues by month
    const issuesByMonth = {};
    pureIssues.forEach(issue => {
      const month = issue.created_at.substring(0, 7);
      if (!issuesByMonth[month]) {
        issuesByMonth[month] = { opened: 0, closed: 0 };
      }
      issuesByMonth[month].opened++;
      if (issue.state === 'closed') issuesByMonth[month].closed++;
    });

    const monthlyData = Object.entries(issuesByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    res.json({
      summary: {
        total: pureIssues.length,
        open: open.length,
        closed: closed.length,
        avgResolutionDays: avgResolutionTime
      },
      labelData,
      monthlyData,
      recentIssues: pureIssues.slice(0, 10).map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map(l => l.name),
        author: issue.user?.login,
        createdAt: issue.created_at,
        closedAt: issue.closed_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
