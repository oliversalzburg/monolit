import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance } from "../extension";
import { Log } from "../Log";

/**
 * The command should restart the current configuration.
 */
export async function restart(context: vscode.ExtensionContext) {
  const extensionInstance = getExtensionInstance();

  if (!extensionInstance.activeConfiguration || !extensionInstance.activeSession) {
    Log.warn("No active session. Aborting.");
    return;
  }

  vscode.debug.stopDebugging();
  // I know it's naughty to terminate *all* tasks, but it's fine for now.
  vscode.tasks.taskExecutions.forEach(task => task.terminate());

  const selectedCwd = CwdParser.cwdFromVariant(extensionInstance.activeSession);

  const tasks = await extensionInstance.taskCache;

  const userDefinedPreLaunchTask =
    extensionInstance.activeConfiguration.configuration.preLaunchTask;
  if (userDefinedPreLaunchTask) {
    const plt = tasks.find(task => task.name === userDefinedPreLaunchTask);

    if (plt) {
      await getExtensionInstance().executeTask(plt, selectedCwd);
    } else {
      Log.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
    }
  } else {
    Log.debug(`  - no preLaunchTask requested.`);
  }

  return extensionInstance.activeConfiguration.launch(
    selectedCwd,
    extensionInstance.activeSession.candidate.displayAs
  );
}
