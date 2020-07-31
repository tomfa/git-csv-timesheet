#!/usr/bin/env node

import { getConfig } from '../config';
import { parseCommandLineArgs } from "./args";
import { analyzeTimeSpent } from '../analyzer';
import { printAsCSV } from '../print';


const printReport = () => {
  const commandLineArgs = parseCommandLineArgs();
  const config = getConfig(commandLineArgs);
  analyzeTimeSpent(config).then((work) =>
    printAsCSV(work)
  );
}

printReport();

