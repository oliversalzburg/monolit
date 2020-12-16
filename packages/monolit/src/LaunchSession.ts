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
    return basename(this.candidate.path);
  }

  get description(): string | undefined {
    return `${this.candidate.workspace.name}`;
  }

  get detail(): string | undefined {
    return this._configuration.configuration.preLaunchTask
      ? `→ ${this._configuration.configuration.preLaunchTask} → ${this._configuration.configuration.name}`
      : `→ ${this._configuration.configuration.name}`;
  }

  static orderByPriority(
    variants: Array<LaunchSession>,
    lastVariantCwd: Candidate
  ): Array<LaunchSession> {
    variants.sort((a, b) => {
      if (a.candidate === lastVariantCwd) {
        return -1;
      }
      if (b.candidate === lastVariantCwd) {
        return 1;
      }

      return a.label.localeCompare(b.label);
    });
    return variants;
  }
}
