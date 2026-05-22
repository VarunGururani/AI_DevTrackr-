const { OpenAI } = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Summarize commits using AI
  async summarizeCommits(commits) {
    const commitMessages = commits.map(c => ({
      message: c.commit?.message || c.message,
      author: c.commit?.author?.name || c.author,
      date: c.commit?.author?.date || c.date
    }));

    const prompt = `Analyze these git commits and provide a concise productivity summary:

Commits:
${JSON.stringify(commitMessages, null, 2)}

Provide:
1. A brief summary of work done (2-3 sentences)
2. Key themes/areas of work
3. Productivity assessment (high/medium/low activity)
4. Notable patterns`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a developer productivity analyst. Provide concise, actionable insights.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      // Fallback analysis without API
      return this.fallbackCommitSummary(commitMessages);
    }
  }

  // Detect inactive contributors
  async detectInactiveContributors(contributors, commits, dayThreshold = 14) {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - dayThreshold * 24 * 60 * 60 * 1000);

    // Build activity map
    const activityMap = {};
    commits.forEach(commit => {
      const author = commit.commit?.author?.name || commit.author || 'Unknown';
      const date = new Date(commit.commit?.author?.date || commit.date);
      if (!activityMap[author] || date > activityMap[author]) {
        activityMap[author] = date;
      }
    });

    const inactive = [];
    const active = [];

    contributors.forEach(contributor => {
      const login = contributor.login || contributor;
      const lastActivity = activityMap[login];

      if (!lastActivity || lastActivity < thresholdDate) {
        inactive.push({
          username: login,
          lastActive: lastActivity ? lastActivity.toISOString() : 'Never',
          daysSinceActive: lastActivity
            ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
            : null
        });
      } else {
        active.push({
          username: login,
          lastActive: lastActivity.toISOString(),
          daysSinceActive: Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
        });
      }
    });

    return { inactive, active, threshold: dayThreshold };
  }

  // Sprint progress analysis
  async analyzeSprintProgress(commits, pullRequests, issues, sprintDays = 14) {
    const now = new Date();
    const sprintStart = new Date(now.getTime() - sprintDays * 24 * 60 * 60 * 1000);

    // Filter to sprint period
    const sprintCommits = commits.filter(c => {
      const date = new Date(c.commit?.author?.date || c.date);
      return date >= sprintStart;
    });

    const sprintPRs = pullRequests.filter(pr => {
      const date = new Date(pr.created_at);
      return date >= sprintStart;
    });

    const sprintIssues = issues.filter(issue => {
      const date = new Date(issue.created_at);
      return date >= sprintStart;
    });

    const closedIssues = sprintIssues.filter(i => i.state === 'closed');
    const mergedPRs = sprintPRs.filter(pr => pr.merged_at);

    // Calculate velocity
    const dailyCommitRate = sprintCommits.length / sprintDays;
    const completionRate = sprintIssues.length > 0
      ? (closedIssues.length / sprintIssues.length) * 100
      : 0;

    const analysis = {
      sprintPeriod: {
        start: sprintStart.toISOString(),
        end: now.toISOString(),
        days: sprintDays
      },
      metrics: {
        totalCommits: sprintCommits.length,
        dailyCommitRate: Math.round(dailyCommitRate * 10) / 10,
        pullRequests: {
          total: sprintPRs.length,
          merged: mergedPRs.length,
          open: sprintPRs.filter(pr => pr.state === 'open').length
        },
        issues: {
          total: sprintIssues.length,
          closed: closedIssues.length,
          open: sprintIssues.filter(i => i.state === 'open').length,
          completionRate: Math.round(completionRate)
        }
      },
      velocity: this.calculateVelocityTrend(sprintCommits, sprintDays),
      healthScore: this.calculateSprintHealth(sprintCommits, mergedPRs, closedIssues, sprintDays)
    };

    // Try AI summary
    try {
      analysis.aiSummary = await this.generateSprintSummary(analysis);
    } catch (error) {
      analysis.aiSummary = this.fallbackSprintSummary(analysis);
    }

    return analysis;
  }

  // Calculate velocity trend over sprint days
  calculateVelocityTrend(commits, days) {
    const dailyCounts = {};
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      dailyCounts[key] = 0;
    }

    commits.forEach(commit => {
      const date = (commit.commit?.author?.date || commit.date || '').split('T')[0];
      if (dailyCounts.hasOwnProperty(date)) {
        dailyCounts[date]++;
      }
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, commits: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Calculate sprint health score (0-100)
  calculateSprintHealth(commits, mergedPRs, closedIssues, days) {
    let score = 0;

    // Commit frequency (max 30 points)
    const dailyRate = commits.length / days;
    score += Math.min(30, dailyRate * 10);

    // PR merge rate (max 30 points)
    score += Math.min(30, mergedPRs.length * 10);

    // Issue closure (max 40 points)
    score += Math.min(40, closedIssues.length * 8);

    return Math.min(100, Math.round(score));
  }

  // Generate AI sprint summary
  async generateSprintSummary(analysis) {
    const prompt = `Based on this sprint data, provide a brief progress summary:

Sprint Metrics:
- ${analysis.metrics.totalCommits} commits (${analysis.metrics.dailyCommitRate}/day)
- ${analysis.metrics.pullRequests.merged}/${analysis.metrics.pullRequests.total} PRs merged
- ${analysis.metrics.issues.closed}/${analysis.metrics.issues.total} issues closed (${analysis.metrics.issues.completionRate}% completion)
- Health Score: ${analysis.healthScore}/100

Provide 2-3 sentences summarizing sprint progress and one suggestion for improvement.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a scrum master providing brief sprint reviews.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  }

  // Fallback commit summary (no API needed)
  fallbackCommitSummary(commits) {
    const count = commits.length;
    const authors = [...new Set(commits.map(c => c.author))];
    const themes = this.extractThemes(commits.map(c => c.message));

    return `Sprint Activity: ${count} commits by ${authors.length} contributor(s). Key areas: ${themes.join(', ')}. Activity level: ${count > 20 ? 'High' : count > 10 ? 'Medium' : 'Low'}.`;
  }

  // Fallback sprint summary
  fallbackSprintSummary(analysis) {
    const { metrics, healthScore } = analysis;
    const status = healthScore >= 70 ? 'on track' : healthScore >= 40 ? 'needs attention' : 'at risk';
    return `Sprint is ${status} with a health score of ${healthScore}/100. ${metrics.totalCommits} commits made with ${metrics.issues.completionRate}% issue completion rate.`;
  }

  // Extract themes from commit messages
  extractThemes(messages) {
    const keywords = {};
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'it']);

    messages.forEach(msg => {
      if (!msg) return;
      const words = msg.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !commonWords.has(word)) {
          keywords[word] = (keywords[word] || 0) + 1;
        }
      });
    });

    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
}

module.exports = AIService;
