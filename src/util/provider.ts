import { readFileSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';

export interface Requirement {
    scriptToCheck: string;
    expectedValue: string;
    name: string;
    useTask: boolean;
}
export interface AutomataskDefinition extends vscode.TaskDefinition {
    filetype: string;
    filename: string;
    taskToTrigger: string;
    require?: Array<Requirement>;
}

export class AutomataskProvider implements vscode.TaskProvider {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static AUTOMATASK_TYPE = "automatask";

    public provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        return [];
    }

    public resolveTask(task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        const taskDefinition = this.parseTaskInfo(task);
        return new vscode.Task(taskDefinition, vscode.TaskScope.Workspace,
            task.name, AutomataskProvider.AUTOMATASK_TYPE, new vscode.ShellExecution("We don't use this object"));
    }

    public parseTaskInfo(task: vscode.Task): AutomataskDefinition {
        let taskDefinition: AutomataskDefinition = <any>task.definition;
        taskDefinition.name = task.name;
        return taskDefinition;
    }
}