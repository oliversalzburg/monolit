import * as vscode from "vscode";
import { CandidateSearch } from "../CandidateSearch";
import { ConfigurationLibrary, SelectedConfiguration } from "../ConfigurationLibrary";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance } from "../extension";
import { LaunchSession } from "../LaunchSession";
import { Log } from "../Log";

/**
 * The command should let the user pick a launch configuration and start it,
 * applying all the MonoLit magic we love so much.
 */
export async function start(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    Log.warn("No workspace open. Aborting.");
    return;
  }

  const extensionInstance = getExtensionInstance();
  const selection = await extensionInstance.get();

  if(!selection){
    return;
  }

  Log.info(`Starting execution...`);

  const selectedCwd = CwdParser.cwdFromVariant(selection.variant);

  const tasks = await extensionInstance.taskCache;

  const userDefinedPreLaunchTask = selection.configuration.configuration.preLaunchTask;
  if (userDefinedPreLaunchTask) {
    const plt = tasks.find(task => task.name === userDefinedPreLaunchTask);

    if (plt) {
      await getExtensionInstance().executeLaunchTask(plt, selectedCwd);
    } else {
      Log.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
    }
  } else {
    Log.debug(`  - no preLaunchTask requested.`);
  }

  await selection.configuration.launch(selectedCwd);
}
