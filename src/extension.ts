import * as vscode from "vscode";


export function activate(context: vscode.ExtensionContext) {
	console.log("Registering bullshit...");

	let buildCommand = vscode.commands.registerCommand("build-manager.build", async () => {
		vscode.window.showInformationMessage("Building your project...");

		if (!Array.isArray(vscode.workspace.workspaceFolders)) {
			return;
		}

		// launch.json configuration
		const configuration = vscode.workspace.getConfiguration("launch", vscode.workspace.workspaceFolders[0].uri);

		// retrieve values
		const launchConfigurations = configuration.get<vscode.DebugConfiguration[]>("configurations");
		console.log(launchConfigurations);

		const launcConfigSelection: vscode.QuickPickItem[] = launchConfigurations!.map(configuration => {
			return {
				label: configuration.name,
				//description: "launch task",
				detail: configuration.preLaunchTask ? `after running '${configuration.preLaunchTask}' in '${configuration.cwd || "<workspace root>"}'` : undefined
			};
		});

		const selection = await vscode.window.showQuickPick(launcConfigSelection);
		console.log("Selected: " + selection);
	});

	context.subscriptions.push(buildCommand);
}

export function deactivate() { }
