# git-csv-timesheet

> Logging hours? No thanks. Let git-csv-timesheet estimate time spent and print out a csv. 


## Install
```
yarn add global git-csv-timesheet

# or with npm 

npm install -g git-csv-timesheet
```


## Basic usage

```bash
$ timesheet  
date;hours
2020-07-01;7.5
2020-07-02;8
2020-07-03;10

# Write to file
$ timesheet > report.csv 
```

[git-csv-timesheet](.) will by default print out time spent this month in the current repository. 

- For more advanced use, see [Advanced usage](#advanced-usage).
- To override month, print for a week, year or  specified date range, see [time range options](#time-range).
- To gather data from multiple repositories at once, see [timesheetrc config](#timesheetrc-config).
- To gather data on individual tasks, see [individual tasks](#task-tracking).

[git-csv-timesheet](.) guesses the time spent on individual repositories based on 
timestamps of git commits. Read more about [how it works](#how_it_works) and [configuring assumptions](#advanced-usage).

**The generated output might not be accurate enough to use for billing.**

## How it works

The algorithm for estimating hours is quite simple. For each author in the commit history, do the following:

<br><br>

![](docs/step0.png)

*Go through all commits and compare the difference between
them in time.*

<br><br><br>

![](docs/step1.png)

*If the difference is smaller or equal then a given threshold, group the commits
to a same coding session.*

<br><br><br>

![](docs/step2.png)

*If the difference is bigger than a given threshold, the coding session is finished.*

<br><br><br>

![](docs/step3.png)

*To compensate the first commit whose work is unknown, we add extra hours to the coding session.*

<br><br><br>

![](docs/step4.png)

*Continue until we have determined all coding sessions and sum the hours
made by individual authors.*

<br>

The algorithm comes from [@kimmobrunfeldt/git-hours](https://github.com/kimmobrunfeldt/git-hours) and is about [30 lines of code](https://github.com/kimmobrunfeldt/git-hours/blob/8aaeee237cb9d9028e7a2592a25ad8468b1f45e4/index.js#L114-L143).

## Options

### Advanced usage

    Usage: timesheet [options]

    Options:
      -h, --help                                 output usage information
      -V, --version                              output the version number
      -c, --config=[path-to-config]              reads config from this path
      -f, --from=[YYYY-MM-DD]                    counts commits from this date (including)
      -t, --to=[YYYY-MM-DD]                      counts commits from to date (excluding)
      -M, --month=[1...12]                       counts commits from this month (defaults to current month, unless year is specified. can not be used with week, from or to)
      -Y, --year=[YYYY]                          counts commits from this year (defaults to current year)
      -W, --week=[1-53]                          counts commits from this week (can not be used with month, from or to)
      -T, --tasks                                splits usage inside repository based on #task references.
      -d, --max-commit-diff=[max-commit-diff]    maximum difference in minutes between commits counted to one session. Default: 120
      -a, --first-commit-add=[first-commit-add]  how many minutes first commit of session should add to total. Default: 120
      -m, --merge-request=[false|true]           Include merge requests into calculation.  Default: true

    Examples:

     - Estimate hours of project

       $ timesheet

     - Estimate hours in repository where developers commit more seldom: they might have 4h(240min) pause between commits

       $ timesheet --max-commit-diff 240

     - Estimate hours in repository where developer works 5 hours before first commit in day

       $ timesheet --first-commit-add 300
       
    - Estimate hours betwen two dates

       $ timesheet --from=2020-01-03 --to=2020-03-05
       
    - Estime hours for a certain month
    
       $ timesheet --month=1
       
    - Estime hours spent on each task
    
       $ timesheet --tasks   

    - Estimate hours work in repository on the "master" branch
    
       $ timesheet --branch master


### Time range

[git-csv-timesheet](.) will by default print out time spent this month in the current repository.
You can override the time frame with `--week`, `--month`, `--year`, `--from` and ` --to` or `--all`.
```bash
# Prints current week
timesheet --week  

# Prints week 36 in this year
timesheet --week=36

# Prints february of this year
timesheet --month=2

# Prints current year
timesheet --year

# Prints whole of 2019
timesheet --year=2019

# Prints between 3rd of Jan  -> 5th of Mar (YYYY-MM-DD)
# This includes whole of 2020-01-03, but NOT 2020-03-05 
timesheet --from=2020-01-03 --to=2020-03-05

# Prints data for all time up to today
timesheet --all  
```

## Config

### .timesheetrc config

By default, the command will check the current git repository. You can also summarize multiple repositories by specifying a config.

```bash
➜  git:(master) timesheet --week --config=~/.timesheetrc
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
    "/Users/tomfa/repos/git-csv-timesheet",    
    {"project":  "Personal blog", "path": "/Users/tomfa/repos/notes"},
    {"project":  "Personal blog", "path": "/Users/tomfa/repos/notes-backend"},
    {"project":  "Client 1", "path": "/Users/tomfa/repos/app", "trackTasks":  true},
    {"project":  "Client 1", "path": "/Users/tomfa/repos/backend", "trackTasks":  true, "countMerges":  false}
  ],
  "macCommitDiff": 120,
  "firstCommitAdd": 60,
  "countMerges": true,
  "authors": ["me@companymail.com", "me@gmail.com"]  
}
```

The config above will:
- track commits by authors with emails "me@companymail.com" and "me@gmail.com". 
- add 60 minutes before first commits (for a day)
- "glue together" commits that are less than 2 hours between.
- count merges as your commit (except for `/Users/tomfa/repos/backend`, where it's overriden)
- count 1 repo for a "Unspecified" project (`/Users/tomfa/repos/git-csv-timesheet`)
- count 2 repos each for the two projects `Client 1"` and `Personal blog`.
- for the two `Client 1` repos: it will split up the work into tasks specified in commits (see below.) 


### Task tracking

If you need to specify what you've worked on (_I'm sorry_), [git-csv-timesheet](.) can look for `#` in your commits to categorise work based on individual tasks.

```bash
> timesheet --week --config=~/.timesheetrc --tasks
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

