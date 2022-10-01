import * as path from 'path'
import * as vscode from 'vscode';
import * as cp from 'child_process'
import { AutomataskDefinition } from './provider';

export class AutomataskCommand {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static AUTOMATASK_COMMAND = "automatask.run";
    private _tasks: vscode.Task[];
    private _context: vscode.ExtensionContext;

    constructor(tasks: vscode.Task[], context: vscode.ExtensionContext) {
        this._tasks = tasks;
        this._context = context;
    }

    public async run() {
        const validTasks: vscode.Task[] = this.executeValidTasks(this.getValidTasks());
        const tasksToRunNext: vscode.Task[] = this.findTriggeredTask(validTasks);
        if (tasksToRunNext.length === 0) {
            vscode.window.showWarningMessage("Can not find any suitable tasks!");
            return;
        }
        if (tasksToRunNext.length > 1) {
            vscode.window.showInformationMessage("Haven't support multi suitable tasks yet!");
            return;
        }
        await vscode.tasks.executeTask(tasksToRunNext.at(0)!);
    }

    private getValidTasks() : vscode.Task[] {
        let result: vscode.Task[] = [];
        this._tasks.forEach(task => {
            const taskInfo: AutomataskDefinition = <any>task.definition;
            if (path.extname(vscode.window.activeTextEditor?.document.fileName ?? "") !== taskInfo.filetype) {
                return;
            }
            result.push(task);
        });
        return result;
    }

    private executeValidTasks(tasks: vscode.Task[]) : vscode.Task[] {
        let result: vscode.Task[] = [];
        tasks.forEach(task => {
            const taskInfo: AutomataskDefinition = <any>task.definition;
            if (taskInfo.validate === undefined) {
                return;
            }
            let buffer = cp.execSync(taskInfo.validate!);
            if (buffer.toString() !== taskInfo.expected) {
                return;
            }
            result.push(task);
        });
        return result;
    }

    private findTriggeredTask(tasks: vscode.Task[]) : vscode.Task[] {
        let result: vscode.Task[] = [];
        for (let index = 0; index < tasks.length; index++) {
            const task = tasks[index];
            const taskInfo: AutomataskDefinition = <any>task.definition;
            for (let j = 0; j < this._tasks.length; j++) {
                const globalTask = this._tasks[j];
                if (taskInfo.trigger === globalTask.name) {
                    result.push(globalTask);
                }
            }
        }
        return result;
    }
}