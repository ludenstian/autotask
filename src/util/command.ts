import * as vscode from 'vscode';
import { AutomataskDefinition, AutomataskProvider, Requirement } from './provider';

export class AutomataskCommand {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static AUTOMATASK_COMMAND = "automatask.run";

    public async run() {
        let tasks: vscode.Task[] = await vscode.tasks.fetchTasks({
            type: AutomataskProvider.AUTOMATASK_TYPE
        });
        for (const task of tasks) {
            await vscode.tasks.executeTask(task);
        }
    }
}