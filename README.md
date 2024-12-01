# bsky-follower-tracker

> Track follows and unfollows for the given account in bluesky

## Environment Variables

| Name                   | Required | Values            | Description                                                                                          |
| ---------------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `PRINT_ENV_VARS`       |          | `true` \| `false` | When enabled, the provided environment variables will be printed in the console. Defaults to `false` |
| `BLUESKY_ACCOUNT_NAME` | ✔       |                   | Name of the account to track as `danikaze.bsky.social`                                               |
| `BLUESKY_PASSWORD`     | ✔       |                   | Password of the bluesky account encoded in base64 format                                             |

## npm scripts

List of npm scripts and their objective:

### Running

| npm run ... | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| start       | Run the pre-build cli (will fail if `dist/cli/index.js` doesn't exist) |
| cli         | Run the cli directly from its TS code without building it (via `tsx`)  |

### Build

| npm run ... | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| build       | Build the whole application (cli/ui) onto the `dist/` folder |
| build:cli   | Build the cli application                                    |

### Development

| npm run ... | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| dev         | Starts the development of the whole application (cli/ui)               |
| dev:cli     | Starts the development for the cli (generates the build on watch mode) |
| dev:test    | Starts the test suite (`vitest`) on watch mode                         |

### Utilities

| npm run ... | Description                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| test        | Run the tests and outputs the report (done on pre-push via `husky`)                                          |
| format      | Triggers `prettier` manually for the codebase (done automatically on `pre-commit` via `hustky`+`stage-lint`) |
| lint        | Triggers `eslint` manually for the codebase (done automatically on `pre-commit` via `hustky`+`stage-lint`)   |
| prepare     | Configures `husky` to set up git hooks                                                                       |
