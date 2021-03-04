import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance } from "../extension";
import { Log } from "../Log";

/**
 * The command should rebuild the current project and then start it.
 * "Rebuilding" can mean pretty much anything as it's just an alternative task.
 */
export async function cleanStart(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    Log.warn("No workspace open. Aborting.");
    return;
  }

  const extensionInstance = getExtensionInstance();
  const tasks = await extensionInstance.taskCache;

  let rebuildTaskName = extensionInstance.configuration.get("tasks.rebuild");
  let rebuildTask: vscode.Task | undefined = rebuildTaskName
    ? tasks.find(task => task.name === rebuildTaskName)
    : undefined;
  const wasConfiguredAtStartup = Boolean(rebuildTaskName);

  while (!rebuildTask) {
    const taskNames = Array.from(new Set(tasks.map(task => task.name)));
    rebuildTaskName = await vscode.window.showQuickPick(taskNames, {
      placeHolder: "Please configure rebuild task.",
    });

    // Cancelled or nothing configured.
    if (!rebuildTaskName) {
      Log.warn("Operation cancelled.");
      return;
    }

    rebuildTask = tasks.find(task => task.name === rebuildTaskName);
    if (!rebuildTask) {
      vscode.window.setStatusBarMessage(
        `⚠ MonoLit: The configured rebuild task '${rebuildTaskName}' could not be found in the workspace. Please try again.`
      );
    }
  }

  if (!rebuildTask) {
    vscode.window.setStatusBarMessage(
      `❌ MonoLit: The configured rebuild task '${rebuildTaskName}' could not be found in the workspace. Launch failed.`
    );
  }

  // Task is good, remember it for next time.
  if (!wasConfiguredAtStartup) {
    vscode.window.showInformationMessage("Storing task in configuration.");
    extensionInstance.configuration.update("tasks.rebuild", rebuildTaskName);
  }

  const selection = await extensionInstance.pickConfigurationVariant();

  if (!selection) {
    return;
  }

  Log.info(`Starting execution...`);

  const selectedCwd = CwdParser.cwdFromVariant(selection.variant);

  vscode.debug.stopDebugging();

  await extensionInstance.executeTask(rebuildTask, selectedCwd);
  await selection.configuration.launch(selectedCwd);
}
