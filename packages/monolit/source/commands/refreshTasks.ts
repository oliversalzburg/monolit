import * as vscode from "vscode";
import { getExtensionInstance } from "../extension";

/**
 * The command should refresh the tasks cached in the extension state.
 */
export async function refreshTasks(context: vscode.ExtensionContext) {
  return getExtensionInstance().refreshTasks();
}
