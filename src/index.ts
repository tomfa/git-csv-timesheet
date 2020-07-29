#!/usr/bin/env node

import { Commit, Repository } from 'nodegit';

const bluebird = require('bluebird');
const git = require('nodegit');
const program = require('commander');
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');

const DATE_FORMAT = 'YYYY-MM-DD';

type EmailAliases = {
  [email: string]: string;
};
type Config = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  since: string | Date;
  until: string | Date;
  mergeRequest: boolean;
  gitPath: string;
  emailAliases: EmailAliases;
  branch: string | null;
};
type RepoAuthorContribution = { name: string; hours: number; commits: number };

let defaultConfig: Config = {
  // Maximum time diff between 2 subsequent commits in minutes which are
  // counted to be in the same coding "session"
  maxCommitDiffInMinutes: 2 * 60,

  // How many minutes should be added for the first commit of coding session
  firstCommitAdditionInMinutes: 2 * 60,

  // Include commits since time x
  since: 'always',
  until: 'always',

  // Include merge requests
  mergeRequest: true,

  // Git repo
  gitPath: '.',

  // Aliases of emails for grouping the same activity as one person
  emailAliases: {
    'linus@torvalds.com': 'linus@linux.com',
  },
  branch: null,
};

async function main() {
  const commandLineArgs = parseArgs();
  const config = { ...defaultConfig, ...commandLineArgs };
  config.since = parseSinceDate(config.since);
  config.until = parseUntilDate(config.until);

  if (isShallowGitRepo(config.gitPath)) {
    console.log('Cannot analyze shallow copies!');
    console.log('Please run git fetch --unshallow before continuing!');
    process.exit(1);
  }

  const commits = await getCommits(config.gitPath, config.branch, config);

  const commitsByEmail: { [email: string]: Commit } = _.groupBy(
    commits,
    function (commit) {
      let email = commit.author.email || 'unknown';
      if (config.emailAliases[email] !== undefined) {
        email = config.emailAliases[email];
      }
      return email;
    },
  );

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

  sortedWork['total'] = {
    name: '',
    hours: totalHours,
    commits: commits.length,
  };

  console.log(JSON.stringify(sortedWork, undefined, 2));
}

function isShallowGitRepo(path: string): boolean {
  return fs.existsSync(path + '.git/shallow');
}

function parseArgs(): Partial<Config> {
  function int(val) {
    return parseInt(val, 10);
  }

  program
    .version(require('../package.json').version)
    .usage('[options]')
    .option(
      '-d, --max-commit-diff [max-commit-diff]',
      'maximum difference in minutes between commits counted to one' +
        ' session. Default: ' +
        defaultConfig.maxCommitDiffInMinutes,
      int,
    )
    .option(
      '-a, --first-commit-add [first-commit-add]',
      'how many minutes first commit of session should add to total.' +
        ' Default: ' +
        defaultConfig.firstCommitAdditionInMinutes,
      int,
    )
    .option(
      '-s, --since [since-certain-date]',
      'Analyze data since certain date.' +
        ' [always|yesterday|today|lastweek|thisweek|yyyy-mm-dd] Default: ' +
        defaultConfig.since,
      String,
    )
    .option(
      '-e, --email [emailOther=emailMain]',
      'Group person by email address.' + ' Default: none',
      String,
    )
    .option(
      '-u, --until [until-certain-date]',
      'Analyze data until certain date.' +
        ' [always|yesterday|today|lastweek|thisweek|yyyy-mm-dd] Default: ' +
        defaultConfig.until,
      String,
    )
    .option(
      '-m, --merge-request [false|true]',
      'Include merge requests into calculation. ' +
        ' Default: ' +
        defaultConfig.mergeRequest,
      String,
    )
    .option(
      '-p, --path [git-repo]',
      'Git repository to analyze.' + ' Default: ' + defaultConfig.gitPath,
      String,
    )
    .option(
      '-b, --branch [branch-name]',
      'Analyze only data on the specified branch. Default: ' +
        defaultConfig.branch,
      String,
    );

  program.on('--help', function () {
    console.log('  Examples:');
    console.log('');
    console.log('   - Estimate hours of project');
    console.log('');
    console.log('       $ git hours');
    console.log('');
    console.log(
      '   - Estimate hours in repository where developers commit' +
        ' more seldom: they might have 4h(240min) pause between commits',
    );
    console.log('');
    console.log('       $ git hours --max-commit-diff 240');
    console.log('');
    console.log(
      '   - Estimate hours in repository where developer works 5' +
        ' hours before first commit in day',
    );
    console.log('');
    console.log('       $ git hours --first-commit-add 300');
    console.log('');
    console.log('   - Estimate hours work in repository since yesterday');
    console.log('');
    console.log('       $ git hours --since yesterday');
    console.log('');
    console.log('   - Estimate hours work in repository since 2015-01-31');
    console.log('');
    console.log('       $ git hours --since 2015-01-31');
    console.log('');
    console.log(
      '   - Estimate hours work in repository on the "master" branch',
    );
    console.log('');
    console.log('       $ git hours --branch master');
    console.log('');
    console.log(
      '  For more details, visit https://github.com/kimmobrunfeldt/git-hours',
    );
    console.log('');
  });

  program.parse(process.argv);

  const confArgs = {
    maxCommitDiffInMinutes: program.maxCommitDiff,
    firstCommitAdditionInMinutes: program.firstCommitAdd,
    since: program.since,
    until: program.until,
    gitPath: program.path,
    mergeRequest:
      program.mergeRequest === undefined
        ? program.mergeRequest !== 'false'
        : undefined,
    branch: program.branch,
    emailAliases: parseEmailArg(process.argv),
  };

  for (let [key, value] of Object.entries(confArgs)) {
    if (value === undefined) {
      delete confArgs[key];
    }
  }

  return confArgs;
}

