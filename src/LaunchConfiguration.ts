import * as vscode from "vscode";

export class LaunchConfiguration implements vscode.QuickPickItem {
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
		return this.configuration.preLaunchTask
			? `after running '${this.configuration.preLaunchTask}' task in '${this.configuration.cwd || "<workspace root>"
			}'`
			: undefined;
	}

	async launch(withTasks: Array<vscode.Task>): Promise<void> {
		const userDefinedPreLaunchTask = this.configuration.preLaunchTask;
		this.configuration.preLaunchTask = undefined;
		const selectionConfigurationCwd = this.configuration.cwd || "${workspaceFolder}";

		// TODO: This causes issues. Probably some tasks share the same name. Find better approach.
		const plt = withTasks.find(task => task.name === userDefinedPreLaunchTask);
		if (plt) {
			console.debug(
				`Executing preLaunchTask '${userDefinedPreLaunchTask}' in '${selectionConfigurationCwd}'...`
			);

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
							shellQuoting: execution.options?.shellQuoting,
						});
					} else {
						plt.execution = new vscode.ShellExecution(execution.commandLine!, {
							cwd: selectionConfigurationCwd,
							env: execution.options?.env,
							executable: execution.options?.executable,
							shellArgs: execution.options?.shellArgs,
							shellQuoting: execution.options?.shellQuoting,
						});
					}
					cwdWasReplaced = true;
				} else {
					console.debug(
						`The 'cwd' in preLaunchTask is not set to 'inherit', so it won't be changed.`
					);
				}
			} else {
				console.debug(`The preLaunchTask doesn't specify a cwd, so it won't be changed.`);
			}

			await this._executeBuildTask(plt);

			// Restore previous CWD after execution.
			if (cwdWasReplaced && execution) {
				plt.execution = execution;
			}
		} else {
			console.warn(`${userDefinedPreLaunchTask} could not be found.`);
		}

		console.debug(`Executing launch configuration...`);
		await vscode.debug.startDebugging(this.workspaceFolder, this.configuration);

		// Restore previous preLaunchTask after execution.
		this.configuration.preLaunchTask = userDefinedPreLaunchTask;
	}

	async _executeBuildTask(task: vscode.Task): Promise<void> {
		const execution = await vscode.tasks.executeTask(task);

		const terminal = vscode.window.terminals.find(
			terminal => terminal.name === `Task - ${task.name}`
		);
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
}
