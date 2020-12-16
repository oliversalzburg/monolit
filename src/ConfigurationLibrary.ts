import * as vscode from "vscode";
import { SelectedConfiguration } from "./extension";
import { LaunchConfiguration } from "./LaunchConfiguration";

export class ConfigurationLibrary {
  configurations: Array<LaunchConfiguration> = [];

  static fromWorkspaceFolders(
    folders: ReadonlyArray<vscode.WorkspaceFolder>
  ): ConfigurationLibrary {
    const library = new ConfigurationLibrary();

    for (const workspaceFolder of folders) {
      const workspaceConfiguration = vscode.workspace.getConfiguration(
        "launch",
        workspaceFolder.uri
      );
      const debugConfigurations = workspaceConfiguration.get<vscode.DebugConfiguration[]>(
        "configurations"
      );
      if (!debugConfigurations) {
        console.debug(`  No launch configurations in '${workspaceFolder}'.`);
        continue;
      }

      // Find monolit-able configurations.
      for (const configuration of debugConfigurations) {
        if (
          configuration.type === "node" &&
          (this.hasMonoLitableCwd(configuration) || this.hasMonoLitableName(configuration))
        ) {
          console.info(
            `  Registering configuration '${configuration.name}' as a MonoLit configuration.`
          );
          library.configurations.push(new LaunchConfiguration(workspaceFolder, configuration));
        } else {
          console.debug(`  Configuration '${configuration.name}' is not monolit-able!`);
        }
      }
    }

    return library;
  }

  static hasMonoLitableCwd(configuration: vscode.DebugConfiguration): boolean {
    return "cwd" in configuration && configuration.cwd.includes("*");
  }

  static hasMonoLitableName(configuration: vscode.DebugConfiguration): boolean {
    return configuration.name.startsWith("MonoLit:");
  }

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
