import { glob } from "glob";
import * as vscode from "vscode";
import { ConfigurationLibrary } from "./ConfigurationLibrary";
import { CwdParser } from "./CwdParser";
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

  const tasks = await GLOBAL_TASK_CACHE;

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
    placeHolder: "Select launch configuration",
  });

  if (!selectedConfiguration) {
    await SlowConsole.warn("Operation cancelled.");
    return;
  }

  await SlowConsole.debug(
    `Selected: ${selectedConfiguration.label} (${selectedConfiguration.workspaceFolder.uri}) with preLaunchTask: ${selectedConfiguration.configuration.preLaunchTask}`
  );
  await SlowConsole.debug(`  + Configured cwd: '${selectedConfiguration.configuration.cwd}'`);

  // Find new cwd for operation.
  const cwdParser = new CwdParser(selectedConfiguration.configuration.cwd);
  await cwdParser.analyzeAndRewrite();

  await SlowConsole.debug(
    `  ? Glob search for '${cwdParser.cwd}' in '${selectedConfiguration.workspaceFolder.uri.fsPath}'...`
  );
  const targets = glob.sync(cwdParser.cwd, {
    cwd: selectedConfiguration.workspaceFolder.uri.fsPath,
  });

  let infoString = targets.join(",");
  if (100 < infoString.length) {
    infoString = infoString.slice(0, 100) + "...";
  }
  const folders = targets.map(entry => `\${workspaceFolder}/${entry}`);
  await SlowConsole.debug(`  → ${folders.length} entries: ${infoString}`);

  await SlowConsole.debug("Loading last configuration variant...");
  const previousVariantCwd: string | undefined = context.workspaceState.get(
    "monolit.lastVariantCwd"
  );
  if (previousVariantCwd) {
    await SlowConsole.debug(`  → ${previousVariantCwd}`);
  } else {
    await SlowConsole.debug(`  → none`);
  }

  const launchVariants: Array<LaunchSession> = selectedConfiguration.asVariants(folders);
  if (previousVariantCwd) {
    LaunchSession.orderByPriority(launchVariants, previousVariantCwd);
  }

  const selectedVariant: LaunchSession | undefined = await vscode.window.showQuickPick(
    launchVariants,
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
  context.workspaceState.update("monolit.lastVariantCwd", selectedVariant.cwd);

  await selectedConfiguration.launch(tasks, selectedVariant);
}

export async function refreshTasks(context: vscode.ExtensionContext) {
  GLOBAL_TASK_CACHE = vscode.tasks.fetchTasks();
  return GLOBAL_TASK_CACHE;
}
