import { join } from "path";
import { LaunchSession } from "./LaunchSession";
import { Log } from "./Log";

/**
 * Given a `cwd` in a user-defined launch configuration, make something out of
 * it that is easier for us to consume through out the extension.
 */
export class CwdParser {
  readonly originalCwd: string;
  private _cwd = "";

  constructor(cwd: string) {
    this.originalCwd = cwd;
    this._cwd = cwd;
  }

  get cwd(): string {
    return this._cwd;
  }

  /**
   * Rewrite the `cwd` to something we can process properly.
   */
  async analyzeAndRewrite(): Promise<void> {
    // If the initial cwd starts with a /, we assume it's an absolute path to not mess with.
    if (this._cwd.startsWith("/")) {
      return;
    }

    // If the cwd is empty, it's assumed to be `${workspaceFolder}`
    // If the cwd is relative, it's assumed to be relative to `${workspaceFolder}`
    if (!this._cwd.startsWith("${workspaceFolder}")) {
      Log.warn(
        `    ! The 'cwd' should always start with '\${workspaceFolder}' to avoid confusion!`
      );
    }

    this._cwd = this._cwd.replace(/^\$\{workspaceFolder\}/, "");

    // A leading `/` would mean we have an absolute path. We don't want that.
    if (this._cwd.startsWith("/")) {
      this._cwd = this._cwd.slice(1, this._cwd.length);
    }
  }

  static cwdFromVariant(variant: LaunchSession): string {
    return variant.candidate.path.startsWith("/")
      ? variant.candidate.path
      : join(variant.candidate.workspace.uri.fsPath, variant.candidate.path);
  }
}
