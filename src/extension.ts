import * as vscode from 'vscode';
import { AutomataskCommand } from './util/command';
import { AutomataskProvider } from './util/provider';

export async function activate(context: vscode.ExtensionContext) {
    let providerDisposable = vscode.tasks.registerTaskProvider(AutomataskProvider.AUTOMATASK_TYPE,
        new AutomataskProvider());
    let commandDisposable = vscode.commands.registerCommand(AutomataskCommand.AUTOMATASK_COMMAND, async () => {
        let command = new AutomataskCommand();
        await command.run();
    });
    context.subscriptions.push(providerDisposable, commandDisposable);
}