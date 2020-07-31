#!/usr/bin/env node

import { getConfig } from '../config';
import { parseCommandLineArgs } from "./args";
import { analyzeTimeSpentForRepository } from '../analyzer';
import { printAsCSV } from '../print';


const printReport = () => {
  const commandLineArgs = parseCommandLineArgs();
  const config = getConfig(commandLineArgs);
  analyzeTimeSpentForRepository(config).then((work) =>
    printAsCSV(work)
  );
}

printReport();

