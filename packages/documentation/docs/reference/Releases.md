# Releases

To build a publishable package:

```shell
yarn extension:package
```

To puild a new patch release and package:

```shell
yarn extension:package:patch
```

Upload package manually, `vsce publish` doesn't work well with yarn.
