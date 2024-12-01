import { AppBskyActorDefs, Did } from '@atproto/api';
import { Milliseconds, UtcDate } from '../types';

export { Model } from './model-class';

export type ModelData = {
  account: string;
  followers: {
    current?: AccountListSnapshot;
    initial?: AccountListSnapshot;
    diffs: AccountListDiff[];
  };
  follows: {
    current?: AccountListSnapshot;
    initial?: AccountListSnapshot;
    diffs: AccountListDiff[];
  };
  knownAccounts: AppBskyActorDefs.ProfileView[];
};

export type AccountListSnapshot = {
  date: UtcDate;
  accounts: Did[];
};

export type AccountListDiff = {
  date: UtcDate;
  added?: Did[];
  removed?: Did[];
};

export type ModelState = {
  timestamp: Milliseconds;
  followers: number;
  follows: number;
};
