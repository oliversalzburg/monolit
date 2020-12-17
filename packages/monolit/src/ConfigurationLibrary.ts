import * as vscode from "vscode";
import { SelectedConfiguration } from "./extension";
import { LaunchConfiguration } from "./LaunchConfiguration";
import { SlowConsole } from "./SlowConsole";

export class ConfigurationLibrary {
  configurations: Array<LaunchConfiguration> = [];

  static async fromWorkspaceFolders(
    folders: ReadonlyArray<vscode.WorkspaceFolder>
  ): Promise<ConfigurationLibrary> {
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
        await SlowConsole.debug(`  No launch configurations in '${workspaceFolder}'.`);
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
          await SlowConsole.info(
            `  + Registering configuration '${configuration.name}' as a MonoLit configuration.`
          );
          library.configurations.push(new LaunchConfiguration(workspaceFolder, configuration));
        } else {
          await SlowConsole.debug(
            `  - Configuration '${configuration.name}' in workspace '${workspaceFolder.name}' is not monolit-able!`
          );
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

  static hasMonoLitableProgram(configuration: vscode.DebugConfiguration): boolean {
    return "program" in configuration && configuration.program.includes("*");
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
