import * as vscode from "vscode";
import { ExtensionInstance } from "./ExtensionInstance";
import { LaunchConfiguration } from "./LaunchConfiguration";
import { Log } from "./Log";

export type SelectedConfiguration = {
  label: string;
  uri: string;
};

/**
 * We want to collect all launch configurations that are available to us in the
 * current context.
 * Our main task is to look for "monolit-able" configurations.
 * Those are the ones we care about and want to mess with. They are designated
 * by certain markers in their body.
 */
export class ConfigurationLibrary {
  readonly extensionInstance: ExtensionInstance;
  configurations: Array<LaunchConfiguration> = [];

  constructor(extensionInstance: ExtensionInstance) {
    this.extensionInstance = extensionInstance;
  }

  /**
   * Constructs a `ConfigurationLibrary` from a set of workspace folders.
   */
  static async fromWorkspaceFolders(
    extensionInstance: ExtensionInstance,
    folders: ReadonlyArray<vscode.WorkspaceFolder>
  ): Promise<ConfigurationLibrary> {
    const library = new ConfigurationLibrary(extensionInstance);

    for (const workspaceFolder of folders) {
      // Retrieve all launch configurations.
      const workspaceConfiguration = vscode.workspace.getConfiguration(
        "launch",
        workspaceFolder.uri
      );
      const debugConfigurations =
        workspaceConfiguration.get<vscode.DebugConfiguration[]>("configurations");
      if (!debugConfigurations) {
        Log.debug(`  No launch configurations in '${workspaceFolder}'.`);
        continue;
      }

      for (const configuration of debugConfigurations) {
        Log.info(
          `  + Registering configuration '${configuration.name}' from workspace '${workspaceFolder.name}' as a MonoLit configuration.`
        );
        library.configurations.push(
          new LaunchConfiguration(library, workspaceFolder, configuration)
        );
      }
    }

    return library;
  }

  /**
   * Determine if a `cwd` of a configuration signals to be "monolit-able".
   */
  static hasMonoLitableCwd(configuration: vscode.DebugConfiguration): boolean {
    return "cwd" in configuration && ConfigurationLibrary.isMonoLitableCwd(configuration.cwd);
  }

  /**
   * Determine if a CWD is "monolit-able".
   */
  static isMonoLitableCwd(cwd: string): boolean {
    return cwd.includes("*");
  }

  /**
   * Determine if a `name` of a configuration signals to be "monolit-able".
   */
  static hasMonoLitableName(configuration: vscode.DebugConfiguration): boolean {
    return configuration.name.startsWith("MonoLit:");
  }

  /**
   * Determine if a `program` of a configuration signals to be "monolit-able".
   */
  static hasMonoLitableProgram(configuration: vscode.DebugConfiguration): boolean {
    return "program" in configuration && configuration.program.includes("*");
  }

  /**
   * Order the library so that the given previous selection is at the top and
   * the remaining elements are ordered alphabetically-
   */
  orderByPriority(previousSelection: SelectedConfiguration): void {
    this.configurations.sort((a, b) => {
      if (
        a.workspaceFolder.uri.toString() === previousSelection.uri &&
        a.label === previousSelection.label
      ) {
        return -1;
      }
      if (
        b.workspaceFolder.uri.toString() === previousSelection.uri &&
        b.label === previousSelection.label
      ) {
        return 1;
      }

      return a.label.localeCompare(b.label);
    });
  }
}
