import { AppBskyActorDefs, Did } from '@atproto/api';
import { join } from 'path';

import { AccountListDiff, AccountListSnapshot, ModelData, ModelState } from '.';
import { JsonDb } from '../utils/json-db';
import { DeepReadonly, UtcDate } from '../types';

export class Model {
  private readonly db: JsonDb<ModelData>;

  constructor(handleName: string) {
    const initialData: ModelData = {
      account: handleName,
      followers: {
        diffs: [],
      },
      follows: {
        diffs: [],
      },
      knownAccounts: [],
    };

    const filepath = join('data', `${handleName.replace(/:@/g, '_')}.json`);
    this.db = new JsonDb<ModelData>(filepath, { initialData });
  }

  public async flush(): Promise<void> {
    await this.db.isReady();
    await this.db.flush();
  }

  public async getSummary(): Promise<ModelState | undefined> {
    await this.db.isReady();
    const data = this.db.getData();

    // timestamp of the last update (diff), if no diffs then the initial data
    const timestamp = Math.max(
      ...[
        data.followers.diffs[data.followers.diffs.length - 1]?.date,
        data.follows.diffs[data.follows.diffs.length - 1]?.date,
        data.followers.initial?.date,
        data.follows.initial?.date,
      ]
        .filter((date) => date !== undefined)
        .map((date) => new Date(date).getTime())
    );

    if (!timestamp) return;

    return {
      timestamp,
      followers: data.followers.current?.accounts.length || 0,
      follows: data.follows.current?.accounts.length || 0,
    };
  }

  public async setAccountInfo(
    info: AppBskyActorDefs.ProfileView
  ): Promise<void> {
    await this.db.isReady();

    this.db.update({ account: info.did as Did });

    await this.addAccount(info);
  }

  public async processFollowers(
    followers: AppBskyActorDefs.ProfileView[]
  ): Promise<void> {
    await this.processAccountList('followers', followers);
  }

  public async processFollows(
    follows: AppBskyActorDefs.ProfileView[]
  ): Promise<void> {
    await this.processAccountList('follows', follows);
  }

  private async processAccountList(
    type: 'followers' | 'follows',
    accounts: AppBskyActorDefs.ProfileView[]
  ): Promise<void> {
    await this.db.isReady();
    const date = new Date().toUTCString();

    // update account info
    for (const account of accounts) {
      this.addAccount(account);
    }

    // calculate the current state
    const data = this.db.getData();
    const newAccounts = accounts.map((acc) => acc.did as Did);
    const current = data[type].current;
    const newCurrent: AccountListSnapshot = {
      date,
      accounts: newAccounts,
    };

    // set the current or initial state
    if (!current) {
      this.db.update({
        [type]: {
          current: newCurrent,
          initial: newCurrent,
        },
      });
    } else {
      // calculate the diff
      const diff = this.calculateAccountListDiff(current, newCurrent);
      if (!diff) return;
      this.db.update({
        [type]: {
          current: newCurrent,
          diffs: [...data[type].diffs, diff],
        },
      });
    }
  }

  /**
   * Add an account to the list of known accounts
   */
  private async addAccount(
    account: AppBskyActorDefs.ProfileView,
    onlyIfNew?: boolean
  ): Promise<void> {
    await this.db.isReady();

    const data = this.db.getData();
    const index = data.knownAccounts.findIndex(
      (acc) => acc.did === account.did
    );

    if (index === -1) {
      this.db.update({
        knownAccounts: [...data.knownAccounts, account],
      });
      return;
    }

    if (onlyIfNew) return;

    this.db.update({
      knownAccounts: [
        ...data.knownAccounts.slice(0, index),
        account,
        ...data.knownAccounts.slice(index + 1),
      ],
    });
  }

  /**
   * Calculate a diff object between two snapshots
   *
   * @returns The diff object or `undefined` if they are the same
   */
  private calculateAccountListDiff(
    before: DeepReadonly<AccountListSnapshot>,
    after: DeepReadonly<AccountListSnapshot>,
    date?: UtcDate
  ): AccountListDiff | undefined {
    const added = after.accounts.filter(
      (did) => !before.accounts.includes(did)
    );
    const removed = before.accounts.filter(
      (did) => !after.accounts.includes(did)
    );

    const diff: AccountListDiff = {
      date: date || new Date().toUTCString(),
    };

    if (added.length) {
      diff.added = added;
    }
    if (removed.length) {
      diff.removed = removed;
    }

    const areThereChanges = added.length > 0 || removed.length > 0;
    return areThereChanges ? diff : undefined;
  }
}
