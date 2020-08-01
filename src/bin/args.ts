import program from 'commander';

import { Config } from '../types';
import { defaultConfig } from '../config';
import logger from '../logger';

export function parseCommandLineArgs(): Partial<Config> {
  function int(val) {
    return parseInt(val, 10);
  }

  program
    // eslint-disable-next-line
    .version(require('../../package.json').version)
    .usage('[options]')
    .option(
      '-a, --authors [email@gmail.com]',
      'Only care about commits from these emails.' +
        wrapInDefault(defaultConfig.authors),
      parseArrayArg(','),
    )
    .option(
      '-d, --max-commit-diff [minutes]',
      'max minutes between commits counted as one session.' +
        wrapInDefault(defaultConfig.maxCommitDiffInMinutes),
      int,
    )
    .option(
      '-f, --first-commit-add [minutes]',
      'how many minutes first commit of session should add to total.' +
        wrapInDefault(defaultConfig.firstCommitAdditionInMinutes),
      int,
    )
    .option(
      '-s, --since [date]',
      'Analyze data since date (including). \n' +
        '[today|lastweek|thismonth|yyyy-mm-dd]' +
        wrapInDefault(defaultConfig.since),
      String,
    )
    .option(
      '-u, --until [date]',
      'Analyze data until date (excluding). \n' +
        '[today|lastweek|thismonth|yyyy-mm-dd]' +
        wrapInDefault(defaultConfig.until),
      String,
    )
    .option(
      '-r, --repositories [path,other-path]',
      'Git repositories to analyze.' +
        wrapInDefault(defaultConfig.repositories.join(',')),
      parseArrayArg(','),
    )
    .option(
      '-e, --email [emailOther=emailMain]',
      'Group person by email.',
      parseDictArg(',', '='),
    )
    .option(
      '-m, --merge-request [false|true]',
      'Include merge requests into calculation.' +
        wrapInDefault(defaultConfig.countMerges),
      parseBooleanArg,
    )
    .option(
      '-i, --ignore-timesheetrc',
      'Ignores .timesheetrc from home directory.' +
        wrapInDefault(defaultConfig.ignoreConfigFile),
      parseArgTrueIfSpecified,
    )
    .option(
      '-j, --json',
      'Reports in JSON format.' + wrapInDefault(defaultConfig.json),
      parseArgTrueIfSpecified,
    )
    .option(
      '-v --verbose',
      'Prints extra stats' + wrapInDefault(defaultConfig.verbose),
      parseArgTrueIfSpecified,
    )
    .option(
      '-D --debug',
      'Prints debug information' + wrapInDefault(defaultConfig.debug),
      parseArgTrueIfSpecified,
    );

  program.on('--help', function () {
    logger.output(`
Examples:

  - Estimate hours of project

   $ timesheet

  - Estimate hours by me@example.com

   $ timesheet -a me@example.com

  - Estimate hours where developers commit seldom

   $ timesheet --max-commit-diff 240

  - Estimate hours in when working 5 hours before first commit of day

   $ timesheet --first-commit-add 300

  - Estimate hours work this month

   $ timesheet --since thismonth

  - Estimate hours work until 2020-01-01

   $ timesheet --until 2020-01-01

  For more details, visit https://github.com/tomfa/git-csv-timesheet
  `);
  });

  program.parse(process.argv);

  const confArgs: Config = {
    maxCommitDiffInMinutes: program.maxCommitDiff,
    firstCommitAdditionInMinutes: program.firstCommitAdd,
    since: program.since,
    until: program.until,
    repositories: program.repositories,
    countMerges: program.countMerges,
    emailAliases: program.email,
    ignoreConfigFile: program.ignoreTimesheetrc,
    authors: program.authors,
    json: program.json,
    verbose: program.verbose,
    debug: program.debug,
  };

  Object.entries(confArgs).forEach(([key, value]) => {
    if (value === undefined) {
      delete confArgs[key];
    }
  });

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
      return aliasMap;
    }
    return { ...aliasMap, [key]: value };
  }, {});

  if (Object.keys(map).length === 0) {
    return undefined;
  }
  return map;
};
const parseArgTrueIfSpecified = () => true;
const wrapInDefault = (value: any): string => {
  if (value === undefined) {
    return '';
  }
  if (value instanceof Array) {
    if (value.length === 0) {
      return '';
    }
    // eslint-disable-next-line no-param-reassign
    value = value.join(',');
  }
  return `\n[default: ${value}]`;
};
