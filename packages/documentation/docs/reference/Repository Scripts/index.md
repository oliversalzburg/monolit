# Full reference

## docs:build

-   Project: `@monolit/documentation`
-   Source:

    ```shell
    .scripts/build.sh
    ```

-   Description:

    _documentation pending_

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

    _documentation pending_

## docs:scripts:check

-   Project: `root`
-   Source:

    ```shell
    nsd --check-only
    ```

-   Description:

    _documentation pending_

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

-   Project: `root`
-   Source:

    ```shell
    cd packages/monolit && rm -rf dist
    ```

-   Description:

    _documentation pending_

## extension:package

-   Project: `root`
-   Source:

    ```shell
    cd packages/monolit && yarn package
    ```

-   Description:

    _documentation pending_

## extension:publish

-   Project: `root`
-   Source:

    ```shell
    cd packages/monolit && yarn publish
    ```

-   Description:

    _documentation pending_

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

