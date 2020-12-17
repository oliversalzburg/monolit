import * as vscode from "vscode";
import { Candidate, CandidateSearch } from "./CandidateSearch";
import { ConfigurationLibrary } from "./ConfigurationLibrary";
import { LaunchSession } from "./LaunchSession";
import { SlowConsole } from "./SlowConsole";

export type SelectedConfiguration = {
  label: string;
  uri: string;
};

let GLOBAL_TASK_CACHE: Thenable<Array<vscode.Task>> = vscode.tasks.fetchTasks();

export async function activate(context: vscode.ExtensionContext) {
  await SlowConsole.debug("Activated: Fetching tasks...");

  const commandBuild = vscode.commands.registerCommand(
    "monolit.build",
    build.bind(undefined, context)
  );
  const commandRefreshTasks = vscode.commands.registerCommand(
    "monolit.refreshTasks",
    refreshTasks.bind(undefined, context)
  );

  await SlowConsole.debug("Activated: Registering commands...");
  context.subscriptions.push(commandBuild);
  context.subscriptions.push(commandRefreshTasks);
}

export async function build(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    return;
  }

  await SlowConsole.debug("Loading previous configuration selection...");
  const previousConfig: SelectedConfiguration | undefined = context.workspaceState.get(
    "monolit.lastConfiguration"
  );
  if (previousConfig) {
    await SlowConsole.debug(`  → ${previousConfig.label}@${previousConfig.uri}`);
  } else {
    await SlowConsole.debug(`  → none`);
  }

  await SlowConsole.debug("Constructing configuration library...");
  const library = await ConfigurationLibrary.fromWorkspaceFolders(
    vscode.workspace.workspaceFolders
  );
  if (previousConfig) {
    library.orderByPriority(previousConfig);
  }
  await SlowConsole.debug(`  → ${library.configurations.length} entries`);

  const selectedConfiguration = await vscode.window.showQuickPick(library.configurations, {
    placeHolder:
      library.configurations.length === 0
        ? "No monolit-able configurations found."
        : "Select launch configuration",
  });

  if (!selectedConfiguration) {
    await SlowConsole.warn("Operation cancelled.");
    return;
  }

  await SlowConsole.debug(
    `Selected: ${selectedConfiguration.label} (${selectedConfiguration.workspaceFolder.uri}) with preLaunchTask: ${selectedConfiguration.configuration.preLaunchTask}`
  );

  const configuredCwd: string = selectedConfiguration.configuration.cwd ?? "${workspaceFolder}";
  const search = new CandidateSearch(configuredCwd, vscode.workspace.workspaceFolders);

  const cwdIsGlobbed = configuredCwd && configuredCwd.includes("*");

  await SlowConsole.debug(
    `  + Configured cwd: '${configuredCwd}'${cwdIsGlobbed ? "" : " (not globbed)"}`
  );

  // Find new cwd for operation.
  await SlowConsole.debug(`  ? Starting candidate search in all workspaces...`);
  const targets = await search.search();

  let infoString = targets
    .map(target => `${target.workspace.name}:${target.path || "<root>"}`)
    .join(",");
  if (100 < infoString.length) {
    infoString = infoString.slice(0, 100) + "...";
  }
  const folders = targets.map(entry => `${entry.workspace.name}/${entry.path}`);
  await SlowConsole.debug(`  → ${folders.length} entries: ${infoString}`);

  // Get the previously selected variant to offer it as the top choice.
  await SlowConsole.debug("Loading last configuration variant...");
  let previousVariant: Candidate | undefined = context.workspaceState.get("monolit.lastVariantCwd");
  // Basic schema check for setting while we're still moving shit around.
  if (
    previousVariant &&
    (typeof previousVariant !== "object" ||
      "workspace" in previousVariant === false ||
      "path" in previousVariant === false)
  ) {
    previousVariant = undefined;
  }
  if (previousVariant) {
    await SlowConsole.debug(
      `  → was: ${previousVariant.workspace.name}:${previousVariant.path || "<root>"}`
    );
  } else {
    await SlowConsole.debug(`  → was: none`);
  }

  const launchVariants: Array<LaunchSession> = selectedConfiguration.asVariants(targets);
  if (previousVariant) {
    LaunchSession.orderByPriority(launchVariants, previousVariant);
  }

  const selectedVariant: LaunchSession | undefined = await vscode.window.showQuickPick(
    (async () => {
      await GLOBAL_TASK_CACHE;
      return launchVariants;
    })(),
    {
      placeHolder: "Select target cwd",
    }
  );

  if (!selectedVariant) {
    await SlowConsole.warn("Operation cancelled.");
    return;
  }

  await SlowConsole.info(`Starting execution...`);

  // Persist selected configuration
  context.workspaceState.update("monolit.lastConfiguration", {
    label: selectedConfiguration.label,
    uri: selectedConfiguration.workspaceFolder.uri.toString(),
  });
  context.workspaceState.update("monolit.lastVariantCwd", selectedVariant.candidate);

  const tasks = await GLOBAL_TASK_CACHE;

  await selectedConfiguration.launch(tasks, selectedVariant);
}

export async function refreshTasks(context: vscode.ExtensionContext) {
  GLOBAL_TASK_CACHE = vscode.tasks.fetchTasks();
  return GLOBAL_TASK_CACHE;
}
