import * as git from './git';
const _ = require('lodash');

import {
  Commit,
  CommitSummary,
  Config,
  CompleteSummary,
  CompleteUserSummary,
  RepoAuthorContribution,
} from './types';

export async function getCommitSummaries(
  config: Config,
): Promise<{ [email: string]: CommitSummary }> {
  if (git.isShallowGitRepo(config.gitPath)) {
    console.log('Cannot analyze shallow copies!');
    console.log('Please run git fetch --unshallow before continuing!');
    process.exit(1);
  }

  const { gitPath, branch, countMerges, since, until } = config;
  const allCommits = await git.getCommitsForRepository({
    gitPath,
    branch,
    countMerges,
    since,
    until,
  });

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

export function getUserContribution({
  commits,
  firstCommitAdditionInMinutes,
  maxCommitDiffInMinutes,
}: {
  commits: Commit[];
  firstCommitAdditionInMinutes: number;
  maxCommitDiffInMinutes: number;
}): {
  [repository: string]: RepoAuthorContribution;
} {
  if (commits.length === 0) {
    return {};
  }
  if (commits.length === 1) {
    const commit = commits[0];
    return {
      [commit.repo]: { hours: firstCommitAdditionInMinutes / 60, commits: 1 },
    };
  }

  const sortedDates = commits.sort(oldestLastSorter);

  // Why do we do this?
  const allButLast = sortedDates.slice(0, sortedDates.length - 1);

  const repoSummary: { [repository: string]: RepoAuthorContribution } = {};
  const addCommitData = (timeInMinutes: number, repository: string) => {
    if (!repoSummary[repository]) {
      repoSummary[repository] = {
        hours: 0,
        commits: 0,
      };
    }
    repoSummary[repository].commits += 1;
    repoSummary[repository].hours += timeInMinutes / 60;
  };

  let lastTimeStamp = null;

  allButLast.forEach((commit) => {
    let diffInMinutes =
      lastTimeStamp && getDiffInMinutes(commit.date, lastTimeStamp);
    if (diffInMinutes === null || diffInMinutes > maxCommitDiffInMinutes) {
      diffInMinutes = firstCommitAdditionInMinutes;
    }
    addCommitData(diffInMinutes, commit.repo);
  });

  return repoSummary;
}

export async function analyzeTimeSpent(
  config: Config,
): Promise<CompleteSummary> {
  const commitSummaries = await getCommitSummaries(config);
  const { firstCommitAdditionInMinutes, maxCommitDiffInMinutes } = config;

  const authorWorks: CompleteUserSummary[] = await Promise.all(
    Object.keys(commitSummaries).map(async (email) => {
      const authorSummary = commitSummaries[email];
      const timeSummary = await getUserContribution({
        commits: authorSummary.commits,
        firstCommitAdditionInMinutes,
        maxCommitDiffInMinutes,
      });
      return { contributions: timeSummary, email };
    }),
  );

  const completeSummary: CompleteSummary = {};

  authorWorks.forEach((work) => {
    const { email, contributions } = work;
    Object.keys(contributions).forEach((repository) => {
      if (!completeSummary[repository]) {
        completeSummary[repository] = {};
      }
      completeSummary[repository][email] = contributions[repository];
    });
  });

  // TODO: Summarize or sort the report
  // if (config.authors.length !== 1) {
  //   const totalHours = Object.values(sortedWork).reduce(
  //     (sum, authorWork) => sum + authorWork.hours,
  //     0,
  //   );
  //
  //   const numberOfCommits = Object.values(commitSummaries).reduce(
  //     (count, summary) => count + summary.commits.length,
  //     0,
  //   );
  //   sortedWork['total'] = {
  //     hours: totalHours,
  //     commits: numberOfCommits,
  //   };
  // }
  return completeSummary;
}

const oldestLastSorter = (a: Commit, b: Commit) =>
  a.date.getTime() - b.date.getTime();
const getDiffInMinutes = (a: Date, b: Date) => {
  return Math.abs(a.getTime() - b.getTime() / 1000 / 60);
};
