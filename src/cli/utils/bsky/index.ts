import {
  AppBskyActorDefs,
  AppBskyGraphGetFollowers,
  AppBskyGraphGetFollows,
  AtpAgent,
  ComAtprotoServerCreateSession,
} from '@atproto/api';
import { OptionalPromise } from '../../types';

export type BskyOptions = {
  /** Account identifier as `danikaze.bsky.social` */
  identifier: string;
  /** base64 encoded password */
  password: string;
};

export class Bsky {
  protected readonly agent: AtpAgent;
  protected loggedIn: ComAtprotoServerCreateSession.Response | undefined;

  /**
   * Account identifier as `danikaze.bsky.social`
   */
  private readonly identifier: string;
  /**
   * base64 encoded password
   * (not raw so it doesn't appears in memory -usually-)
   */
  private readonly password: string;

  constructor(options: BskyOptions) {
    this.agent = new AtpAgent({ service: 'https://bsky.social' });
    this.identifier = options.identifier;
    this.password = options.password;
  }

  /**
   * @returns Information of the current account
   */
  public async getAccountInfo(): Promise<AppBskyActorDefs.ProfileView> {
    const { data } = await this.withLogin(() =>
      this.agent.getProfile({ actor: this.identifier })
    );
    return data;
  }

  /**
   * @returns All the followers of the current account
   */
  public async getFollowers(): Promise<AppBskyActorDefs.ProfileView[]> {
    const MAX_LIMIT = 100;

    const followers: AppBskyActorDefs.ProfileView[] = [];
    let cursor: string | undefined;
    let res: AppBskyGraphGetFollowers.Response;
    do {
      res = await this.withLogin(() =>
        this.agent.getFollowers({
          actor: this.identifier,
          limit: MAX_LIMIT,
          cursor: cursor,
        })
      );
      cursor = res.data.cursor;
      followers.push(...res.data.followers);
    } while (res.data.cursor);
    return followers;
  }

  /**
   * @returns All the follows for the current account
   */
  public async getFollows(): Promise<AppBskyActorDefs.ProfileView[]> {
    const MAX_LIMIT = 100;

    const followers: AppBskyActorDefs.ProfileView[] = [];
    let cursor: string | undefined;
    let res: AppBskyGraphGetFollows.Response;
    do {
      res = await this.withLogin(() =>
        this.agent.getFollows({
          actor: this.identifier,
          limit: MAX_LIMIT,
          cursor: cursor,
        })
      );
      cursor = res.data.cursor;
      followers.push(...res.data.follows);
    } while (res.data.cursor);
    return followers;
  }

  /**
   * Wraps a callback making sure that the agent is logged-in
   */
  protected async withLogin<Res>(cb: () => OptionalPromise<Res>): Promise<Res> {
    // TODO: Handle 2FA :(
    if (!this.loggedIn) {
      this.loggedIn = await this.agent.login({
        identifier: this.identifier,
        password: Buffer.from(this.password, 'base64').toString(),
      });
    }

    return await cb();
  }
}
