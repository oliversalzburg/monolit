import { join } from "path";
import * as vscode from "vscode";
import { Candidate } from "./CandidateSearch";
import { LaunchSession } from "./LaunchSession";
import { Log } from "./Log";

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

  asDebugConfiguration(inCwd?: string): vscode.DebugConfiguration {
    const cwd = inCwd ? inCwd : this.configuration.cwd;
    const configuration = {
      ...this.configuration,
      preLaunchTask: undefined,
      program:
        inCwd && "program" in this.configuration
          ? (<string>this.configuration.program).replace(this.configuration.cwd, cwd)
          : this.configuration.program,
      cwd,
    };
    return configuration;
  }

  asVariants(candidates: Array<Candidate>): Array<LaunchSession> {
    return candidates.map(candidate => new LaunchSession(this, candidate));
  }

  async launch(withTasks: Array<vscode.Task>, asVariant?: LaunchSession): Promise<void> {
    const selectionConfigurationCwd =
      (asVariant
        ? join(asVariant.candidate.workspace.uri.fsPath, asVariant.candidate.path)
        : undefined) ??
      this.configuration.cwd ??
      "${workspaceFolder}";

    const userDefinedPreLaunchTask = this.configuration.preLaunchTask;
    if (userDefinedPreLaunchTask) {
      const plt = withTasks.find(task => task.name === userDefinedPreLaunchTask);

      if (plt) {
        Log.debug(
          `  * Executing preLaunchTask '${userDefinedPreLaunchTask}' in '${selectionConfigurationCwd}'...`
        );

        // All tasks are currently assumed to be "shell" tasks.

        const originalExecution: vscode.ShellExecution = plt.execution as vscode.ShellExecution;
        let newExecution: vscode.ShellExecution;
        Log.debug(`  ! Replacing 'cwd' in preLaunchTask with '${selectionConfigurationCwd}'.`);

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

        await this._executeBuildTask(buildTask);
      } else {
        Log.warn(`  ? ${userDefinedPreLaunchTask} could not be found.`);
      }
    } else {
      Log.debug(`  - no preLaunchTask requested.`);
    }

    Log.debug(`  * Executing launch configuration...`);
    const configuration = this.asDebugConfiguration(selectionConfigurationCwd);
    try {
      const result = await vscode.debug.startDebugging(this.workspaceFolder, configuration);
      if (result === true) {
        Log.info("MonoLit execution completed successfully.");
      }
    } catch (error) {
      Log.error(error);
    }
  }

  async _executeBuildTask(task: vscode.Task): Promise<void> {
    const execution = await vscode.tasks.executeTask(task);

    const terminal = vscode.window.terminals.find(
      terminal => terminal.name === `Task - ${task.name}`
    );
    if (terminal) {
      Log.debug(`  ! Showing terminal window...`);
      terminal.show();
    } else {
      Log.debug("  ? Terminal window not found. Maybe this is the first run in this session.");
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
