import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance, identifyLaunchedConfiguration } from "../extension";
import {  LitSession } from "../ExtensionInstance";
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
    // Action cancelled
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
        const taskPromise = getExtensionInstance().executeTask(plt, selectedCwd);
        if (!plt.isBackground) {
          try {
            await taskPromise;
          } catch (error) {
            // If pre-launch task fails, don't execute.
            return;
          }
        }
      } else {
        Log.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
      }
    }
  } else {
    Log.debug(`  - no preLaunchTask requested.`);
  }

  await selection.configuration.launch(selectedCwd, selection.variant.candidate.displayAs);

  // Assume that the active debug session is the one we just started.
  if (!vscode.debug.activeDebugSession) {
    Log.error(`  ! Launched debug session not found.`);
    return;
  }

  const startedDebugSession: LitSession = {
    configuration: selection.configuration,
    debugSession: vscode.debug.activeDebugSession,
    started: new Date(),
    variant: selection.variant,
  };

  Log.info(`  → Launched debug session '${startedDebugSession.debugSession.id}'.`);

  extensionInstance.registerDebugSession(startedDebugSession);

  vscode.debug.onDidTerminateDebugSession(event => {
    if (event.id === startedDebugSession.debugSession.id) {
      Log.info(
        `Previously started debug session '${event.id}' for '${identifyLaunchedConfiguration(
          startedDebugSession.configuration,
          startedDebugSession.variant
        )}' has been terminated.`
      );
      
      // Remove the session.
      extensionInstance.unregisterDebugSession(startedDebugSession.debugSession.id);
    }
  });
}
