import * as vscode from "vscode";
import { Candidate } from "./CandidateSearch";
import { ExtensionInstance } from "./ExtensionInstance";
import { LaunchSession } from "./LaunchSession";
import { Log } from "./Log";

/**
 * A single debug/launch configuration in MonoLit.
 * These are usually constructed from existing debug/launch configurations in
 * workspaces.
 */
export class LaunchConfiguration implements vscode.QuickPickItem {
  readonly extensionInstance: ExtensionInstance;
  readonly workspaceFolder: vscode.WorkspaceFolder;
  readonly configuration: vscode.DebugConfiguration;

  constructor(
    extensionInstance: ExtensionInstance,
    workspaceFolder: vscode.WorkspaceFolder,
    configuration: vscode.DebugConfiguration
  ) {
    this.extensionInstance = extensionInstance;
    this.workspaceFolder = workspaceFolder;
    this.configuration = configuration;
  }

  /**
   * The highlighted, searchable part of the quick-pick item.
   */
  get label(): string {
    return this.extensionInstance.configuration.get("launch.hideMonoLitPrefix")
      ? this.configuration.name.replace(/^MonoLit: /, "")
      : this.configuration.name;
  }

  /**
   * The smaller note next to the label.
   */
  get description(): string | undefined {
    return this.workspaceFolder.name;
  }

  /**
   * The line below the label.
   */
  get detail(): string | undefined {
    return this.configuration.preLaunchTask ? `→ ${this.configuration.preLaunchTask}` : "";
  }

  /**
   * Construct a new configuration that executes in the given `cwd`.
   * The `preLaunchTask` from the source configuration will be removed, as
   * MonoLit should handle pre-launch tasks itself.
   */
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

  /**
   * Get the different variants we could launch of this configuration.
   */
  asVariants(candidates: Array<Candidate>): Array<LaunchSession> {
    return candidates.map(candidate => new LaunchSession(this, candidate));
  }

  /**
   * Launch the configuration.
   */
  async launch(inCwd: string, label?: string): Promise<void> {
    Log.debug(`  * Executing launch configuration...`);
    const configuration = this.asDebugConfiguration(inCwd);
    try {
      configuration.name = `${this.label} ${label ? `(${label})` : ""}`;
      await vscode.debug.startDebugging(this.workspaceFolder, configuration);
      
    } catch (error) {
      Log.error(error);
    }
  }
}
