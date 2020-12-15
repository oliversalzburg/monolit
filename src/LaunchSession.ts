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
    return `${this.cwd}`;
  }

  get description(): string | undefined {
    return `${this._configuration.configuration.name}`;
  }

  get detail(): string | undefined {
    return this._configuration.configuration.preLaunchTask
      ? `after running task '${this._configuration.configuration.preLaunchTask}'`
      : "no preLaunchTask configured";
  }
}
