import * as vscode from "vscode";
import { ExtensionInstance } from "./ExtensionInstance";
import { Log } from "./Log";

let extensionInstance: ExtensionInstance | undefined;

/**
 * MonoLit. Activate!
 */
export async function activate(context: vscode.ExtensionContext) {
  Log.debug("Activated: Creating extension instance...");
  extensionInstance = new ExtensionInstance(context);
  extensionInstance.init();
}

/**
 * Retrieve the instance of the extension.
 */
export function getExtensionInstance(): ExtensionInstance {
  if (!extensionInstance) {
    throw new Error("MonoLit has not been activated yet.");
  }

  return extensionInstance;
}
