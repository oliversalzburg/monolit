import * as vscode from "vscode";
import { LaunchSession } from "./LaunchSession";

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
    return "";
  }

  asDebugConfiguration(): vscode.DebugConfiguration {
    const configuration = {
      ...this.configuration,
      preLaunchTask: undefined,
    };
    return configuration;
  }

  asVariants(folders: Array<string>): Array<LaunchSession> {
    return folders.map(folder => new LaunchSession(this, folder));
  }

  async launch(withTasks: Array<vscode.Task>, asVariant?: LaunchSession): Promise<void> {
    const userDefinedPreLaunchTask = this.configuration.preLaunchTask;
    //this.configuration.preLaunchTask = undefined;
    const selectionConfigurationCwd =
      (asVariant ? `\${workspaceFolder}/packages/${asVariant.cwd}` : undefined) ||
      this.configuration.cwd ||
      "${workspaceFolder}";

    // TODO: This causes issues. Probably some tasks share the same name. Find better approach.
    const plt = withTasks.find(task => task.name === userDefinedPreLaunchTask);

    if (plt) {
      console.debug(
        `Executing preLaunchTask '${userDefinedPreLaunchTask}' in '${selectionConfigurationCwd}'...`
      );

      // All tasks are currently assumed to be "shell" tasks.

      const originalExecution: vscode.ShellExecution = plt.execution as vscode.ShellExecution;
      let newExecution: vscode.ShellExecution;
      console.debug(`Replacing 'cwd' in preLaunchTask with '${selectionConfigurationCwd}'.`);

      if (originalExecution.command) {
        newExecution = new vscode.ShellExecution(
          originalExecution.command,
          originalExecution.args,
          {
            cwd: selectionConfigurationCwd,
            env: originalExecution.options?.env,
            executable: originalExecution.options?.executable,
            shellArgs: originalExecution.options?.shellArgs,
            shellQuoting: originalExecution.options?.shellQuoting,
          }
        );
      } else {
        newExecution = new vscode.ShellExecution(originalExecution.commandLine!, {
          cwd: selectionConfigurationCwd,
          env: originalExecution.options?.env,
          executable: originalExecution.options?.executable,
          shellArgs: originalExecution.options?.shellArgs,
          shellQuoting: originalExecution.options?.shellQuoting,
        });
      }

      const buildTask: vscode.Task = new vscode.Task(
        plt.definition,
        plt.scope!,
        plt.name,
        plt.source,
        newExecution,
        plt.problemMatchers
      );

      console.dir(buildTask);

      await this._executeBuildTask(buildTask);
    } else {
      console.warn(`${userDefinedPreLaunchTask} could not be found.`);
    }

    console.debug(`Executing launch configuration...`);
    const configuration = this.asDebugConfiguration();
    await vscode.debug.startDebugging(this.workspaceFolder, configuration);
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
