import glob = require("glob");
import { basename } from "path";
import * as vscode from "vscode";
import { CwdParser } from "./CwdParser";

/**
 * A candidate for launching a configuration into.
 */
export type Candidate = {
  /**
   * The workspace folder this candidate appeared in.
   */
  workspace: vscode.WorkspaceFolder;

  /**
   * The path in the workspace folder that matched the request.
   */
  path: string;

  /**
   * How this candidate wants to be displayed in a selection.
   */
  displayAs?: string;
};

/**
 * When we have a configuration selected, we want to find which folders are
 * candidates for us to launch the program in.
 * This class is supposed to help us in finding the possible candidates for
 * program executions.
 */
export class CandidateSearch {
  /**
   * The CWD that was specified in the launch configuration.
   */
  readonly cwd: string;

  /**
   * The folders in the current workspace.
   */
  readonly workspaceFolders: Array<vscode.WorkspaceFolder>;

  constructor(cwd: string, workspaces: Array<vscode.WorkspaceFolder>) {
    this.cwd = cwd;
    this.workspaceFolders = workspaces;
  }

  /**
   * Search for possible candidates, that have the given `cwd` in their
   * workspace.
   */
  async search(): Promise<Array<Candidate>> {
    const cwdIsGlobbed = this.cwd.includes("*");

    const cwdParser = new CwdParser(this.cwd);
    await cwdParser.analyzeAndRewrite();

    const candidates: Array<Candidate> = [];
    for (const workspace of this.workspaceFolders) {
      if (!cwdIsGlobbed) {
        // If the CWD is not a glob pattern, we only care about exact matches in
        // workspace folders.
        try {
          await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspace.uri, cwdParser.cwd));

          let displayString = workspace.name;
          if (cwdParser.cwd) {
            displayString += `:${cwdParser.cwd}`;
          }
          
          candidates.push({
            path: cwdParser.cwd,
            displayAs: displayString,
            workspace,
          });
        } catch (error) {
          //ignored
        }

        continue;
      }

      // Look for targets matching the glob pattern.
      const targets = glob.sync(cwdParser.cwd, {
        cwd: workspace.uri.fsPath,
      });
      for (const target of targets) {
        candidates.push({
          path: target,
          displayAs: basename(target),
          workspace,
        });
      }
    }

    return candidates;
  }
}
