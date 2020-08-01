# Contribution documentation

Pull requests and contributions are warmly welcome.

## Get started with development

- [Install local environment](#install-environment).

## General project stuff

This package uses npm/node tools just in the developer environment. NPM scripts
are used to run tasks.

## Install environment

Install tools needed for development:

    yarn

## Formatting and linting

The project is set up with precommit hooks that will run prettier on the code, 
and stop commits containing linting errors.

If you don't want to run these on each commit, modify or delete your 
`.git/hooks/pre-commit` file. You should then run and fix these before making a PR. 

## Test

Running tests:

    yarn test

## Release

    yarn release
