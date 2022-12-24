import * as path from 'path';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AutomataskDefinition, Requirement } from './provider';

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
        const relatedAutomatask: vscode.Task[] = this.getAutomatasksRelateToFilenameOrExtension();
        const meetRequirementTasks: vscode.Task[] = this.getTasksMeetRequirements(relatedAutomatask);
        const tasksToRunNext: vscode.Task[] = this.getTasksToTrigger(meetRequirementTasks);
        if (tasksToRunNext.length === 0) {
            vscode.window.showInformationMessage("Cannot find any suitable tasks!");
            return;
        }
        if (tasksToRunNext.length > 1) {
            let nameOfTaskToRun = await vscode.window.showQuickPick(tasksToRunNext.map(task => task.name));
            for (const task of tasksToRunNext) {
                if (task.name !== nameOfTaskToRun) {
                    continue;
                }
                await vscode.tasks.executeTask(task);
            }
            return;
        }
        await vscode.tasks.executeTask(tasksToRunNext.at(0)!);
    }

    private getAutomatasksRelateToFilenameOrExtension(): vscode.Task[] {
        let result: vscode.Task[] = [];
        this._tasks.forEach(task => {
            const taskInfo: AutomataskDefinition = <any>task.definition;
            if (taskInfo.type !== "automatask") {
                return;
            }
            if (taskInfo.filetype === "*" && taskInfo.filename === "*") {
                result.push(task);
                return;
            }
            let currentFilename = path.basename(vscode.window.activeTextEditor!.document.fileName);
            if (taskInfo.filetype === "*") { // Now, taskInfo.filename !== "*"
                if (currentFilename === taskInfo.filename) {
                    result.push(task);
                }
            }
            else {
                if (currentFilename.endsWith(taskInfo.filetype)) {
                    if (taskInfo.filename === "*" || currentFilename === taskInfo.filename) {
                        result.push(task);
                    }
                }
            }
        });
        if (result.length === 0) {
            vscode.window.showInformationMessage("Cannot find any tasks related to this file");
        }
        return result;
    }

    private getTasksMeetRequirements(tasks: vscode.Task[]): vscode.Task[] {
        let result: vscode.Task[] = [];
        tasks.forEach(task => {
            const taskInfo: AutomataskDefinition = <any>task.definition;
            for (const requirement of taskInfo.require!) {
                try {
                    let buffer = cp.execSync(requirement.scriptToCheck);
                    if (buffer.toString("utf-8").trim() !== requirement.expectedValue) {
                        return [];
                    }
                    result.push(task);
                }
                catch (e) {
                    return [];
                }
            }
        });
        return result;
    }

    private getTasksToTrigger(tasks: vscode.Task[]): vscode.Task[] {
        let result: vscode.Task[] = [];
        for (const task of tasks) {
            const taskInfo: AutomataskDefinition = <any>task.definition;
            for (const otherTask of this._tasks) {
                if (taskInfo.taskToTrigger !== otherTask.name) {
                    continue;
                }
                result.push(otherTask);
            }
        }
        return result;
    }
}