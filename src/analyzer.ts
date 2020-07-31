import * as git from './git';
const _ = require('lodash');

import {
  Commit,
  CommitSummary,
  Config,
  RepoAuthorContribution,
  RepoAuthorContributionWithEmail,
  RepoWorkSummary,
} from './types';

export async function getCommitTimestamps(
  config: Config,
): Promise<{ [email: string]: CommitSummary }> {
  if (git.isShallowGitRepo(config.gitPath)) {
    console.log('Cannot analyze shallow copies!');
    console.log('Please run git fetch --unshallow before continuing!');
    process.exit(1);
  }

  const allCommits = await git.getCommits(
    config.gitPath,
    config.branch,
    config,
  );

  const commitsByEmail = allCommits.reduce((map, commit) => {
    let email: string = commit.author.email || 'unknown';
    if (config.emailAliases[email] !== undefined) {
      email = config.emailAliases[email];
    }
    if (!map[email]) {
      map[email] = [];
    }
    map[email].push(commit);
    return map;
  }, {});
  if (config.authors.length > 0) {
    Object.keys(commitsByEmail).forEach((email) => {
      if (!config.authors.includes(email)) {
        delete commitsByEmail[email];
      }
    });
  }
  Object.keys(commitsByEmail).map((email) => {
    const commits = commitsByEmail[email];
    commitsByEmail[email] = {
      commits,
    };
  });
  return commitsByEmail;
}

export async function analyzeTimeSpentForCommits({
  commits,
  firstCommitAdditionInMinutes,
  maxCommitDiffInMinutes,
}: {
  commits: Commit[];
  firstCommitAdditionInMinutes: number;
  maxCommitDiffInMinutes: number;
}) {
  const timestamps: Date[] = commits.map((c) => c.date);
  return {
    hours: estimateHours({
      dates: timestamps,
      firstCommitAdditionInMinutes,
      maxCommitDiffInMinutes,
    }),
    commits: commits.length,
  };
}

export async function analyzeTimeSpentForRepository(
  config: Config,
): Promise<RepoWorkSummary> {
  const commitSummaries = await getCommitTimestamps(config);
  const { firstCommitAdditionInMinutes, maxCommitDiffInMinutes } = config;

  const authorWorks: RepoAuthorContributionWithEmail[] = await Promise.all(
    Object.keys(commitSummaries).map(async (email) => {
      const authorSummary = commitSummaries[email];
      const timeSummary = await analyzeTimeSpentForCommits({
        commits: authorSummary.commits,
        firstCommitAdditionInMinutes,
        maxCommitDiffInMinutes,
      });
      return {
        ...timeSummary,
        email,
      };
    }),
  );

  // XXX: This relies on the implementation detail that json is printed
  // in the same order as the keys were added. This is anyway just for
  // making the output easier to read, so it doesn't matter if it
  // isn't sorted in some cases.
  const sortedWork: { [email: string]: RepoAuthorContribution } = {};

  authorWorks
    .sort((a, b) => (a.hours < b.hours ? 1 : -1))
    .forEach((work) => {
      const data = { ...work };
      delete data.email;
      sortedWork[work.email] = data;
    });

  if (config.authors.length !== 1) {
    const totalHours = Object.values(sortedWork).reduce(
      (sum, authorWork) => sum + authorWork.hours,
      0,
    );

    const numberOfCommits = Object.values(commitSummaries).reduce(
      (count, summary) => count + summary.commits.length,
      0,
    );
    sortedWork['total'] = {
      hours: totalHours,
      commits: numberOfCommits,
    };
  }
  return sortedWork;
}

// Estimates spent working hours based on commit dates
function estimateHours({
  dates,
  firstCommitAdditionInMinutes,
  maxCommitDiffInMinutes,
}: {
  dates: Date[];
  firstCommitAdditionInMinutes: number;
  maxCommitDiffInMinutes: number;
}): number {
  if (dates.length < 2) {
    return 0;
  }

  // Oldest commit first, newest last
  const sortedDates = dates.sort(function (a, b) {
    return a.getTime() - b.getTime();
  });
  const allButLast = sortedDates.slice(0, sortedDates.length - 1);

  const totalHours = _.reduce(
    allButLast,
    function (hours, date, index) {
      const nextDate = sortedDates[index + 1];
      const diffInMinutes = (nextDate.getTime() - date.getTime()) / 1000 / 60;

      // Check if commits are counted to be in same coding session
      if (diffInMinutes < maxCommitDiffInMinutes) {
        return hours + diffInMinutes / 60;
      }

      // The date difference is too big to be inside single coding session
      // The work of first commit of a session cannot be seen in git history,
      // so we make a blunt estimate of it
      return hours + firstCommitAdditionInMinutes / 60;
    },
    0,
  );

  // TODO: Consider swiching to Number.parseFloat(a.toFixed(2))
  return Math.round(totalHours);
}
