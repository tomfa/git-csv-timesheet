import * as git from './git';
import logger from './logger';

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
  const { repositories, countMerges, since, until } = config;
  const allCommits = await git.getCommits({
    gitPaths: repositories.map(r => typeof(r) === 'string' ? r : r.path),
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
      [commit.repo]: {
        [asISOday(commit.date)]: {
          hours: firstCommitAdditionInMinutes / 60,
          commits: 1,
        },
      },
    };
  }

  const sortedCommits = commits.sort(oldestLastSorter);

  const repoSummary: { [repository: string]: RepoAuthorContribution } = {};
  const isoDaySet = new Set<string>();

  const addCommitData = (
    timeInMinutes: number,
    repository: string,
    date: Date,
  ) => {
    const isoDay = asISOday(date);
    isoDaySet.add(isoDay);
    if (!repoSummary[repository]) {
      repoSummary[repository] = {};
    }
    if (!repoSummary[repository][isoDay]) {
      repoSummary[repository][isoDay] = {
        commits: 0,
        hours: 0,
      };
    }
    repoSummary[repository][isoDay].commits += 1;
    repoSummary[repository][isoDay].hours += timeInMinutes / 60;
  };

  let lastTimeStamp = null;

  let numSessionsDetected = 0;
  const repoSet = new Set<string>();
  sortedCommits.forEach((commit) => {
    let diffInMinutes =
      lastTimeStamp && getDiffInMinutes(commit.date, lastTimeStamp);
    lastTimeStamp = commit.date;
    if (diffInMinutes === null || diffInMinutes > maxCommitDiffInMinutes) {
      const { date, time } = getDateInfo(lastTimeStamp);
      const pauseLength = Math.round(diffInMinutes);
      numSessionsDetected += 1;
      logger.debug(
        `${pauseLength} minutes diff until ${date} ${time}`,
        `– session starts.`,
      );
      diffInMinutes = firstCommitAdditionInMinutes;
    }
    repoSet.add(commit.repo);
    addCommitData(diffInMinutes, commit.repo, commit.date);
  });

  const author = sortedCommits[0].author;
  logger.log(
    `\n ${author.name} (${author.email}) had\n`,
    `${numSessionsDetected} sessions constructed using\n`,
    `${sortedCommits.length} commits, made in\n`,
    `${repoSet.size} repositories, done on\n`,
    `${isoDaySet.size} different days.\n`,
  );

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
  return Math.abs(a.getTime() - b.getTime()) / 1000 / 60;
};
const getDateInfo = (d: Date): { date: string; time: string } => ({
  date: d.toISOString().substr(0, 10),
  time: d.toISOString().substr(11, 5),
});
const asISOday = (d: Date) => d.toISOString().substr(0, 10);
