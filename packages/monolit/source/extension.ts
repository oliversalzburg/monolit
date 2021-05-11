import * as vscode from "vscode";
import { ExtensionInstance } from "./ExtensionInstance";
import { LaunchConfiguration } from "./LaunchConfiguration";
import { LaunchSession } from "./LaunchSession";

let extensionInstance: ExtensionInstance | undefined;

/**
 * MonoLit. Activate!
 */
export async function activate(context: vscode.ExtensionContext) {
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

/**
 * Generate a user-readable string to identify a running configuration by.
 * @param configuration The configuration that was launched.
 * @param variant The variant of the launched configuration.
 * @returns The identification string.
 */
export function identifyLaunchedConfiguration(
  configuration: LaunchConfiguration,
  variant: LaunchSession
): string {
  return `${configuration.label}@${variant.label}`;
}
