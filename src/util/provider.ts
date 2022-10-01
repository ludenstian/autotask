import * as vscode from 'vscode';

export interface AutomataskDefinition extends vscode.TaskDefinition {
    filetype: string;
    validate?: string;
    expected?: string;
    trigger: string;
}

export class AutomataskProvider implements vscode.TaskProvider {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static AUTOMATASK_TYPE = "automatask";

    private _tasks: vscode.Task[] | undefined;

    constructor() {
    }

    public provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        return undefined;
    }

    public resolveTask(task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        const taskDefinition: AutomataskDefinition = <any>task.definition;
        return new vscode.Task(taskDefinition, vscode.TaskScope.Workspace,
            task.name, AutomataskProvider.AUTOMATASK_TYPE, new vscode.ShellExecution(taskDefinition.validate!));
    }
}