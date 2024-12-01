import { Model, ModelState } from './model';
import { Milliseconds } from './types';
import { Bsky } from './utils/bsky';
import { envVars, printEnvVars } from './utils/env-vars';
import { tabulateText } from './utils/tabulate-text';

run();

async function run(): Promise<void> {
  if (envVars.PRINT_ENV_VARS) {
    printEnvVars();
  }

  const bsky = new Bsky({
    identifier: envVars.BLUESKY_ACCOUNT_NAME,
    password: envVars.BLUESKY_PASSWORD,
  });

  const model = new Model(envVars.BLUESKY_ACCOUNT_NAME);
  const stateBefore = await model.getSummary();

  const accountInfo = await bsky.getAccountInfo();
  await model.setAccountInfo(accountInfo);

  const followers = await bsky.getFollowers();
  await model.processFollowers(followers);

  const follows = await bsky.getFollows();
  await model.processFollows(follows);

  const stateAfter = await model.getSummary();

  console.log(getSummary(stateBefore, stateAfter));

  await model.flush();
}

function getSummary(
  before: ModelState | undefined,
  after: ModelState | undefined
): string {
  const date = (timestamp?: Milliseconds) =>
    timestamp
      ? new Date(timestamp).toLocaleString('JA-en', {
          hour12: false,
          timeZone: 'Asia/Tokyo',
        }) + ' JST'
      : '-';
  const data = [
    ['', 'Followers', 'Follows'],
    [
      `Before (${date(before?.timestamp)})`,
      before?.followers.toString() || '',
      before?.follows.toString() || '',
    ],
    [
      `After (${date(after?.timestamp)})`,
      after?.followers.toString() || '',
      after?.follows.toString() || '',
    ],
  ];

  return tabulateText(data).join('\n');
}
