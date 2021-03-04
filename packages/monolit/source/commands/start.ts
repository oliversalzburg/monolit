import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance } from "../extension";
import { Log } from "../Log";

/**
 * The command should let the user pick a launch configuration and start it.
 */
export async function start(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    Log.warn("No workspace open. Aborting.");
    return;
  }

  const extensionInstance = getExtensionInstance();
  const selection = await extensionInstance.pickConfigurationVariant();

  if (!selection) {
    return;
  }

  Log.info(`Starting execution...`);

  const selectedCwd = CwdParser.cwdFromVariant(selection.variant);

  const tasks = await extensionInstance.taskCache;

  const userDefinedPreLaunchTask = selection.configuration.configuration.preLaunchTask;
  if (userDefinedPreLaunchTask) {
    if (userDefinedPreLaunchTask === "${defaultBuildTask}") {
      vscode.window.showWarningMessage(
        "MonoLit can not execute tasks referenced by ${defaultBuildTask}. Please name the task explicitly."
      );
    } else {
      const plt = tasks.find(task => task.name === userDefinedPreLaunchTask);

      if (plt) {
        await getExtensionInstance().executeTask(plt, selectedCwd);
      } else {
        Log.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
      }
    }
  } else {
    Log.debug(`  - no preLaunchTask requested.`);
  }

  await selection.configuration.launch(selectedCwd);
}
