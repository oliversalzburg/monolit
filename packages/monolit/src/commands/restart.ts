import * as vscode from "vscode";
import { CwdParser } from "../CwdParser";
import { getExtensionInstance } from "../extension";
import { Log } from "../Log";

export async function restart(context: vscode.ExtensionContext) {
  const extensionInstance = getExtensionInstance();

  if (!extensionInstance.activeConfiguration || !extensionInstance.activeSession) {
    Log.warn("No active session. Aborting.");
    return;
  }

  const selectedCwd = CwdParser.cwdFromVariant(extensionInstance.activeSession);

  return extensionInstance.activeConfiguration.launch(selectedCwd);
}