function parseInputDate(inputDate: string): Date | 'always' {
  switch (inputDate) {
    case 'today':
      return moment().startOf('day');
    case 'yesterday':
      return moment().startOf('day').subtract(1, 'day');
    case 'thisweek':
      return moment().startOf('week');
    case 'lastweek':
      return moment().startOf('week').subtract(1, 'week');
    case 'always':
      return 'always';
    default:
      // XXX: Moment tries to parse anything, results might be weird
      return moment(inputDate, DATE_FORMAT);
  }
}

function parseSinceDate(since) {
  return parseInputDate(since);
}

function parseUntilDate(until) {
  return parseInputDate(until);
}

function parseEmailArg(argv: string[]): EmailAliases {
  // Poor man`s multiple args support
  // https://github.com/tj/commander.js/issues/531
  const aliases = {};
  const addToAliases = (aliasInput: string): void => {
    if (aliasInput.indexOf('=') > 0) {
      const email = aliasInput.substring(0, aliasInput.indexOf('=')).trim();
      const alias = aliasInput.substring(aliasInput.indexOf('=') + 1).trim();
      aliases[email] = alias;
      return;
    }
    console.error('ERROR: Invalid alias: ' + aliasInput);
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    let n = i <= argv.length - 1 ? argv[i + 1] : undefined;
    if (k == '-e' || k == '--email') {
      addToAliases(n);
    } else if (k.startsWith('--email=')) {
      n = k.substring(k.indexOf('=') + 1);
      addToAliases(n);
    }
  }

  return aliases;
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

// Promisify nodegit's API of getting all commits in repository
async function getCommits(
  gitPath: string,
  branch: string | null,
  config: Config,
): Promise<Commit[]> {
  const repo: Repository = await git.Repository.open(gitPath);
  const allReferences = await getAllReferences(repo);

  let references;
  if (branch) {
    references = allReferences.filter((r) => r === 'refs/heads/' + branch);
  } else {
    references = allReferences.filter((r) => r.match(/refs\/heads\/.*/));
  }

  const allCommits = [];
  const latestBranchCommits: Commit[] = await Promise.all(
    references.map((branchName) => getBranchLatestCommit(repo, branchName)),
  );
  for (const latestCommit of latestBranchCommits) {
    // TODO: This is a sync loop with an parallelizable call. Make Promise?
    const branchCommits = await getBranchCommits(latestCommit, config);
    branchCommits.forEach((c) => allCommits.push(c));
  }

  // Multiple branches might share commits, so take unique
  const uniqueCommits = _.uniq(allCommits, function (item, key, a) {
    return item.sha;
  });

  if (config.mergeRequest) {
    return uniqueCommits;
  }

  const isNotMergeCommit = (commit) => !commit.message.startsWith('Merge ');
  return uniqueCommits.filter(isNotMergeCommit);
}

function getAllReferences(repo: Repository): Promise<string[]> {
  return repo.getReferenceNames(git.Reference.TYPE.ALL);
}

async function getBranchLatestCommit(
  repo: Repository,
  branchName: string,
): Promise<Commit> {
  return await repo.getBranch(branchName).then(function (reference) {
    return repo.getBranchCommit(reference.name());
  });
}

async function getBranchCommits(
  branchLatestCommit: Commit,
  config: Config,
): Promise<Commit[]> {
  return new bluebird(function (resolve, reject) {
    const history = branchLatestCommit.history();
    const commits = [];

    history.on('commit', function (commit) {
      let author = null;
      if (!_.isNull(commit.author())) {
        author = {
          name: commit.author().name(),
          email: commit.author().email(),
        };
      }

      const commitData = {
        sha: commit.sha(),
        date: commit.date(),
        message: commit.message(),
        author: author,
      };

      let isValidSince = true;
      const sinceAlways = config.since === 'always' || !config.since;
      if (
        sinceAlways ||
        moment(commitData.date.toISOString()).isAfter(config.since)
      ) {
        isValidSince = true;
      } else {
        isValidSince = false;
      }

      let isValidUntil = true;
      const untilAlways = config.until === 'always' || !config.until;
      if (
        untilAlways ||
        moment(commitData.date.toISOString()).isBefore(config.until)
      ) {
        isValidUntil = true;
      } else {
        isValidUntil = false;
      }

      if (isValidSince && isValidUntil) {
        commits.push(commitData);
      }
    });

    history.on('end', function () {
      resolve(commits);
    });

    history.on('error', function (err) {
      reject(err);
    });

    // Start emitting events.
    history.start();
  });
}

main();
