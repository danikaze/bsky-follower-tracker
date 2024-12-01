/** Date from toUTCString() */
export type UtcDate = string;
export type Milliseconds = number;
export type Bytes = number;
export type OptionalPromise<T> = T | Promise<T>;

export type DeepPartial<T> =
  T extends Record<string, unknown>
    ? {
        [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

export type DeepReadonly<T> =
  T extends Record<string, unknown>
    ? {
        [P in keyof T]: DeepReadonly<T[P]>;
      }
    : Readonly<T>;

export type Nullable<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] | null;
};

export type DeepNullable<T> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T]: DeepNullable<T[K]> | null;
      }
    : T | null;

export type KeysOfWithValue<O extends Record<string, unknown>, T> = Exclude<
  {
    [K in keyof O]: O[K] extends T ? K : never;
  }[keyof O],
  undefined
>;
