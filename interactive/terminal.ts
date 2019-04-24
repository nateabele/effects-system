import { pipe, slice, map, match, fromPairs, unary } from 'ramda';

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export const toFlags = pipe<string[], string[], string[][], [string, string][], { [key: string]: string }>(
  slice(2, Infinity) as (a: any) => string[],
  map(match(/^--([^=]+)=(.+)$/)),
  map(slice(1, 3) as unknown as (arg: string[]) => [string, string]),
  fromPairs
);

export const writeHook = (filePath: string, data: () => string) => {
  process.on('exit', () => {
    fs.writeFileSync(path.resolve(process.cwd(), filePath), data());
  });
};

export const readLog = (filePath: string) => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath)).toString('utf8'));
  } catch (e) {
    console.error(`Could not load transaction log from file ${filePath} when running in ${process.cwd()}`, e);
  }
};

export const prompt = (preamble: string[], question: string) => new Promise<string>((resolve) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  preamble.forEach(unary(rl.write.bind(rl)));

  rl.question(`${question} `, (result: string) => {
    resolve(result);
    rl.close();
  });
});
