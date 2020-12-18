import * as vscode from "vscode";
import { getExtensionInstance } from "../extension";

export async function refreshTasks(context: vscode.ExtensionContext) {
  return getExtensionInstance().refreshTasks();
}
