import * as vscode from "vscode";
import { SelectedConfiguration } from "./extension";
import { LaunchConfiguration } from "./LaunchConfiguration";
import { Log } from "./Log";

/**
 * We want to collect all launch configurations that are available to us in the
 * current context.
 * Our main task is to look for "monolit-able" configurations.
 * Those are the ones we care about and want to mess with. They are designated
 * by certain markers in their body.
 */
export class ConfigurationLibrary {
  configurations: Array<LaunchConfiguration> = [];

  /**
   * Constructs a `ConfigurationLibrary` from a set of workspace folders.
   */
  static async fromWorkspaceFolders(
    folders: ReadonlyArray<vscode.WorkspaceFolder>
  ): Promise<ConfigurationLibrary> {
    const library = new ConfigurationLibrary();

    for (const workspaceFolder of folders) {
      // Retrieve all launch configurations.
      const workspaceConfiguration = vscode.workspace.getConfiguration(
        "launch",
        workspaceFolder.uri
      );
      const debugConfigurations = workspaceConfiguration.get<vscode.DebugConfiguration[]>(
        "configurations"
      );
      if (!debugConfigurations) {
        Log.debug(`  No launch configurations in '${workspaceFolder}'.`);
        continue;
      }

      // Find monolit-able configurations.
      for (const configuration of debugConfigurations) {
        if (
          (configuration.type === "extensionHost" || configuration.type === "node") &&
          (this.hasMonoLitableCwd(configuration) ||
            this.hasMonoLitableName(configuration) ||
            this.hasMonoLitableProgram(configuration))
        ) {
          Log.info(
            `  + Registering configuration '${configuration.name}' from workspace '${workspaceFolder.name}' as a MonoLit configuration.`
          );
          library.configurations.push(new LaunchConfiguration(workspaceFolder, configuration));
        } else {
          Log.debug(
            `  - Configuration '${configuration.name}' in workspace '${workspaceFolder.name}' is not monolit-able!`
          );
        }
      }
    }

    return library;
  }

  /**
   * Determine if a `cwd` of a configuration signals to be "monolit-able".
   */
  static hasMonoLitableCwd(configuration: vscode.DebugConfiguration): boolean {
    return "cwd" in configuration && configuration.cwd.includes("*");
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
