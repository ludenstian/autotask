import * as vscode from 'vscode';
import { AutomataskCommand } from './util/command';
import { AutomataskProvider } from './util/provider';

export async function activate(context: vscode.ExtensionContext) {
    let providerDisposable = vscode.tasks.registerTaskProvider(AutomataskProvider.AUTOMATASK_TYPE,
        new AutomataskProvider());
    let commandDisposable = vscode.commands.registerCommand(AutomataskCommand.AUTOMATASK_COMMAND, async () => {
        let tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
        let command = new AutomataskCommand(tasks, context);
        await command.run();
    });
    context.subscriptions.push(providerDisposable, commandDisposable);
}