const { GoogleGenerativeAI } = require('@google/generative-ai');

class RecommendationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  // Suggest task prioritization based on issues and PRs
  async suggestPrioritization(issues, pullRequests) {
    const openIssues = issues.filter(i => i.state === 'open' && !i.pull_request);
    const openPRs = pullRequests.filter(pr => pr.state === 'open');

    // Score issues by urgency
    const scoredIssues = openIssues.map(issue => {
      let score = 0;

      // Age-based scoring (older = more urgent)
      const ageInDays = (Date.now() - new Date(issue.created_at)) / (1000 * 60 * 60 * 24);
      score += Math.min(30, ageInDays * 0.5);

      // Label-based scoring
      const labels = issue.labels.map(l => l.name.toLowerCase());
      if (labels.some(l => l.includes('critical') || l.includes('urgent'))) score += 40;
      if (labels.some(l => l.includes('bug'))) score += 25;
      if (labels.some(l => l.includes('security'))) score += 35;
      if (labels.some(l => l.includes('enhancement'))) score += 10;
      if (labels.some(l => l.includes('good first issue'))) score += 5;

      // Comment activity (more comments = more attention needed)
      score += Math.min(20, (issue.comments || 0) * 3);

      return {
        number: issue.number,
        title: issue.title,
        labels: issue.labels.map(l => l.name),
        author: issue.user?.login,
        createdAt: issue.created_at,
        ageInDays: Math.round(ageInDays),
        comments: issue.comments,
        priorityScore: Math.round(score),
        priority: score >= 60 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low'
      };
    });

    // Sort by priority score
    scoredIssues.sort((a, b) => b.priorityScore - a.priorityScore);

    // Score PRs for review priority
    const scoredPRs = openPRs.map(pr => {
      let score = 0;
      const ageInDays = (Date.now() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24);

      score += Math.min(30, ageInDays * 2); // PRs should be reviewed quickly
      score += Math.min(20, (pr.comments || 0) * 2);
      if (pr.draft) score -= 20;

      return {
        number: pr.number,
        title: pr.title,
        author: pr.user?.login,
        createdAt: pr.created_at,
        ageInDays: Math.round(ageInDays),
        isDraft: pr.draft || false,
        reviewScore: Math.round(Math.max(0, score)),
        reviewPriority: score >= 40 ? 'urgent' : score >= 20 ? 'high' : 'normal'
      };
    });

    scoredPRs.sort((a, b) => b.reviewScore - a.reviewScore);

    // Generate AI recommendation if available
    let aiRecommendation = null;
    try {
      aiRecommendation = await this.generatePrioritizationAdvice(scoredIssues.slice(0, 5), scoredPRs.slice(0, 5));
    } catch (error) {
      aiRecommendation = this.fallbackPrioritizationAdvice(scoredIssues, scoredPRs);
    }

    return {
      issues: {
        total: openIssues.length,
        critical: scoredIssues.filter(i => i.priority === 'critical').length,
        high: scoredIssues.filter(i => i.priority === 'high').length,
        medium: scoredIssues.filter(i => i.priority === 'medium').length,
        low: scoredIssues.filter(i => i.priority === 'low').length,
        prioritized: scoredIssues.slice(0, 10)
      },
      pullRequests: {
        total: openPRs.length,
        urgent: scoredPRs.filter(p => p.reviewPriority === 'urgent').length,
        prioritized: scoredPRs.slice(0, 5)
      },
      recommendation: aiRecommendation
    };
  }

  // Detect bottlenecks in development workflow
  async detectBottlenecks(commits, pullRequests, issues, contributors) {
    const bottlenecks = [];

    // 1. PR Review Bottleneck
    const openPRs = pullRequests.filter(pr => pr.state === 'open');
    const stalePRs = openPRs.filter(pr => {
      const ageInDays = (Date.now() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24);
      return ageInDays > 3;
    });

    if (stalePRs.length > 0) {
      bottlenecks.push({
        type: 'pr_review',
        severity: stalePRs.length > 5 ? 'critical' : stalePRs.length > 2 ? 'high' : 'medium',
        title: 'Pull Request Review Bottleneck',
        description: `${stalePRs.length} PRs waiting for review for more than 3 days`,
        metric: stalePRs.length,
        affectedItems: stalePRs.slice(0, 5).map(pr => ({
          number: pr.number,
          title: pr.title,
          author: pr.user?.login,
          waitingDays: Math.round((Date.now() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24))
        }))
      });
    }

    // 2. Issue Accumulation Bottleneck
    const openIssues = issues.filter(i => i.state === 'open' && !i.pull_request);
    const staleIssues = openIssues.filter(i => {
      const ageInDays = (Date.now() - new Date(i.created_at)) / (1000 * 60 * 60 * 24);
      return ageInDays > 30;
    });

    if (staleIssues.length > 5) {
      bottlenecks.push({
        type: 'issue_backlog',
        severity: staleIssues.length > 20 ? 'critical' : staleIssues.length > 10 ? 'high' : 'medium',
        title: 'Growing Issue Backlog',
        description: `${staleIssues.length} issues open for more than 30 days`,
        metric: staleIssues.length,
        suggestion: 'Consider triaging old issues - close stale ones or prioritize important ones'
      });
    }

    // 3. Contributor Imbalance
    const commitsByAuthor = {};
    commits.forEach(commit => {
      const author = commit.commit?.author?.name || commit.author?.login || 'Unknown';
      commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;
    });

    const authorCounts = Object.values(commitsByAuthor);
    if (authorCounts.length > 1) {
      const maxCommits = Math.max(...authorCounts);
      const totalCommits = authorCounts.reduce((a, b) => a + b, 0);
      const topContributorRatio = maxCommits / totalCommits;

      if (topContributorRatio > 0.7) {
        const topContributor = Object.entries(commitsByAuthor).find(([, count]) => count === maxCommits);
        bottlenecks.push({
          type: 'contributor_imbalance',
          severity: topContributorRatio > 0.9 ? 'high' : 'medium',
          title: 'Contributor Workload Imbalance',
          description: `${topContributor[0]} accounts for ${Math.round(topContributorRatio * 100)}% of commits`,
          metric: Math.round(topContributorRatio * 100),
          suggestion: 'Consider distributing work more evenly to reduce bus factor risk'
        });
      }
    }

    // 4. Low Commit Frequency
    const recentCommits = commits.filter(c => {
      const date = new Date(c.commit?.author?.date || c.date);
      return (Date.now() - date) < 7 * 24 * 60 * 60 * 1000;
    });

    if (recentCommits.length < 3 && commits.length > 10) {
      bottlenecks.push({
        type: 'low_activity',
        severity: recentCommits.length === 0 ? 'high' : 'medium',
        title: 'Low Recent Activity',
        description: `Only ${recentCommits.length} commits in the past 7 days`,
        metric: recentCommits.length,
        suggestion: 'Development pace has slowed. Check if the team is blocked on any issues.'
      });
    }

    // 5. Unmerged PR Pile-up
    const mergeRate = pullRequests.length > 0
      ? pullRequests.filter(pr => pr.merged_at).length / pullRequests.length
      : 1;

    if (mergeRate < 0.5 && pullRequests.length > 5) {
      bottlenecks.push({
        type: 'low_merge_rate',
        severity: mergeRate < 0.3 ? 'high' : 'medium',
        title: 'Low PR Merge Rate',
        description: `Only ${Math.round(mergeRate * 100)}% of PRs get merged`,
        metric: Math.round(mergeRate * 100),
        suggestion: 'Many PRs are being abandoned. Review PR sizing and ensure requirements are clear before starting work.'
      });
    }

    // Generate AI-powered bottleneck summary
    let aiSummary = null;
    try {
      aiSummary = await this.generateBottleneckSummary(bottlenecks);
    } catch (error) {
      aiSummary = this.fallbackBottleneckSummary(bottlenecks);
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      totalBottlenecks: bottlenecks.length,
      bottlenecks,
      overallHealth: bottlenecks.length === 0 ? 'healthy' :
        bottlenecks.some(b => b.severity === 'critical') ? 'critical' :
        bottlenecks.some(b => b.severity === 'high') ? 'needs_attention' : 'fair',
      aiSummary
    };
  }

  // Generate AI prioritization advice
  async generatePrioritizationAdvice(topIssues, topPRs) {
    const prompt = `You are a project manager. Based on this project state, provide brief prioritization advice:

Top Issues:
${topIssues.map(i => `- #${i.number} "${i.title}" (${i.priority}, ${i.ageInDays} days old)`).join('\n')}

PRs Needing Review:
${topPRs.map(p => `- #${p.number} "${p.title}" (waiting ${p.ageInDays} days)`).join('\n')}

Provide 3 actionable recommendations in bullet points.`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // Generate AI bottleneck summary
  async generateBottleneckSummary(bottlenecks) {
    if (bottlenecks.length === 0) return 'No significant bottlenecks detected. Workflow is healthy.';

    const prompt = `You are a DevOps consultant. Summarize these development bottlenecks and suggest fixes:

${bottlenecks.map(b => `- ${b.title} (${b.severity}): ${b.description}`).join('\n')}

Provide a 2-3 sentence summary with top priority action.`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // Fallback prioritization advice
  fallbackPrioritizationAdvice(issues, prs) {
    const critical = issues.filter(i => i.priority === 'critical');
    const urgentPRs = prs.filter(p => p.reviewPriority === 'urgent');

    let advice = 'Recommendations:\n';
    if (critical.length > 0) advice += `• Address ${critical.length} critical issue(s) first\n`;
    if (urgentPRs.length > 0) advice += `• Review ${urgentPRs.length} urgent PR(s) to unblock team members\n`;
    advice += '• Focus on closing oldest open issues to reduce backlog';
    return advice;
  }

  // Fallback bottleneck summary
  fallbackBottleneckSummary(bottlenecks) {
    if (bottlenecks.length === 0) return 'No significant bottlenecks detected.';
    const critical = bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high');
    return `Found ${bottlenecks.length} bottleneck(s), ${critical.length} requiring immediate attention. Focus on ${bottlenecks[0].title.toLowerCase()} first.`;
  }
}

module.exports = RecommendationService;
