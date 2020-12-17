import * as vscode from "vscode";

/**
 * Provide a really primitive logging interface that slightly resembles the
 * browser console.
 * Provide a static interface, but also prepare to be used as an instance for
 * whatever reason.
 */
export class Log {
  private _outputChannel: vscode.OutputChannel | undefined;

  /**
   * Initialize the log with a VS Code output channel.
   * This is the channel the log instance will write to.
   */
  init(outputChannel: vscode.OutputChannel) {
    this._outputChannel = outputChannel;
  }

  debug(text: string): void {
    if (!this._outputChannel) {
      throw new Error("missing output channel");
    }
    this._outputChannel.appendLine(text);
  }

  info(text: string): void {
    if (!this._outputChannel) {
      throw new Error("missing output channel");
    }
    this._outputChannel.appendLine(text);
  }

  warn(text: string): void {
    if (!this._outputChannel) {
      throw new Error("missing output channel");
    }
    this._outputChannel.appendLine(text);
  }

  error(text: string): void {
    if (!this._outputChannel) {
      throw new Error("missing output channel");
    }
    this._outputChannel.appendLine(text);
  }

  /**
   * Initialize the global log instance  with a VS Code output channel.
   * This is the channel the global log instance will write to.
   */
  static init(outputChannel: vscode.OutputChannel) {
    _instance.init(outputChannel);
  }

  static debug(text: string): void {
    console.debug(text);
    _instance.debug(text);
  }

  static info(text: string): void {
    console.info(text);
    _instance.info(text);
  }

  static warn(text: string): void {
    console.warn(text);
    _instance.warn(text);
  }

  static error(text: string): void {
    console.error(text);
    _instance.error(text);
  }
}

const _instance = new Log();
