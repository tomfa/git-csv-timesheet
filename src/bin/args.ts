import { Config, EmailAliases } from '../types';
import { defaultConfig } from '../config';

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
