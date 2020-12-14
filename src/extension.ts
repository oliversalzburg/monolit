import * as vscode from "vscode";

class LaunchConfiguration implements vscode.QuickPickItem {
	workspaceFolder: vscode.WorkspaceFolder;
	configuration: vscode.DebugConfiguration;

	constructor(workspaceFolder: vscode.WorkspaceFolder, configuration: vscode.DebugConfiguration) {
		this.workspaceFolder = workspaceFolder;
		this.configuration = configuration;
	}

	get label(): string {
		return this.configuration.name;
	}

	get description(): string | undefined {
		return undefined;
	}

	get detail(): string | undefined {
		return this.configuration.preLaunchTask ? `after running '${this.configuration.preLaunchTask}' task in '${this.configuration.cwd || "<workspace root>"}'` : undefined;
	}
}

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
		for (const workspaceFolder of vscode.workspace.workspaceFolders) {
			const configuration = vscode.workspace.getConfiguration("launch", workspaceFolder.uri);
			const debugConfigurations = configuration.get<vscode.DebugConfiguration[]>("configurations");
			if (!debugConfigurations) {
				console.debug(`No launch configurations in '${workspaceFolder}'.`);
				continue;
			}

			const launchConfigs = debugConfigurations.map(configuration => new LaunchConfiguration(workspaceFolder, configuration));
			launchConfigurations.push(...launchConfigs);
		}

		const selection = await vscode.window.showQuickPick(launchConfigurations);
		if (selection) {
			console.log(`Selected: ${selection.label} (${selection.workspaceFolder.uri}) with preLaunchTask: ${selection.configuration.preLaunchTask}`);

			const userDefinedPreLaunchTask = selection.configuration.preLaunchTask;
			selection.configuration.preLaunchTask = undefined;

			const plt = tasks.find(task => task.name === userDefinedPreLaunchTask);
			if (plt) {
				console.debug(`Executing preLaunchTask '${userDefinedPreLaunchTask}' in '${selection.configuration.cwd}'...`);

				const execution: vscode.ShellExecution = plt.execution as vscode.ShellExecution;
				let cwdWasReplaced = false;
				if (execution.options) {
					if (execution.options.cwd === "inherit") {
						console.debug(`Replacing 'cwd' in preLaunchTask with '${selection.configuration.cwd}'.`);

						if (execution.commandLine) {
							plt.execution = new vscode.ShellExecution(execution.commandLine, {
								cwd: selection.configuration.cwd,
								env: execution.options?.env,
								executable: execution.options?.executable,
								shellArgs: execution.options?.shellArgs,
								shellQuoting: execution.options?.shellQuoting
							});
						} else {
							plt.execution = new vscode.ShellExecution(execution.command, execution.args, {
								cwd: selection.configuration.cwd,
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
