# git-csv-timesheet

> Logging hours? No thanks. Let git-csv-timesheet estimate time spent and print out a csv.

![Photo by Malvestida Magazine on Unsplash](https://github.com/tomfa/git-csv-timesheet/raw/master/docs/splash.jpg)

## Install

```
yarn global add git-csv-timesheet

# or with npm

npm install -g git-csv-timesheet
```

## Basic usage

```bash
$ timesheet --authors me@example.com --since thismonth
date;hours
2020-07-01;7.5
2020-07-02;8
2020-07-03;10

$ timesheet  \
  --authors me@example.com \
  --since thismonth \
  --repositories /usr/repos/frontend,/usr/repos/backend
date;hours
2020-07-03;/usr/repos/frontend;1.4
2020-07-05;/usr/repos/backend;1.7
2020-07-06;/usr/repos/backend;2.7
2020-07-09;/usr/repos/frontend;1.2
2020-07-13;/usr/repos/frontend;3.2
2020-07-16;/usr/repos/frontend;2.4
2020-07-16;/usr/repos/backend;3.9
2020-07-27;/usr/repos/frontend;2.0
2020-07-28;/usr/repos/frontend;4.1

# Write to file
$ timesheet > report.csv
```

[git-csv-timesheet](https://github.comt/tomfa/git-csv-timesheet) will by default print out time spent this month in the current repository.

- For more advanced use, see [Advanced usage](#advanced-usage).
- To override month, print for a week, year or specified date range, see [time range options](#time-range).
- To gather data from multiple repositories at once, see [timesheetrc config](#timesheetrc-config).
- To gather data on individual tasks, see [task tracking](#task-tracking).

[git-csv-timesheet](https://github.comt/tomfa/git-csv-timesheet) guesses the time spent on individual repositories based on
timestamps of git commits. Read more about [how it works](#how-it-works) and [configuring assumptions](#advanced-usage).

**The generated output might not be accurate enough to use for billing.**

## How it works

The algorithm for estimating hours is quite simple. For each author in the commit history, do the following:

<br><br>

![](https://github.com/tomfa/git-csv-timesheet/raw/master/docs/step0.png)

_Go through all commits and compare the difference between
them in time._

<br><br><br>

![](https://github.com/tomfa/git-csv-timesheet/raw/master/docs/step1.png)

_If the difference is smaller or equal then a given threshold, group the commits
to a same coding session._

<br><br><br>

![](https://github.com/tomfa/git-csv-timesheet/raw/master/docs/step2.png)

_If the difference is bigger than a given threshold, the coding session is finished._

<br><br><br>

![](https://github.com/tomfa/git-csv-timesheet/raw/master/docs/step3.png)

_To compensate the first commit whose work is unknown, we add extra hours to the coding session._

<br><br><br>

![](https://github.com/tomfa/git-csv-timesheet/raw/master/docs/step4.png)

_Continue until we have determined all coding sessions and sum the hours
made by individual authors._

<br>

_The algorithm comes from [@kimmobrunfeldt/git-hours](https://github.com/kimmobrunfeldt/git-hours) and is about [30 lines of code](https://github.com/kimmobrunfeldt/git-hours/blob/8aaeee237cb9d9028e7a2592a25ad8468b1f45e4/index.js#L114-L143)_.

## Options

### Advanced usage
```
Usage: timesheet [options]

Options:
  -V, --version                         output the version number
  -a, --authors [email@gmail.com]       Only care about commits from these
                                        emails.
  -d, --max-commit-diff [minutes]       max minutes between commits counted as
                                        one session.
                                        [default: 180]
  -f, --first-commit-add [minutes]      how many minutes first commit of
                                        session should add to total.
                                        [default: 60]
  -s, --since [date]                    Analyze data since date (including).
                                        [today|lastweek|thismonth|yyyy-mm-dd]
                                        [default: always]
  -u, --until [date]                    Analyze data until date (excluding).
                                        [today|lastweek|thismonth|yyyy-mm-dd]
                                        [default: always]
  -r, --repositories [path,other-path]  Git repositories to analyze.
                                        [default: .]
  -e, --email [emailOther=emailMain]    Group person by email.
  -m, --merge-request [false|true]      Include merge requests into
                                        calculation.
                                        [default: true]
  -i, --ignore-timesheetrc              Ignores .timesheetrc from home
                                        directory.
                                        [default: false]
  -j, --json                            Reports in JSON format.
                                        [default: false]
  -v --verbose                          Prints extra stats
                                        [default: false]
  -D --debug                            Prints debug information
                                        [default: false]
  -h, --help                            display help for command

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
```

## Config

### .timesheetrc config

By default, the repository parameter will check the current git repository. 
You can also summarize multiple repositories by specifying a config.

```bash
➜  git:(master) timesheet --week --config ~/.timesheetrc
date;project;repository;hours
2020-07-27;Personal blog;@tomfa/notes;3.5
2020-07-27;Personal blog;@tomfa/notes-frontend;1
2020-07-27;Client 1;@client/dashboard;3
2020-07-28;Client 1;@client/app;8
2020-07-28;Client 1;client/backend;2
# etc
```

The config has the following structure:

```json
{
  "repositories": [
    { "project": "Personal blog", "path": "/Users/tomfa/repos/notes" },
    { "project": "Personal blog", "path": "/Users/tomfa/repos/notes-backend" },
    "/Users/tomfa/repos/random-project",
    {
      "project": "Client 1",
      "path": "/Users/tomfa/repos/app",
      "trackTasks": true
    },
    {
      "project": "Client 1",
      "path": "/Users/tomfa/repos/backend",
      "trackTasks": true,
      "countMerges": false
    }
  ],
  "maxCommitDiffInMinutes": 120,
  "firstCommitAdditionInMinutes": 60,
  "countMerges": true,
  "authors": ["me@companymail.com"],
  "emailAliases": {
    "me@gmail.com": "me@companymail.com",
    "me@oldworkplace.com": "me@companymail.com"
  }
}
```

The config above will:

- track commits by author "me@companymail.com"
- count commits made by "me@gmail.com" and "me@oldworkplace.com" towards the author "me@companymail.com"
- add 60 minutes before first commits (for a day)
- "glue together" commits that are less than 2 hours between.
- count merges as your commit (TODO: [#16](https://github.com/tomfa/git-csv-timesheet/issues/16))except for `/Users/tomfa/repos/backend`, where it's overriden)
- TODO: [#17](https://github.com/tomfa/git-csv-timesheet/issues/10) count 1 repo for a "Unspecified" project (`/Users/tomfa/repos/random-project`)
- TODO: [#17](https://github.com/tomfa/git-csv-timesheet/issues/10) count 2 repos each for the two projects `Client 1"` and `Personal blog`.
- TODO: [#16](https://github.com/tomfa/git-csv-timesheet/issues/16) [#10](https://github.com/tomfa/git-csv-timesheet/issues/10) `Client 1` repos: it will split up the work into tasks specified in commits (see below.)

### Task tracking

_TODO: [#10](https://github.com/tomfa/git-csv-timesheet/issues/10) This feature  is not yet implemented._

If you need to specify what you've worked on (_I'm sorry_), [git-csv-timesheet](https://github.comt/tomfa/git-csv-timesheet) can look for `#` in your commits to categorise work based on individual tasks.

```bash
> timesheet --week --config ~/.timesheetrc --tasks
date;project;repository;task;hours
2020-07-27;Personal blog;@tomfa/notes;#14;1.5
2020-07-27;Personal blog;@tomfa/notes;#13;2.5
2020-07-27;Personal blog;@tomfa/notes-frontend;#12;1
2020-07-27;Client 1;@client/dashboard;#152;2
2020-07-27;Client 1;@client/dashboard;;2
2020-07-28;Client 1;@client/app;#81;4
2020-07-28;Client 1;@client/app;#84;2
2020-07-28;Client 1;@client/app;#86;1
2020-07-28;Client 1;@client/app;;1
2020-07-28;Client 1;@client/backend;#421;2
# etc
```

This requires that your commits contain a task reference, with git commits ala:

```git
Fix bug with login form

#TASK-123
```

_The commit above would add its time to the task `#TASK-123`. The script includes everything after the first `#`, up to a space or line shift._

Commits without a task reference are added to a separate line where the task column is blank
