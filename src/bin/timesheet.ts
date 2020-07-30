#!/usr/bin/env node

import { getConfig } from '../config';
import { parseCommandLineArgs } from "./args";
import { analyzeTimeSpentForRepository } from '../analyzer';

const commandLineArgs = parseCommandLineArgs();
const config = getConfig(commandLineArgs);

analyzeTimeSpentForRepository(config).then((work) =>
  console.log(JSON.stringify(work, undefined, 2)),
);
