import { Config, HomeDirectoryConfig } from './types';
import { readHomeDirectoryConfig } from './files';

const moment = require('moment');

const DATE_FORMAT = 'YYYY-MM-DD';

export const HOMEDIR_CONFIG_FILE_NAME = '.timesheetrc';

export const defaultConfig: Config = {
  // Maximum time diff between 2 subsequent commits in minutes which are
  // counted to be in the same coding "session"
  maxCommitDiffInMinutes: 2 * 60,

  // How many minutes should be added for the first commit of coding session
  firstCommitAdditionInMinutes: 2 * 60,

  // Include commits since time x
  since: 'always',
  until: 'always',

  // Include merge requests
  countMerges: true,

  // Git repo
  gitPaths: ['.'],

  // Aliases of emails for grouping the same activity as one person
  emailAliases: {
    'linus@torvalds.com': 'linus@linux.com',
  },
  branch: null,
  authors: []
};

function parseInputDate(inputDate: string | Date): Date | 'always' {
  if (inputDate instanceof Date) {
    return inputDate;
  }
  switch (inputDate) {
    case 'today':
      return moment().startOf('day');
    case 'yesterday':
      return moment().startOf('day').subtract(1, 'day');
    case 'thisweek':
      return moment().startOf('week');
    case 'lastweek':
      return moment().startOf('week').subtract(1, 'week');
    case 'thismonth':
      return moment().startOf('month');
    case 'lastmonth':
      return moment().startOf('month').subtract(1, 'month');
    case 'always':
      return 'always';
    default:
      // XXX: Moment tries to parse anything, results might be weird
      return moment(inputDate, DATE_FORMAT);
  }
}

function getHomeDirectoryConfig(): Partial<HomeDirectoryConfig> {
  try {
    const config = readHomeDirectoryConfig(HOMEDIR_CONFIG_FILE_NAME);
    console.log(`Using config from ${HOMEDIR_CONFIG_FILE_NAME}`);
    return config;
  } catch (error) {
    return {};
  }
}

export function getConfig(overrides: Partial<Config>): Config {
  const homeDirConfig = getHomeDirectoryConfig();
  const config = { ...defaultConfig, ...homeDirConfig, ...overrides };
  config.since = parseInputDate(config.since);
  config.until = parseInputDate(config.until);
  if (config.repositories && config.gitPaths.length === 0) {
    config.gitPaths = config.repositories.map(repo => {
      if (typeof(repo) === 'string') {
        return repo
      }
      return repo.path
    })
  }
  // TODO: Verify that each gitPath is a valid repository
  return config;
}
