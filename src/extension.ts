import * as vscode from 'vscode';
import { AutotaskCommand } from './util/command';
import { AutotaskProvider } from './util/provider';
import { GlobalCacheMonitor } from './util/cacheMonitor';
import { GlobalTaskManager } from './util/taskManager';
import { INFO, disposeLogger } from './util/logger';

let providerDisposable: vscode.Disposable | undefined;
let commandDisposable: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
    INFO("Activate extension");
    const command = new AutotaskCommand();
    let initialize = false;
    providerDisposable = vscode.tasks.registerTaskProvider(AutotaskProvider.AUTOTASK_TYPE,
        new AutotaskProvider());
    commandDisposable = vscode.commands.registerCommand(AutotaskCommand.AUTOTASK_COMMAND, async () => {
        if (initialize === false) {
            INFO("Init global variables");
            await GlobalTaskManager.initialize();
            await GlobalCacheMonitor.initialize(context);
            initialize = true;
        }
        await command.run();
    });
    INFO("Finish activating extension");
}

export async function deactivate() {
    INFO("Deactivate extension");
    providerDisposable?.dispose();
    commandDisposable?.dispose();
    GlobalTaskManager.dispose();
    await GlobalCacheMonitor.dispose();
    INFO("Finish deactivating extension");
    disposeLogger();
}