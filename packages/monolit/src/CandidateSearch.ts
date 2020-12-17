import glob = require("glob");
import { basename } from "path";
import * as vscode from "vscode";
import { CwdParser } from "./CwdParser";

export type Candidate = {
  workspace: vscode.WorkspaceFolder;
  path: string;
  displayAs?: string;
};

export class CandidateSearch {
  readonly cwd: string;
  readonly workspaces: Array<vscode.WorkspaceFolder>;

  constructor(cwd: string, workspaces: Array<vscode.WorkspaceFolder>) {
    this.cwd = cwd;
    this.workspaces = workspaces;
  }

  async search(): Promise<Array<Candidate>> {
    const cwdIsGlobbed = this.cwd.includes("*");

    const cwdParser = new CwdParser(this.cwd);
    await cwdParser.analyzeAndRewrite();

    const candidates: Array<Candidate> = [];
    for (const workspace of this.workspaces) {
      if (!cwdIsGlobbed) {
        let displayString = workspace.name;
        if (cwdParser.cwd) {
          displayString += `:${cwdParser.cwd}`;
        }

        try {
          await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspace.uri, cwdParser.cwd));
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
