import * as vscode from "vscode";
import { build } from "./commands/build";
import { refreshTasks } from "./commands/refreshTasks";
import { LaunchConfiguration } from "./LaunchConfiguration";
import { LaunchSession } from "./LaunchSession";
import { Log } from "./Log";

/**
 * Represents all relevant state of the extension.
 */
export class ExtensionInstance {
  readonly context: vscode.ExtensionContext;
  taskCache: Thenable<Array<vscode.Task>>;

  activeConfiguration: LaunchConfiguration | undefined;
  activeSession: LaunchSession | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.taskCache = Promise.resolve([]);
  }

  init() {
    const outputChannel = vscode.window.createOutputChannel("MonoLit");
    Log.init(outputChannel);

    Log.debug("Activated: Fetching tasks...");
    this.refreshTasks();

    Log.debug("Activated: Registering commands...");
    const commandBuild = vscode.commands.registerCommand(
      "monolit.build",
      build.bind(undefined, this.context)
    );
    const commandRefreshTasks = vscode.commands.registerCommand(
      "monolit.refreshTasks",
      refreshTasks.bind(undefined, this.context)
    );

    this.context.subscriptions.push(commandBuild);
    this.context.subscriptions.push(commandRefreshTasks);
  }

  activateConfiguration(configuration: LaunchConfiguration, variant: LaunchSession): void {
    this.activeConfiguration = configuration;
    this.activeSession = variant;

    this.context.workspaceState.update("monolit.lastConfiguration", {
      label: configuration.label,
      uri: configuration.workspaceFolder.uri.toString(),
    });
    this.context.workspaceState.update("monolit.lastVariant", {
      path: variant.candidate.path,
      workspace: variant.candidate.workspace.name,
    });
  }

  async executeLaunchTask(task: vscode.Task, inCwd: string): Promise<void> {
    Log.debug(`  * Executing preLaunchTask '${task.name}' in '${inCwd}'...`);

    // All tasks are currently assumed to be "shell" tasks.

    const originalExecution: vscode.ShellExecution = task.execution as vscode.ShellExecution;
    let newExecution: vscode.ShellExecution;
    Log.debug(`  ! Replacing 'cwd' in preLaunchTask with '${inCwd}'.`);

    if (originalExecution.command) {
      newExecution = new vscode.ShellExecution(originalExecution.command, originalExecution.args, {
        cwd: inCwd,
        env: originalExecution.options?.env,
        executable: originalExecution.options?.executable,
        shellArgs: originalExecution.options?.shellArgs,
        shellQuoting: originalExecution.options?.shellQuoting,
      });
    } else {
      newExecution = new vscode.ShellExecution(originalExecution.commandLine!, {
        cwd: inCwd,
        env: originalExecution.options?.env,
        executable: originalExecution.options?.executable,
        shellArgs: originalExecution.options?.shellArgs,
        shellQuoting: originalExecution.options?.shellQuoting,
      });
    }

    const buildTask: vscode.Task = new vscode.Task(
      task.definition,
      task.scope!,
      task.name,
      task.source,
      newExecution,
      task.problemMatchers
    );

    return this._executeTask(buildTask);
  }

  refreshTasks(): Thenable<Array<vscode.Task>> {
    this.taskCache = vscode.tasks.fetchTasks();
    return this.taskCache;
  }

  /**
   * Executes a task and waits for the execution to end.
   */
  async _executeTask(task: vscode.Task): Promise<void> {
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
