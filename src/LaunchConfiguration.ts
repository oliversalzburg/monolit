import * as vscode from "vscode";
import { LaunchSession } from "./LaunchSession";
import { SlowConsole } from "./SlowConsole";

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
    return this.configuration.preLaunchTask ? `→ ${this.configuration.preLaunchTask}` : "";
  }

  asDebugConfiguration(asVariant?: LaunchSession): vscode.DebugConfiguration {
    const cwd = asVariant ? asVariant.cwd : this.configuration.cwd;
    const configuration = {
      ...this.configuration,
      preLaunchTask: undefined,
      program: asVariant
        ? (<string>this.configuration.program).replace(this.configuration.cwd, cwd)
        : this.configuration.program,
      cwd,
    };
    return configuration;
  }

  asVariants(folders: Array<string>): Array<LaunchSession> {
    return folders.map(folder => new LaunchSession(this, folder));
  }

  async launch(withTasks: Array<vscode.Task>, asVariant?: LaunchSession): Promise<void> {
    const userDefinedPreLaunchTask = this.configuration.preLaunchTask;
    const selectionConfigurationCwd =
      asVariant?.cwd || this.configuration.cwd || "${workspaceFolder}";

    const plt = withTasks.find(task => task.name === userDefinedPreLaunchTask);

    if (plt) {
      await SlowConsole.debug(
        `  * Executing preLaunchTask '${userDefinedPreLaunchTask}' in '${selectionConfigurationCwd}'...`
      );

      // All tasks are currently assumed to be "shell" tasks.

      const originalExecution: vscode.ShellExecution = plt.execution as vscode.ShellExecution;
      let newExecution: vscode.ShellExecution;
      await SlowConsole.debug(
        `  ! Replacing 'cwd' in preLaunchTask with '${selectionConfigurationCwd}'.`
      );

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

      //await SlowConsole.dir(buildTask);

      await this._executeBuildTask(buildTask);
    } else {
      await SlowConsole.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
    }

    await SlowConsole.debug(`  * Executing launch configuration...`);
    const configuration = this.asDebugConfiguration(asVariant);
    try {
      const result = await vscode.debug.startDebugging(this.workspaceFolder, configuration);
      if (result === true) {
        await SlowConsole.info("MonoLit execution completed successfully.");
      }
    } catch (error) {
      await SlowConsole.error(error);
    }
  }

  async _executeBuildTask(task: vscode.Task): Promise<void> {
    const execution = await vscode.tasks.executeTask(task);

    const terminal = vscode.window.terminals.find(
      terminal => terminal.name === `Task - ${task.name}`
    );
    if (terminal) {
      await SlowConsole.debug(`  ! Showing terminal window...`);
      terminal.show();
    } else {
      await SlowConsole.debug(
        "  ? Terminal window not found. Maybe this is the first run in this session."
      );
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
