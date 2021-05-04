import * as vscode from "vscode";
import { CandidateSearch } from "./CandidateSearch";
import { cleanStart } from "./commands/cleanStart";
import { ignite } from "./commands/ignite";
import { refreshTasks } from "./commands/refreshTasks";
import { restart } from "./commands/restart";
import { start } from "./commands/start";
import { ConfigurationLibrary, SelectedConfiguration } from "./ConfigurationLibrary";
import { LaunchConfiguration } from "./LaunchConfiguration";
import { LaunchSession } from "./LaunchSession";
import { Log } from "./Log";

export type Selection = {
  configuration: LaunchConfiguration;
  variant: LaunchSession;
};

/**
 * Represents all relevant state of the extension.
 */
export class ExtensionInstance {
  readonly context: vscode.ExtensionContext;
  taskCache: Thenable<Array<vscode.Task>>;

  activeConfiguration: LaunchConfiguration | undefined;
  activeSession: LaunchSession | undefined;

  get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("monolit");
  }

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.taskCache = Promise.resolve([]);

    const outputChannel = vscode.window.createOutputChannel("MonoLit");
    Log.init(outputChannel);
  }

  init() {
    // Fetch as early as possible to populate the cache.
    // Ideally, we would be persisting this cache into the workspace state...
    Log.debug("Activated: Fetching tasks...");
    this.refreshTasks();

    Log.debug("Activated: Registering commands...");
    const commandCleanStart = vscode.commands.registerCommand(
      "monolit.cleanStart",
      cleanStart.bind(undefined, this.context)
    );
    const commandIgnite = vscode.commands.registerCommand(
      "monolit.ignite",
      ignite.bind(undefined, this.context)
    );
    const commandRefreshTasks = vscode.commands.registerCommand(
      "monolit.refreshTasks",
      refreshTasks.bind(undefined, this.context)
    );
    const commandRestart = vscode.commands.registerCommand(
      "monolit.restart",
      restart.bind(undefined, this.context)
    );

    const commandStart = vscode.commands.registerCommand(
      "monolit.start",
      start.bind(undefined, this.context)
    );

    this.context.subscriptions.push(commandCleanStart);
    this.context.subscriptions.push(commandIgnite);
    this.context.subscriptions.push(commandRefreshTasks);
    this.context.subscriptions.push(commandRestart);
    this.context.subscriptions.push(commandStart);

    Log.debug("Activated: Activation complete.");
  }

  /**
   * Assume a given configuration as the currently active one.
   * This should be used to improve user experience.
   */
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

  /**
   * Let the user pick a configuration and a target cwd for a launch.
   */
  async pickConfigurationVariant(): Promise<Selection | undefined> {
    if (!Array.isArray(vscode.workspace.workspaceFolders)) {
      Log.warn("No workspace open. Aborting.");
      return;
    }

    Log.debug("Loading previous configuration selection...");
    const previousConfig: SelectedConfiguration | undefined = this.context.workspaceState.get(
      "monolit.lastConfiguration"
    );
    if (previousConfig) {
      Log.debug(`  → ${previousConfig.label}@${previousConfig.uri}`);
    } else {
      Log.debug(`  → none`);
    }

    Log.debug("Constructing configuration library...");
    const library = await ConfigurationLibrary.fromWorkspaceFolders(
      this,
      vscode.workspace.workspaceFolders
    );
    if (previousConfig) {
      library.orderByPriority(previousConfig);
    }
    Log.debug(`  → ${library.configurations.length} entries`);

    const selectedConfiguration = await vscode.window.showQuickPick(library.configurations, {
      placeHolder:
        library.configurations.length === 0
          ? "No monolit-able configurations found."
          : "Select launch configuration",
    });

    if (!selectedConfiguration) {
      Log.warn("Operation cancelled.");
      return;
    }

    Log.debug(
      `Selected: ${selectedConfiguration.label} (${selectedConfiguration.workspaceFolder.uri}) with preLaunchTask: ${selectedConfiguration.configuration.preLaunchTask}`
    );

    const configuredCwd: string = selectedConfiguration.configuration.cwd ?? "${workspaceFolder}";
    const search = new CandidateSearch(configuredCwd, vscode.workspace.workspaceFolders);

    const cwdIsGlobbed = configuredCwd && configuredCwd.includes("*");

    Log.debug(`  + Configured cwd: '${configuredCwd}'${cwdIsGlobbed ? "" : " (not globbed)"}`);

    // Find new cwd for operation.
    Log.debug(`  ? Starting candidate search in all workspaces...`);
    const targets = await search.search();

    let selectedVariant: LaunchSession | undefined;

    if (1 === targets.length && this.configuration.get("launch.autoSelectSingleCwd") === true) {
      // There is only 1 variant/cwd that should be auto-selected.
      selectedVariant = selectedConfiguration.asVariants(targets)[0];
    } else {
      let infoString = targets
        .map(target => `${target.workspace.name}:${target.path || "<root>"}`)
        .join(",");
      if (100 < infoString.length) {
        infoString = infoString.slice(0, 100) + "...";
      }
      const folders = targets.map(entry => `${entry.workspace.name}/${entry.path}`);
      Log.debug(`  → ${folders.length} entries: ${infoString}`);

      // Get the previously selected variant to offer it as the top choice.
      Log.debug("Loading last configuration variant...");
      let previousVariant:
        | { path: string; workspace: string }
        | undefined = this.context.workspaceState.get("monolit.lastVariant");
      // Basic schema check for setting while we're still moving shit around.
      if (
        previousVariant &&
        (typeof previousVariant !== "object" ||
          "workspace" in previousVariant === false ||
          "path" in previousVariant === false)
      ) {
        previousVariant = undefined;
      }
      if (previousVariant) {
        Log.debug(`  → was: ${previousVariant.workspace}:${previousVariant.path || "<root>"}`);
      } else {
        Log.debug(`  → was: none`);
      }

      const launchVariants: Array<LaunchSession> = selectedConfiguration.asVariants(targets);
      if (previousVariant) {
        LaunchSession.orderByPriority(launchVariants, previousVariant);
      }

      selectedVariant = await vscode.window.showQuickPick<LaunchSession>(
        new Promise(async resolve => {
          await this.taskCache;
          resolve(launchVariants);
        }),
        {
          placeHolder: "Select target cwd",
        }
      );
    }

    if (!selectedVariant) {
      Log.warn("Operation cancelled.");
      return;
    }

    // Persist selected configuration
    Log.info(`  + Persisting selected configuration information...`);
    this.activateConfiguration(selectedConfiguration, selectedVariant);

    return {
      configuration: selectedConfiguration,
      variant: selectedVariant,
    };
  }

  /**
   * Execute a task in a cwd and wait for it to complete.
   */
  async executeTask(task: vscode.Task, inCwd: string): Promise<void> {
    Log.debug(`  * Executing preLaunchTask '${task.name}' in '${inCwd}'...`);

    // All tasks are currently assumed to be "shell" tasks.

    const originalExecution: vscode.ShellExecution = task.execution as vscode.ShellExecution;
    let newExecution: vscode.ShellExecution;

    if (originalExecution.options?.cwd) {
      Log.debug(`  ! NOT setting 'cwd' in preLaunchTask, using configuration.`);
      inCwd = originalExecution.options?.cwd;
    } else {
      Log.debug(`  ! Setting 'cwd' in preLaunchTask with '${inCwd}'.`);
    }

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

    try {
      await this._executeTask(buildTask);
    } catch (error) {
      Log.warn(`  ☠ ${error?.message ?? "Pre-launch task failed."}`);
      throw error;
    }
  }

  /**
   * Refresh the task cache.
   */
  refreshTasks(): Thenable<Array<vscode.Task>> {
    this.taskCache = vscode.tasks.fetchTasks();
    return this.taskCache;
  }

  /**
   * Executes a task and waits for the execution to end.
   */
  private async _executeTask(task: vscode.Task): Promise<void> {
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

    return new Promise<void>((resolve, reject) => {
      const onEndTaskListener = vscode.tasks.onDidEndTask(e => {
        if (e.execution === execution) {
          onEndTaskListener.dispose();
          onEndTaskProcessListener.dispose();
          resolve();
        }
      });

      const onEndTaskProcessListener = vscode.tasks.onDidEndTaskProcess(e => {
        if (e.execution === execution) {
          onEndTaskListener.dispose();
          onEndTaskProcessListener.dispose();

          if (e.exitCode === 0) {
            resolve();
          } else {
            reject(new Error("Pre-launch task failed."));
          }
        }
      });
    });
  }
}
