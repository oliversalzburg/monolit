import * as vscode from "vscode";
import { Log } from "../Log";
import { restart } from "./restart";
import { start } from "./start";

/**
 * The command should let the user pick an action that makes sense at any state.
 */
export async function ignite(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    Log.warn("No workspace open. Aborting.");
    return;
  }

  if (vscode.debug.activeDebugSession) {
    const selection = await vscode.window.showQuickPick(
      [
        {
          id: "START_ANOTHER",
          label: "Start another session.",
          detail: "The current session(s) will keep running and we'll start a new one.",
        },
        {
          id: "REPLACE_CURRENT",
          label: "Replace current session.",
          detail: "Exit current session and start a new one.",
        },
        {
          id: "RESTART_CURRENT",
          label: "Actually, restart current session.",
          detail: "Restart the current session.",
        },
      ],
      {
        placeHolder: "You're already debugging. What do you want to do?",
      }
    );

    if (!selection) {
      // Action cancelled
      return;
    }

    if (selection.id === "START_ANOTHER") {
      return start(context);
    } else if (selection.id === "REPLACE_CURRENT") {
      await vscode.debug.stopDebugging();
      // I know it's naughty to terminate *all* tasks, but it's fine for now.
      vscode.tasks.taskExecutions.forEach(task => task.terminate());
      return start(context);
    } else if (selection.id === "RESTART_CURRENT") {
      return restart(context);
    }
  } else {
    return start(context);
  }
}
