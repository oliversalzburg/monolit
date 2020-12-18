import * as vscode from "vscode";
import { ExtensionInstance } from "./ExtensionInstance";
import { Log } from "./Log";

export async function activate(context: vscode.ExtensionContext) {
  Log.debug("Activated: Creating extension instance...");
  extensionInstance = new ExtensionInstance(context);
  extensionInstance.init();
}

let extensionInstance: ExtensionInstance | undefined;

export function getExtensionInstance(): ExtensionInstance {
  if (!extensionInstance) {
    throw new Error("MonoLit has not been activated yet.");
  }

  return extensionInstance;
}
