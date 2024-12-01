import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { sync as mkdirpSync } from 'mkdirp';
import { dirname } from 'path';
import { ASSIGN_DEFAULT_OPTIONS, getCustomAssign } from 'super-assign';

import { DeepNullable, DeepPartial, DeepReadonly } from '../../types';

const assignDeepWithDelete = getCustomAssign({
  ...ASSIGN_DEFAULT_OPTIONS,
  deleteValue: null,
});

export interface JsonDbOptions<Data extends object, SerializedData = Data> {
  /**
   * Throttle interval (minimum number of milliseconds between the START of
   * two consecutive sync operations)
   */
  syncThrottle?: number;
  /** When `true`, sync will be called again after `throttleTime` */
  prettify?: boolean;
  /** Data to initialize the file if it doesn't exist first */
  initialData?: Data;
  /** If `true` and the file doesn't exist, throws an error */
  throwIfNotExists?: boolean;
  /**
   * If provided, the callback will be called before writing to disk
   * Note that it can return a copy or the same object modified.
   * If modified, it will affect directly to the internal data.
   *
   * Returning a copy with differnt type allows to have in memory data
   * different than serialized in disk (i.e. to build indices, etc.)
   */
  beforeSync?: (data: Data) => SerializedData;
  /**
   * If provided, it will be called when a write-on-disk operation is finished
   * with data about its execution
   */
  afterSync?: (result: SyncResult) => void;
  /**
   * If the data is serialized, this allows for de-serialization
   */
  afterLoad?: (rawData: SerializedData) => Data;
}

export interface JsonDbMetadata {
  /** Timestamp of when the file was created originally */
  createTime: number;
  /** Last timestamp of when `update` was caled */
  lastUpdate: number;
  /** Last timestamp of when `sync` was called */
  lastSync: number;
}

export type SyncResult = {
  /** Path of the file that was written */
  path: string;
  /** Size in bytes of the written content */
  size: number;
  /** Milliseconds taken to write the content */
  time: number;
};

interface StoredData<SerializedData> {
  data: SerializedData;
  meta: JsonDbMetadata;
}

