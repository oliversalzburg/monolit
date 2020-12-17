import { SlowConsole } from "./SlowConsole";

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

  async analyzeAndRewrite(): Promise<void> {
    // If the cwd is empty, it's assumed to be `${workspaceFolder}`
    // If the cwd is relative, it's assumed to be relative to `${workspaceFolder}`
    if (!this._cwd.startsWith("${workspaceFolder}")) {
      await SlowConsole.warn(
        `    ! The 'cwd' should always start with '\${workspaceFolder}' to avoid confusion!`
      );
    }

    this._cwd = this._cwd.replace(/^\$\{workspaceFolder\}/, "");

    // A leading `/` would mean we have an absolute path. We don't want that.
    if (this._cwd.startsWith("/")) {
      this._cwd = this._cwd.slice(1, this._cwd.length);
    }
  }
}