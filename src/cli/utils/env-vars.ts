export type AppEnvVars = {
  PRINT_ENV_VARS: boolean;
  /** full bsky name as `danikaze.bsky.social` */
  BLUESKY_ACCOUNT_NAME: string;
  /** Encoded pasword */
  BLUESKY_PASSWORD: string;
};

export type EnvVarDef<Name extends keyof AppEnvVars = keyof AppEnvVars> = {
  /** Name of the envvar as process.env[name] */
  name: Name;
  /** If defined as `true`, won't throw an error if not provided */
  optional?: true;
  /** Only used when `optional: true`, default value when not provided */
  default?: AppEnvVars[Name];
  /** When provided, it can transform the provided value into the one to use */
  value?: (raw: string) => AppEnvVars[Name];
  /** When `true`, its value won't be printed */
  secret?: boolean;
};

const ENV_VARS: EnvVarDef[] = [
  {
    name: 'PRINT_ENV_VARS',
    optional: true,
    default: false,
    value: (raw) => {
      const lc = raw.toLowerCase();
      return lc === '1' || lc === 't' || lc === 'true' || lc == 'on';
    },
  },
  { name: 'BLUESKY_ACCOUNT_NAME' },
  {
    name: 'BLUESKY_PASSWORD',
    secret: true,
  },
];

export const envVars: AppEnvVars = readEnvVars(ENV_VARS);

export function printEnvVars(): void {
  const lines = ENV_VARS.reduce((lines, def) => {
    let value = envVars[def.name] || '';
    if (def.secret) {
      value = value.toString().replace(/./g, '*');
    }
    lines.push(` - ${def.name}: ${value}`);
    return lines;
  }, [] as string[]);

  console.log(lines.join('\n'));
}

function readEnvVars(defs: (keyof AppEnvVars | EnvVarDef)[]) {
  const errors: string[] = [];
  const data = defs.reduce((data, nameOrDef) => {
    const def = typeof nameOrDef === 'string' ? { name: nameOrDef } : nameOrDef;
    const raw = process.env[def.name];
    if (raw === undefined) {
      if (!def.optional) {
        errors.push(`process.env.${def.name} is not provided`);
      } else if (def.default !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any)[def.name] = def.default;
      }
    } else {
      try {
        const value = def.value ? def.value(raw) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any)[def.name] = value;
      } catch (e) {
        errors.push(String(e));
      }
    }

    return data;
  }, {} as AppEnvVars);

  if (errors.length) {
    throw new Error(
      `Errors found when reading the environment variables:\n` +
        errors.join('\n')
    );
  }

  return data;
}
