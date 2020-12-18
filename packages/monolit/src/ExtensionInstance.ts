import * as vscode from "vscode";
import { build } from "./commands/build";
import { refreshTasks } from "./commands/refreshTasks";
import { Log } from "./Log";

/**
 * Represents all relevant state of the extension.
 */
export class ExtensionInstance {
  readonly context: vscode.ExtensionContext;
  taskCache: Thenable<Array<vscode.Task>>;

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

  refreshTasks(): Thenable<Array<vscode.Task>> {
    this.taskCache = vscode.tasks.fetchTasks();
    return this.taskCache;
  }
}
