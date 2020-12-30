import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance } from "../extension";
import { Log } from "../Log";

/**
 * The command should let the user pick a task and launch it.
 */
export async function startTask(context: vscode.ExtensionContext) {
  if (!Array.isArray(vscode.workspace.workspaceFolders)) {
    Log.warn("No workspace open. Aborting.");
    return;
  }

  const extensionInstance = getExtensionInstance();
  const selection = await extensionInstance.pickTaskVariant();

  if (!selection) {
    return;
  }

  Log.info(`Starting execution...`);

  //await getExtensionInstance().executeTask(selection, selectedCwd);
}
