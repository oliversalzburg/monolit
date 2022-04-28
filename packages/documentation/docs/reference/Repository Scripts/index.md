# Full reference

## docs:build

-   Project: `@monolit/documentation`
-   Source:

    ```shell
    .scripts/build.sh
    ```

-   Description:

    Build the MonoLit documentation website.

## docs:scripts:build

-   Project: `root`
-   Source:

    ```shell
    nsd --docs-location "packages/documentation/docs/reference/Repository Scripts/"
    ```

-   Description:

    Build the `node-scripts-docs` you're reading right now.

## docs:scripts:check

-   Project: `root`
-   Source:

    ```shell
    nsd --docs-location "packages/documentation/docs/reference/Repository Scripts/" --check-only
    ```

-   Description:

    Check if there are any changes to the `node-scripts-docs` documentation.

## docs:serve

-   Project: `@monolit/documentation`
-   Source:

    ```shell
    .scripts/serve.sh
    ```

-   Description:

    Run an HTTP server that serves, and continuously updates the documentation site.

## extension:clean

-   Project: `monolit`
-   Source:

    ```shell
    rm -rf dist
    ```

-   Description:

    Delete all build output of the extension.

## extension:compile

-   Project: `monolit`
-   Source:

    ```shell
    webpack --mode development
    ```

-   Description:

    Compile a development build of the extension.

## extension:package

-   Project: `monolit`
-   Source:

    ```shell
    run vsce package --yarn
    ```

-   Description:

    _documentation pending_

## extension:package:patch

-   Project: `monolit`
-   Source:

    ```shell
    npm version patch && run vsce package --yarn
    ```

-   Description:

    _documentation pending_

## extension:publish

-   Project: `monolit`
-   Source:

    ```shell
    run vsce publish --yarn
    ```

-   Description:

    _documentation pending_

## extension:watch

-   Project: `monolit`
-   Source:

    ```shell
    webpack --mode development --watch
    ```

-   Description:

    Build the extension in watch mode.

## lint:eslint

-   Project: `root`
-   Source:

    ```shell
    eslint packages --ext .ts
    ```

-   Description:

    Run ESLint on the TypeScript sources.

## lint:tsc

-   Project: `root`
-   Source:

    ```shell
    tsc --noEmit
    ```

-   Description:

    Run the TypeScript compiler on the TypeScript sources to check for errors.

## typecheck:all

-   Project: `root`
-   Source:

    ```shell
    tsc --noEmit --incremental false
    ```

-   Description:

    Type-check all projects, to fill the problems panel in VS Code.

## vscode:prepublish

-   Project: `monolit`
-   Source:

    ```shell
    webpack --mode production
    ```

-   Description:

    Pre-publish hook from `vsce`. Compile the extension in production mode.
