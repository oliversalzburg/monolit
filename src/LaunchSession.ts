import { basename } from "path";
import { QuickPickItem } from "vscode";
import { LaunchConfiguration } from "./LaunchConfiguration";

export class LaunchSession implements QuickPickItem {
  private _configuration: LaunchConfiguration;
  readonly cwd: string;

  constructor(configuration: LaunchConfiguration, cwd: string) {
    this._configuration = configuration;
    this.cwd = cwd;
  }

  get label(): string {
    return this.basename;
  }

  get basename(): string {
    return `${basename(this.cwd)}`;
  }

  get description(): string | undefined {
    return `${this._configuration.configuration.name}`;
  }

  get detail(): string | undefined {
    return this._configuration.configuration.preLaunchTask
      ? `→ ${this._configuration.configuration.preLaunchTask}`
      : "";
  }

  static orderByPriority(
    variants: Array<LaunchSession>,
    lastVariantCwd: string
  ): Array<LaunchSession> {
    variants.sort((a, b) => {
      if (a.cwd === lastVariantCwd) {
        return -1;
      }
      if (b.cwd === lastVariantCwd) {
        return 1;
      }

      return a.label.localeCompare(b.label);
    });
    return variants;
  }
}
