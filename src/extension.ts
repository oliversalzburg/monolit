import * as vscode from "vscode";

class LaunchConfiguration implements vscode.QuickPickItem {
	readonly workspaceFolder: vscode.WorkspaceFolder;
	readonly configuration: vscode.DebugConfiguration;

	constructor(workspaceFolder: vscode.WorkspaceFolder, configuration: vscode.DebugConfiguration) {
		this.workspaceFolder = workspaceFolder;
		this.configuration = configuration;
	}

	get label(): string {
		return this.configuration.name;
	}

	get description(): string | undefined {
		return this.workspaceFolder.name;
	}

	get detail(): string | undefined {
		return this.configuration.preLaunchTask ? `after running '${this.configuration.preLaunchTask}' task in '${this.configuration.cwd || "<workspace root>"}'` : undefined;
	}
}

type Selection = {
	label: string;
	uri: string;
};

async function executeBuildTask(task: vscode.Task) {
	const execution = await vscode.tasks.executeTask(task);

	const terminal = vscode.window.terminals.find(terminal => terminal.name === `Task - ${task.name}`);
	if (terminal) {
		console.debug(`Showing terminal window...`);
		terminal.show();
	} else {
		console.debug("Terminal window not found. Maybe first run.");
	}

	return new Promise<void>(resolve => {
		let disposable = vscode.tasks.onDidEndTask(e => {
			if (e.execution === execution) {
				disposable.dispose();
				resolve();
			}
		});
	});
}

export function activate(context: vscode.ExtensionContext) {
	console.debug("Fetching tasks...");

	const tasksCached = vscode.tasks.fetchTasks();

	let buildCommand = vscode.commands.registerCommand("build-manager.build", async () => {
		if (!Array.isArray(vscode.workspace.workspaceFolders)) {
			return;
		}

		const tasks = await tasksCached;

		const launchConfigurations = new Array<LaunchConfiguration>();
		const previousSelection: Selection | undefined = context.workspaceState.get("build-manager.lastSelection");
		for (const workspaceFolder of vscode.workspace.workspaceFolders) {
			const workspaceConfiguration = vscode.workspace.getConfiguration("launch", workspaceFolder.uri);
			const debugConfigurations = workspaceConfiguration.get<vscode.DebugConfiguration[]>("configurations");
			if (!debugConfigurations) {
				console.debug(`No launch configurations in '${workspaceFolder}'.`);
				continue;
			}

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
		}

		const selection = await vscode.window.showQuickPick(launchConfigurations, { placeHolder: "Select launch configuration" });
		if (selection) {
			console.log(`Selected: ${selection.label} (${selection.workspaceFolder.uri}) with preLaunchTask: ${selection.configuration.preLaunchTask}`);
			context.workspaceState.update("build-manager.lastSelection", { label: selection.label, uri: selection.workspaceFolder.uri });

			const userDefinedPreLaunchTask = selection.configuration.preLaunchTask;
			selection.configuration.preLaunchTask = undefined;
			const selectionConfigurationCwd = selection.configuration.cwd || "${workspaceFolder}";

			const plt = tasks.find(task => task.name === userDefinedPreLaunchTask);
			if (plt) {
				console.debug(`Executing preLaunchTask '${userDefinedPreLaunchTask}' in '${selectionConfigurationCwd}'...`);

				const execution: vscode.ShellExecution = plt.execution as vscode.ShellExecution;
				let cwdWasReplaced = false;
				if (execution.options) {
					if (execution.options.cwd === "inherit") {
						console.debug(`Replacing 'cwd' in preLaunchTask with '${selectionConfigurationCwd}'.`);

						if (execution.command) {
							plt.execution = new vscode.ShellExecution(execution.command, execution.args, {
								cwd: selectionConfigurationCwd,
								env: execution.options?.env,
								executable: execution.options?.executable,
								shellArgs: execution.options?.shellArgs,
								shellQuoting: execution.options?.shellQuoting
							});

						} else {
							plt.execution = new vscode.ShellExecution(execution.commandLine!, {
								cwd: selectionConfigurationCwd,
								env: execution.options?.env,
								executable: execution.options?.executable,
								shellArgs: execution.options?.shellArgs,
								shellQuoting: execution.options?.shellQuoting
							});
						}
						cwdWasReplaced = true;

					} else {
						console.debug(`The 'cwd' in preLaunchTask is not set to 'inherit', so it won't be changed.`);
					}
				} else {
					console.debug(`The preLaunchTask doesn't specify a cwd, so it won't be changed.`);
				}

				await executeBuildTask(plt);

				// Restore previous CWD after execution.
				if (cwdWasReplaced && execution) {
					plt.execution = execution;
				}

			} else {
				console.warn(`${userDefinedPreLaunchTask} could not be found.`);
			}

			console.debug(`Executing launch configuration...`);
			await vscode.debug.startDebugging(selection.workspaceFolder, selection.configuration);

			// Restore previous preLaunchTask after execution.
			selection.configuration.preLaunchTask = userDefinedPreLaunchTask;
		}
	});

	console.debug("Registering commands...");
	context.subscriptions.push(buildCommand);
}

export function deactivate() { }
