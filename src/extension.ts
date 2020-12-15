import * as vscode from "vscode";
import { ConfigurationLibrary } from "./ConfigurationLibrary";
import { LaunchConfiguration } from "./LaunchConfiguration";

type Selection = {
	label: string;
	uri: string;
};

export function activate(context: vscode.ExtensionContext) {
	console.debug("Fetching tasks...");

	const tasksCached = vscode.tasks.fetchTasks();

	let buildCommand = vscode.commands.registerCommand("monolit.build", async () => {
		if (!Array.isArray(vscode.workspace.workspaceFolders)) {
			return;
		}

		const tasks = await tasksCached;

		const launchConfigurations = new Array<LaunchConfiguration>();
		const previousSelection: Selection | undefined = context.workspaceState.get(
			"monolit.lastSelection"
		);

		const library = ConfigurationLibrary.fromWorkspaceFolders(vscode.workspace.workspaceFolders);
		/*
			let previousConfig: LaunchConfiguration | undefined;
			const launchConfigs = debugConfigurations.map(debugConfiguration => {
				const launchConfiguration = new LaunchConfiguration(workspaceFolder, debugConfiguration);
				if (previousSelection && previousSelection.label === launchConfiguration.label && previousSelection.uri && launchConfiguration.workspaceFolder.uri) {
					console.log("Found previous selection again");
					previousConfig = launchConfiguration;
				}
				return launchConfiguration;
			});
	
			// Add all launch configurations.
			launchConfigurations.push(...launchConfigs);
			// The move the previously selected one to the top.
			if (previousConfig) {
				const index = launchConfigurations.indexOf(previousConfig);
				launchConfigurations.splice(index, 1);
				launchConfigurations.unshift(previousConfig);
			}
			*/

		const selection = await vscode.window.showQuickPick(library.configurations, {
			placeHolder: "Select launch configuration",
		});
		if (selection) {
			console.log(
				`Selected: ${selection.label} (${selection.workspaceFolder.uri}) with preLaunchTask: ${selection.configuration.preLaunchTask}`
			);
			context.workspaceState.update("monolit.lastSelection", {
				label: selection.label,
				uri: selection.workspaceFolder.uri,
			});

			await selection.launch(tasks);
		}
	});

	console.debug("Registering commands...");
	context.subscriptions.push(buildCommand);
}
