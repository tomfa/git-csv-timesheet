import { Config } from './types';

const moment = require('moment');

const DATE_FORMAT = 'YYYY-MM-DD';

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
  gitPath: '.',

  // Aliases of emails for grouping the same activity as one person
  emailAliases: {
    'linus@torvalds.com': 'linus@linux.com',
  },
  branch: null,
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
    case 'always':
      return 'always';
    default:
      // XXX: Moment tries to parse anything, results might be weird
      return moment(inputDate, DATE_FORMAT);
  }
}

export function getConfig(overrides: Partial<Config>): Config {
  const config = { ...defaultConfig, ...overrides };
  config.since = parseInputDate(config.since);
  config.until = parseInputDate(config.until);
  return config;
}
