import { Config, EmailAliases } from '../types';
import { defaultConfig } from '../config';
import logger from "../logger";

const program = require('commander');

export function parseCommandLineArgs(): Partial<Config> {
  function int(val) {
    return parseInt(val, 10);
  }

  program
    .version(require('../../package.json').version)
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
      '-e, --email [emailOther=emailMain,emailSecondary=emailMail]',
      'Group person by email address.' + ' Default: none',
      parseDictArg(',', '='),
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
        defaultConfig.countMerges,
      parseBooleanArg,
    )
    .option(
      '-r, --repositories [path,other-path]',
      'Git repositories to analyze.' +
        ' Default: ' +
        defaultConfig.repositories.join(' and '),
      parseArrayArg(','),
    )
    .option(
      '-b, --branch [branch-name]',
      'Analyze only data on the specified branch. Default: ' +
        defaultConfig.branch,
      String,
    )
    .option(
      '-A, --authors [email@gmail.com,email@example.com]',
      'Only care about commits from these emails. Default: ' +
        (defaultConfig.authors.length > 0
          ? defaultConfig.authors.join(',')
          : 'all'),
      parseArrayArg(','),
    )
    .option(
      '-i, --ignore-timesheetrc',
      'Ignores .timesheetrc fi;e from home directory. Default: ' +
        defaultConfig.ignoreConfigFile,
      parseArgTrueIfSpecified
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

  const confArgs: Config = {
    maxCommitDiffInMinutes: program.maxCommitDiff,
    firstCommitAdditionInMinutes: program.firstCommitAdd,
    since: program.since,
    until: program.until,
    repositories: program.repositories,
    countMerges: program.countMerges,
    branch: program.branch,
    emailAliases: program.email,
    ignoreConfigFile: program.ignoreTimesheetrc,
    authors: program.authors,
  };

  for (let [key, value] of Object.entries(confArgs)) {
    if (value === undefined) {
      delete confArgs[key];
    }
  }

  return confArgs;
}

const parseBooleanArg = (value: string) =>
  value ? value.trim() === 'true' : undefined;
const parseArrayArg = (separator: string) => (value: string) =>
  value.trim() ? value.split(',').map((v) => v.trim()) : undefined;
const parseDictArg = (separator: string, keyValueSeparator: string) => (
  argumentValue: string,
) => {
  if (!argumentValue) {
    return undefined;
  }
  const map = argumentValue.split(separator).reduce((aliasMap, singleAlias) => {
    const [key, value] = singleAlias.split(keyValueSeparator);
    if (!value) {
      logger.error(
        `Argument ${argumentValue} is invalid.`,
        `Part "${singleAlias}" is missing a "${keyValueSeparator}".`,
      );
    } else {
      aliasMap[key] = value;
    }
    return aliasMap;
  }, {});

  if (Object.keys(map).length === 0) {
    return undefined;
  }
  return map;
};
const parseArgTrueIfSpecified = () => true;
