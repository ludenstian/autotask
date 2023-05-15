import * as vscode from 'vscode';
import { AutomataskCommand } from './util/command';
import { AutomataskProvider } from './util/provider';
import { GlobalCacheMonitor } from './util/cacheMonitor';
import { GlobalTaskManager } from './util/taskManager';

let providerDisposable: vscode.Disposable | undefined;
let commandDisposable: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const command = new AutomataskCommand();
    let initialize = false;
    providerDisposable = vscode.tasks.registerTaskProvider(AutomataskProvider.AUTOMATASK_TYPE,
        new AutomataskProvider());
    commandDisposable = vscode.commands.registerCommand(AutomataskCommand.AUTOMATASK_COMMAND, async () => {
        if (initialize === false) {
            await GlobalTaskManager.initialize();
            await GlobalCacheMonitor.initialize(context);
            initialize = true;
        }
        await command.run();
    });
}

export async function deactivate() {
    providerDisposable?.dispose();
    commandDisposable?.dispose();
    GlobalTaskManager.dispose();
    await GlobalCacheMonitor.dispose();
}