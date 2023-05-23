import * as vscode from 'vscode';
import { AutomataskCommand } from './util/command';
import { AutomataskProvider } from './util/provider';
import { GlobalCacheMonitor } from './util/cacheMonitor';
import { GlobalTaskManager } from './util/taskManager';
import { INFO, disposeLogger } from './util/logger';

let providerDisposable: vscode.Disposable | undefined;
let commandDisposable: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
    INFO("Activate extension");
    const command = new AutomataskCommand();
    let initialize = false;
    providerDisposable = vscode.tasks.registerTaskProvider(AutomataskProvider.AUTOMATASK_TYPE,
        new AutomataskProvider());
    commandDisposable = vscode.commands.registerCommand(AutomataskCommand.AUTOMATASK_COMMAND, async () => {
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