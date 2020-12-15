import { basename } from "path";
import * as vscode from "vscode";
import { ConfigurationLibrary } from "./ConfigurationLibrary";
import { LaunchConfiguration } from "./LaunchConfiguration";

type Selection = {
  label: string;
  uri: string;
};

export function activate(context: vscode.ExtensionContext) {
  console.debug("Fetching tasks...");

  const tasksCached = vscode.tasks.fetchTasks();

  let buildCommand = vscode.commands.registerCommand("monolit.build", async () => {
    if (!Array.isArray(vscode.workspace.workspaceFolders)) {
      return;
    }

    const tasks = await tasksCached;

    const launchConfigurations = new Array<LaunchConfiguration>();
    const previousSelection: Selection | undefined = context.workspaceState.get(
      "monolit.lastSelection"
    );

    const library = ConfigurationLibrary.fromWorkspaceFolders(vscode.workspace.workspaceFolders);
    /*
			let previousConfig: LaunchConfiguration | undefined;
			const launchConfigs = debugConfigurations.map(debugConfiguration => {
				const launchConfiguration = new LaunchConfiguration(workspaceFolder, debugConfiguration);
				if (previousSelection && previousSelection.label === launchConfiguration.label && previousSelection.uri && launchConfiguration.workspaceFolder.uri) {
					console.log("Found previous selection again");
					previousConfig = launchConfiguration;
				}
				return launchConfiguration;
			});
	
			// Add all launch configurations.
			launchConfigurations.push(...launchConfigs);
			// The move the previously selected one to the top.
			if (previousConfig) {
				const index = launchConfigurations.indexOf(previousConfig);
				launchConfigurations.splice(index, 1);
				launchConfigurations.unshift(previousConfig);
			}
			*/

    const selectedConfiguration = await vscode.window.showQuickPick(library.configurations, {
      placeHolder: "Select launch configuration",
    });

    if (!selectedConfiguration) {
      console.warn("Operation cancelled");
      return;
    }

    console.log(
      `Selected: ${selectedConfiguration.label} (${selectedConfiguration.workspaceFolder.uri}) with preLaunchTask: ${selectedConfiguration.configuration.preLaunchTask}`
    );
    context.workspaceState.update("monolit.lastSelection", {
      label: selectedConfiguration.label,
      uri: selectedConfiguration.workspaceFolder.uri,
    });

    console.log(`Target cwd: '${selectedConfiguration.configuration.cwd}'`);

    // Extremely primitive approach to workspace selection.
    // We currently only support * at the tail of the base selector.
    // Use a proper glob matching library to find the targets!
    const baseSelector = basename(selectedConfiguration.configuration.cwd);
    const requiredPrefix = baseSelector.replace("*", "");
    const cwdSelector = selectedConfiguration.configuration.cwd
      .replace("${workspaceFolder}", "")
      .replace(baseSelector, "");

    console.log(`Base selector is: ${baseSelector}`);

    const newUri = vscode.Uri.joinPath(selectedConfiguration.workspaceFolder.uri, cwdSelector);

    console.log(`Searching for matches on '${cwdSelector}'...`);
    const contents = await vscode.workspace.fs.readDirectory(newUri);
    const folders = contents
      .filter(entry => entry[1] === 2 && entry[0].startsWith(requiredPrefix))
      .map(entry => `\${workspaceFolder}${cwdSelector}/${entry[0]}`);
    console.dir(folders);

    const launchVariants = selectedConfiguration.asVariants(folders);
    const selectedVariant = await vscode.window.showQuickPick(launchVariants, {
      placeHolder: "Select target cwd",
    });

    if (!selectedVariant) {
      console.warn("Operation cancelled");
      return;
    }

    await selectedConfiguration.launch(tasks, selectedVariant);
  });

  console.debug("Registering commands...");
  context.subscriptions.push(buildCommand);
}
