import { basename } from "path";
import { QuickPickItem } from "vscode";
import { Candidate } from "./CandidateSearch";
import { LaunchConfiguration } from "./LaunchConfiguration";

export class LaunchSession implements QuickPickItem {
  private _configuration: LaunchConfiguration;
  readonly candidate: Candidate;

  constructor(configuration: LaunchConfiguration, cwd: Candidate) {
    this._configuration = configuration;
    this.candidate = cwd;
  }

  get label(): string {
    return this.candidate.displayAs || basename(this.candidate.path);
  }

  get description(): string | undefined {
    // Only print the workspace name, if the label is distinct from the
    // workspace name.
    // They can be identical if the user matched only on "${workspaceFolder}".
    // In that case we don't want the redundant repetition.
    return this.label !== this.candidate.workspace.name ? `${this.candidate.workspace.name}` : "";
  }

  get detail(): string | undefined {
    // The launch configuration to be started, and the optional preLaunchTask.
    return this._configuration.configuration.preLaunchTask
      ? `→ ${this._configuration.configuration.preLaunchTask} → ${this._configuration.configuration.name}`
      : `→ ${this._configuration.configuration.name}`;
  }

  static orderByPriority(
    variants: Array<LaunchSession>,
    lastVariant: Candidate
  ): Array<LaunchSession> {
    variants.sort((a, b) => {
      // Sort the last picked variant to the top.
      if (
        a.candidate.path === lastVariant.path &&
        a.candidate.workspace.uri.toString() === lastVariant.workspace.uri.toString()
      ) {
        return -1;
      }
      if (
        b.candidate.path === lastVariant.path &&
        b.candidate.workspace.uri.toString() === lastVariant.workspace.uri.toString()
      ) {
        return 1;
      }

      return a.label.localeCompare(b.label);
    });
    return variants;
  }
}
