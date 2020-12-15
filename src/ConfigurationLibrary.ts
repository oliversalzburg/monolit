import * as vscode from "vscode";
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
				console.debug(`No launch configurations in '${workspaceFolder}'.`);
				continue;
			}

			// Find monolit-able configurations.
			for (const configuration of debugConfigurations) {
				if (
					configuration.type === "node" &&
					(this.hasMonoLitableCwd(configuration) || this.hasMonoLitableName(configuration))
				) {
					console.log(
						`Registering configuration '${configuration.name}' as a MonoLit configuration, because the cwd '${configuration.cwd}' contains a '*'.`
					);
					library.configurations.push(new LaunchConfiguration(workspaceFolder, configuration));
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
}