type ScheduledSync = {
  // the timer only exists once is actually scheduled
  // (after the current operation in progress finishes)
  timer?: ReturnType<typeof setTimeout>;
  // if true, the operation will start asap without timer
  doItNow?: boolean;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

/**
 *
 */
export class JsonDb<Data extends object, SerializedData = Data> {
  /** Metadata */
  public readonly meta: JsonDbMetadata;

  /** Options to use (constructor + default)  */
  private readonly options: JsonDbOptions<Data, SerializedData> &
    Required<
      Pick<
        JsonDbOptions<Data, SerializedData>,
        'syncThrottle' | 'prettify' | 'initialData' | 'throwIfNotExists'
      >
    >;
  /** Path of the file to sync */
  private readonly path: string;
  /** Current state of the data */
  private payload: Data;
  /**
   * Acts like a semaphore, `false` when there's no writting operation being
   * executed at the moment (no multi-thread safe)
   */
  private writing = false;
  /**
   * Data to control the scheduled sync, in case another one is requested
   * while a sync is already in progress
   */
  private scheduled?: ScheduledSync;
  /**
   * Promise that resolves when the instance has finished loading the
   * initial data from disk
   */
  private isInitDone: Promise<void>;

  constructor(path: string, options?: JsonDbOptions<Data, SerializedData>) {
    this.store = this.store.bind(this);

    this.options = {
      syncThrottle: 5000,
      prettify: true,
      initialData: {} as Data,
      throwIfNotExists: false,
      ...options,
    };
    this.path = path;
    this.meta = {
      createTime: Date.now(),
      lastSync: 0,
      lastUpdate: 0,
    };
    this.payload = {} as unknown as Data;

    this.isInitDone = this.read().then((readResult) => {
      if (!readResult) {
        if (this.options.initialData !== undefined) {
          this.payload = this.options.initialData;
        }
      } else {
        this.meta.createTime = readResult.meta.createTime;
        this.meta.lastSync = readResult.meta.lastSync;
        this.meta.lastUpdate = readResult.meta.lastUpdate;
        this.payload = readResult.data;
      }
    });
  }

  /**
   * Small health check to see if the read data is actually from a JsonDb
   *
   * @param raw
   * @returns
   */
  private static isValidData<T>(raw: unknown): raw is StoredData<T> {
    if (!raw) return false;
    const { meta } = raw as StoredData<T>;
    return (
      typeof meta.createTime === 'number' &&
      typeof meta.lastSync === 'number' &&
      typeof meta.lastUpdate === 'number'
    );
  }

  /**
   * @returns Promise resolved when the initial data is read from disk and ready to use
   */
  public isReady(): Promise<void> {
    return this.isInitDone;
  }

  /**
   * Get the latest version of the data (from memory)
   */
  public getData(): DeepReadonly<Data> {
    return this.payload as DeepReadonly<Data>;
  }

  /**
   * Update the cached data and schedule the writing operation to store the
   * latest version on disk asynchronously (and throttled)
   *
   * @param data
   */
  public update(data: DeepNullable<DeepPartial<Data>>): void {
    assignDeepWithDelete(this.payload, data);
    this.meta.lastUpdate = Date.now();
    this.store();
  }

  /**
   * Forces the sync in disk
   *
   * @returns Promise resolved when th data is sync'ed on disk
   */
  public async flush(): Promise<void> {
    await this.store(true);
  }

  /**
   * Read data from disk. Usually done only when creating a `JsonDb` instance
   * to load the database so it can be operated in memory
   *
   * @returns Stored data (payload+meta) or `undefined` if doesn't exist yet
   */
  private async read(): Promise<
    { data: Data; meta: JsonDbMetadata } | undefined
  > {
    if (this.options.throwIfNotExists && !existsSync(this.path)) {
      throw new Error(`File doesn't exist: ${this.path}`);
    }

    const folder = dirname(this.path);
    if (!existsSync(folder)) {
      mkdirpSync(folder);
    }
    if (!existsSync(this.path)) {
      return;
    }

    try {
      const fileContents = (await readFile(this.path)).toString();
      const rawData = JSON.parse(fileContents);
      if (!JsonDb.isValidData<SerializedData>(rawData)) {
        //   logger.warn(`Invalid data when loading ${this.path}`);
        return;
      }

      return {
        data: this.options.afterLoad
          ? this.options.afterLoad(rawData.data)
          : (rawData.data as unknown as Data),
        meta: rawData.meta,
      };
    } catch {
      // logger.warn(`Unknown error while reading data from ${this.path}: ${e}`);
    }
  }

  /**
   * Trigger the storage of the data in memory (`this.payload`) to disk
   *
   * @param doItNow `true` if it was called via flush, to bypass the throttle
   * @returns Promise resolved when the data at the moment of calling this is
   * stored in disk (might include newer data as well)
   */
  private async store(doItNow?: boolean): Promise<void> {
    // if it's already being written, but a new `store()` is requested
    if (this.writing) {
      /// if it's already scheduled
      if (this.scheduled) {
        // just update the doItNow field to re-trigger the sync asap
        this.scheduled.doItNow ||= doItNow;
        // return the scheduled promise so `store` is resolved with it finishes
        return this.scheduled.promise;
      }

      // note that the timer will be set only once the current writing
      // operation finishes (as it might not need to wait)
      this.scheduled = this.getSchedule(doItNow);
      // returns the scheduled promise, not the current one (as the data asked
      // to be stored will be writing in the next operation)
      return this.scheduled.promise;
    }

    // if it was already scheduled
    if (this.scheduled) {
      if (!doItNow) {
        // just wait as long as this one is not urgent
        return this.scheduled?.promise;
      }
      // if this one is urgent, make the scheduled one happen now
    }

    // if the last sync was too recent and this one is not urgent,
    // schedule the next one based on the throttle
    const waitTime = doItNow
      ? 0
      : this.meta.lastSync + this.options.syncThrottle - Date.now();
    if (waitTime > 0) {
      this.scheduled = this.getSchedule(doItNow);
      this.scheduled.timer = setTimeout(this.store, waitTime);
      return this.scheduled.promise;
    }

    /*
     * at this point, whether if it was scheduled or it was forced,
     * the sync operation needs to be called!
     */

    // if scheduled existed, it means this is the execution of that schedule
    const scheduled = this.scheduled;
    this.scheduled = undefined;

    // it's happening now so no need for this to re-trigger if it was scheduled
    clearTimeout(scheduled?.timer);

    this.writing = true;
    try {
      await this.sync();
      // if it was scheduled then resolve its original promise
      scheduled?.resolve();
    } catch (error) {
      // if it was scheduled then reject its original promise
      scheduled?.reject(error);
    }
    this.writing = false;

    // if this.scheduled exists, it means there's was another call while the
    // writing was taking place (but TS thinks it will be `undefined`)
    const newSchedule = this.scheduled as ScheduledSync | undefined;
    if (newSchedule) {
      if (newSchedule.doItNow) {
        // if it's urgent, just handle it now
        this.store(true);
      } else if (!newSchedule.timer) {
        // if it was not urgent, trigger it based on the throttle params
        const waitTime =
          this.meta.lastSync + this.options.syncThrottle - Date.now();
        newSchedule.timer = setTimeout(this.store, waitTime);
      }
    }
  }

  /**
   *
   * @param doItNow
   * @returns
   */
  private getSchedule(doItNow?: boolean): ScheduledSync {
    let resolve!: ScheduledSync['resolve'];
    let reject!: ScheduledSync['reject'];
    const promise = new Promise<void>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });

    // note that the timer will be set only once the current writing
    // operation finishes (as it might not need to wait)
    return {
      doItNow,
      promise,
      resolve,
      reject,
    };
  }

  /**
   * Performs the actual write-to-disk operation of the data currently on memory.
   *
   * If the `afterSync` callback is provided, it's called with the result data
   *
   * @returns Promise resolved when done
   */
  private async sync(): Promise<void> {
    this.meta.lastSync = Date.now();

    const data = this.options.beforeSync
      ? this.options.beforeSync(this.payload)
      : (this.payload as unknown as SerializedData);
    const meta = this.meta;

    const content: StoredData<SerializedData> = { meta, data };
    const strContent = this.options.prettify
      ? JSON.stringify(content, null, 2)
      : JSON.stringify(content);

    const start = Date.now();
    await writeFile(this.path, strContent);
    this.options.afterSync?.({
      path: this.path,
      time: Date.now() - start,
      size: strContent.length,
    });
  }
}
