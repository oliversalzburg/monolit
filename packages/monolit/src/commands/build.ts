import * as vscode from "vscode";
import { CandidateSearch } from "../CandidateSearch";
import { ConfigurationLibrary } from "../ConfigurationLibrary";
import { getExtensionInstance } from "../extension";
import { LaunchSession } from "../LaunchSession";
import { Log } from "../Log";

export type SelectedConfiguration = {
  label: string;
  uri: string;
};

export async function build(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    Log.warn("No workspace open. Aborting.");
    return;
  }

  const extensionInstance = getExtensionInstance();

  Log.debug("Loading previous configuration selection...");
  const previousConfig: SelectedConfiguration | undefined = context.workspaceState.get(
    "monolit.lastConfiguration"
  );
  if (previousConfig) {
    Log.debug(`  → ${previousConfig.label}@${previousConfig.uri}`);
  } else {
    Log.debug(`  → none`);
  }

  Log.debug("Constructing configuration library...");
  const library = await ConfigurationLibrary.fromWorkspaceFolders(
    vscode.workspace.workspaceFolders
  );
  if (previousConfig) {
    library.orderByPriority(previousConfig);
  }
  Log.debug(`  → ${library.configurations.length} entries`);

  const selectedConfiguration = await vscode.window.showQuickPick(library.configurations, {
    placeHolder:
      library.configurations.length === 0
        ? "No monolit-able configurations found."
        : "Select launch configuration",
  });

  if (!selectedConfiguration) {
    Log.warn("Operation cancelled.");
    return;
  }

  Log.debug(
    `Selected: ${selectedConfiguration.label} (${selectedConfiguration.workspaceFolder.uri}) with preLaunchTask: ${selectedConfiguration.configuration.preLaunchTask}`
  );

  const configuredCwd: string = selectedConfiguration.configuration.cwd ?? "${workspaceFolder}";
  const search = new CandidateSearch(configuredCwd, vscode.workspace.workspaceFolders);

  const cwdIsGlobbed = configuredCwd && configuredCwd.includes("*");

  Log.debug(`  + Configured cwd: '${configuredCwd}'${cwdIsGlobbed ? "" : " (not globbed)"}`);

  // Find new cwd for operation.
  Log.debug(`  ? Starting candidate search in all workspaces...`);
  const targets = await search.search();

  let infoString = targets
    .map(target => `${target.workspace.name}:${target.path || "<root>"}`)
    .join(",");
  if (100 < infoString.length) {
    infoString = infoString.slice(0, 100) + "...";
  }
  const folders = targets.map(entry => `${entry.workspace.name}/${entry.path}`);
  Log.debug(`  → ${folders.length} entries: ${infoString}`);

  // Get the previously selected variant to offer it as the top choice.
  Log.debug("Loading last configuration variant...");
  let previousVariant: { path: string; workspace: string } | undefined = context.workspaceState.get(
    "monolit.lastVariant"
  );
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
    Log.debug(`  → was: ${previousVariant.workspace}:${previousVariant.path || "<root>"}`);
  } else {
    Log.debug(`  → was: none`);
  }

  const launchVariants: Array<LaunchSession> = selectedConfiguration.asVariants(targets);
  if (previousVariant) {
    LaunchSession.orderByPriority(launchVariants, previousVariant);
  }

  const selectedVariant:
    | LaunchSession
    | undefined = await vscode.window.showQuickPick<LaunchSession>(
    new Promise(async resolve => {
      await extensionInstance.taskCache;
      resolve(launchVariants);
    }),
    {
      placeHolder: "Select target cwd",
    }
  );

  if (!selectedVariant) {
    Log.warn("Operation cancelled.");
    return;
  }

  Log.info(`Starting execution...`);

  // Persist selected configuration
  Log.info(`  + Persisting selected configuration information...`);
  context.workspaceState.update("monolit.lastConfiguration", {
    label: selectedConfiguration.label,
    uri: selectedConfiguration.workspaceFolder.uri.toString(),
  });
  context.workspaceState.update("monolit.lastVariant", {
    path: selectedVariant.candidate.path,
    workspace: selectedVariant.candidate.workspace.name,
  });

  const tasks = await extensionInstance.taskCache;

  await selectedConfiguration.launch(tasks, selectedVariant);
}
