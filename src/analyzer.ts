import * as git from './git';
import { Commit } from 'nodegit';
const _ = require('lodash');

import { Config, RepoAuthorContribution } from './types';

export async function analyzeTimeSpentForRepository(config: Config) {
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

  const authorWorks = _.map(commitsByEmail, function (
    authorCommits,
    authorEmail,
  ) {
    return {
      email: authorEmail,
      name: authorCommits[0].author.name,
      hours: estimateHours(_.pluck(authorCommits, 'date'), config),
      commits: authorCommits.length,
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

  const totalHours = Object.values(sortedWork).reduce(
    (sum, authorWork) => sum + authorWork.hours,
    0,
  );

  if (config.authors.length !== 1) {
    const numberOfCommits = Object.values(commitsByEmail).reduce(
      (count, commits) => count + commits.length,
      0,
    );
    sortedWork['total'] = {
      name: '',
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
