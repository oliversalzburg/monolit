import { formatDistance, formatRelative } from "date-fns";
import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance, identifyLaunchedConfiguration } from "../extension";
import { LitSession } from "../ExtensionInstance";
import { Log } from "../Log";

/**
 * The command should restart the current configuration.
 */
export async function restart(context: vscode.ExtensionContext) {
  const extensionInstance = getExtensionInstance();

  if (extensionInstance.activeDebugSessions.length === 0) {
    Log.warn("No active debug sessions. Aborting.");
    return;
  }

  // If we have multiple running sessions, let the user pick the one to restart.
  let sessionToRestart: LitSession = extensionInstance.activeDebugSessions[0];
  if (1 < extensionInstance.activeDebugSessions.length) {
    const selection = await vscode.window.showQuickPick(
      extensionInstance.activeDebugSessions.map(session => ({
        id: session,
        label: identifyLaunchedConfiguration(session.configuration, session.variant),
        detail: `Started ${formatRelative(
          session.started,
          new Date()
        )} (${formatDistance(session.started, new Date(), { addSuffix: true })})`,
      })),
      {
        placeHolder: "You have multiple running sessions. Pick one to restart.",
      }
    );

    if (!selection) {
      // Action cancelled
      return;
    }

    sessionToRestart = selection.id;
    console.debug(selection);
  }

  await vscode.debug.stopDebugging(sessionToRestart.debugSession);

  // I know it's naughty to terminate *all* tasks, but it's fine for now.
  vscode.tasks.taskExecutions.forEach(task => task.terminate());

  const selectedCwd = CwdParser.cwdFromVariant(sessionToRestart.variant);

  const tasks = await extensionInstance.taskCache;

  const userDefinedPreLaunchTask = sessionToRestart.configuration.configuration.preLaunchTask;
  if (userDefinedPreLaunchTask) {
    const plt = tasks.find(task => task.name === userDefinedPreLaunchTask);

    if (plt) {
      try {
        await getExtensionInstance().executeTask(plt, selectedCwd);
      } catch (error) {
        // If pre-launch task fails, don't execute.
        return;
      }
    } else {
      Log.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
    }
  } else {
    Log.debug(`  - no preLaunchTask requested.`);
  }

  await sessionToRestart.configuration.launch(
    selectedCwd,
    sessionToRestart.variant.candidate.displayAs
  );

  // Assume that the active debug session is the one we just started.
  if (!vscode.debug.activeDebugSession) {
    Log.error(`  ! Launched debug session not found.`);
    return;
  }

  const startedDebugSession: LitSession = {
    configuration: sessionToRestart.configuration,
    debugSession: vscode.debug.activeDebugSession,
    started: new Date(),
    variant: sessionToRestart.variant,
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
