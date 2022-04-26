# Full reference

## docs:build

-   Project: `@monolit/documentation`
-   Source:

    ```shell
    .scripts/build.sh
    ```

-   Description:

    Build the MonoLit documentation website.

## docs:prepare

-   Project: `@monolit/documentation`
-   Source:

    ```shell
    docker build -t mkdocs-material .
    ```

-   Description:

    _documentation pending_

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

    _documentation pending_

## docs:wtf

-   Project: `@monolit/documentation`
-   Source:

    ```shell
    echo ${PROJECT_CWD} ${PWD} ${INIT_CWD} $(pwd)
    ```

-   Description:

    _documentation pending_

## extension:clean

-   Project: `monolit`
-   Source:

    ```shell
    rm -rf dist
    ```

-   Description:

    _documentation pending_

## extension:compile

-   Project: `monolit`
-   Source:

    ```shell
    webpack --mode development
    ```

-   Description:

    _documentation pending_

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

    _documentation pending_

## vscode:prepublish

-   Project: `monolit`
-   Source:

    ```shell
    webpack --mode production
    ```

-   Description:

    _documentation pending_
