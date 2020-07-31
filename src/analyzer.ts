import * as git from './git';
import { Commit } from 'nodegit';
const _ = require('lodash');

import {
  CommitSummary,
  Config,
  RepoAuthorContribution,
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

  const commitsByEmail: { [email: string]: Commit[] } = _.groupBy(
    allCommits,
    function (commit) {
      let email: string = commit.author.email || 'unknown';
      if (config.emailAliases[email] !== undefined) {
        email = config.emailAliases[email];
      }
      return email;
    },
  );
  if (config.authors.length > 0) {
    Object.keys(commitsByEmail).forEach((email) => {
      if (!config.authors.includes(email)) {
        delete commitsByEmail[email];
      }
    });
  }
  return Object.entries(commitsByEmail).reduce(
    (commitSummary, [email, commits]) => {
      commitSummary[email] = { timestamps: commits.map((c) => c.date) };
      return commitSummary;
    },
    {},
  );
}

export async function analyzeTimeSpentForRepository(
  config: Config,
): Promise<RepoWorkSummary> {
  const commitSummaries = await getCommitTimestamps(config);

  const authorWorks = _.map(commitSummaries, function (
    summary,
    authorEmail,
  ) {
    return {
      email: authorEmail,
      hours: estimateHours(summary.timestamps, config),
      commits: summary.timestamps.length,
    };
  });

  // XXX: This relies on the implementation detail that json is printed
  // in the same order as the keys were added. This is anyway just for
  // making the output easier to read, so it doesn't matter if it
  // isn't sorted in some cases.
  const sortedWork: { [email: string]: RepoAuthorContribution } = {};

  _.each(_.sortBy(authorWorks, 'hours'), function (authorWork) {
    sortedWork[authorWork.email] = _.omit(authorWork, 'email');
  });

  if (config.authors.length !== 1) {
    const totalHours = Object.values(sortedWork).reduce(
      (sum, authorWork) => sum + authorWork.hours,
      0,
    );

    const numberOfCommits = Object.values(commitSummaries).reduce(
      (count, commits) => count + commits.timestamps.length,
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
function estimateHours(dates: Date[], config: Config): number {
  if (dates.length < 2) {
    return 0;
  }

  // Oldest commit first, newest last
  const sortedDates = dates.sort(function (a, b) {
    return a.getTime() - b.getTime();
  });
  const allButLast = _.take(sortedDates, sortedDates.length - 1);

  const totalHours = _.reduce(
    allButLast,
    function (hours, date, index) {
      const nextDate = sortedDates[index + 1];
      const diffInMinutes = (nextDate.getTime() - date.getTime()) / 1000 / 60;

      // Check if commits are counted to be in same coding session
      if (diffInMinutes < config.maxCommitDiffInMinutes) {
        return hours + diffInMinutes / 60;
      }

      // The date difference is too big to be inside single coding session
      // The work of first commit of a session cannot be seen in git history,
      // so we make a blunt estimate of it
      return hours + config.firstCommitAdditionInMinutes / 60;
    },
    0,
  );

  // TODO: Consider swiching to Number.parseFloat(a.toFixed(2))
  return Math.round(totalHours);
}
