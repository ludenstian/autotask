import path = require('path');
import * as cp from 'child_process';
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
        return new vscode.Task(task.definition, vscode.TaskScope.Workspace,
            task.name, AutomataskProvider.AUTOMATASK_TYPE, new vscode.CustomExecution(async (resolvedDefinition: vscode.TaskDefinition): Promise<vscode.Pseudoterminal> => {
                resolvedDefinition.name = task.name;
                return new AutomataskTerminal(<any>resolvedDefinition);
            }), "");
    }
}

enum Character {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ENDLINE = "\r\n",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TAB = "\t"
};
class AutomataskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private taskDefinition: AutomataskDefinition;

    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<number> = this.closeEmitter.event;

    constructor(taskDef: AutomataskDefinition) {
        this.taskDefinition = taskDef;
    }

    async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
        this.writeEmitter.fire(`Running ${this.taskDefinition.name}${Character.ENDLINE}`);
        if (!this.isAutomatasksRelateToFilenameOrExtension()) {
            this.closeEmitter.fire(1);
            return;
        }

        if (!this.doesTaskMeetRequirements()) {
            this.closeEmitter.fire(1);
            return;
        }

        let tasksToRunNext = await this.getTasksToTrigger();

        if (tasksToRunNext.length === 0) {
            this.writeEmitter.fire(Character.TAB + "Cannot find any suitable tasks!" + Character.TAB);
            this.closeEmitter.fire(1);
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
            this.closeEmitter.fire(0);
            return;
        }
        await vscode.tasks.executeTask(tasksToRunNext.at(0)!);
        this.closeEmitter.fire(0);
    }
    close(): void { }

    private isAutomatasksRelateToFilenameOrExtension(): boolean {
        try {
            let currentFilename = path.basename(vscode.window.activeTextEditor!.document.fileName);
            let regexPattern = RegExp(this.taskDefinition.filename);
            if (!regexPattern.test(currentFilename)) {
                this.writeEmitter.fire(Character.TAB + `Cannot match current filename with pattern ${regexPattern.source}` + Character.ENDLINE);
                return false;
            }
            if (this.taskDefinition.filetype !== "*" && !currentFilename.endsWith(this.taskDefinition.filetype)) {
                this.writeEmitter.fire(Character.TAB + `Current file name doesn't endwith ${this.taskDefinition.filetype}` + Character.ENDLINE);
                return false;
            }
        }
        catch (e) {
            this.writeEmitter.fire(Character.TAB + (e as Error).message + Character.ENDLINE);
            return false;
        }
        return true;
    }

    private doesTaskMeetRequirements(): boolean {
        if (this.taskDefinition.require === undefined || this.taskDefinition.require.length === 0) {
            return true;
        }
        for (const requirement of this.taskDefinition.require!) {
            try {
                let buffer = cp.execSync(requirement.scriptToCheck, {
                    encoding: "utf-8"
                });
                if (buffer.trim() !== requirement.expectedValue) {
                    this.writeEmitter.fire(Character.TAB + `The result '${buffer.trim()}' is not equal with '${requirement.expectedValue}'` + Character.ENDLINE);
                    return false;
                }
            }
            catch (e) {
                this.writeEmitter.fire(Character.TAB + (e as Error).message + Character.ENDLINE);
                return false;
            }
        }
        return true;
    }

    private async getTasksToTrigger(): Promise<vscode.Task[]> {
        let tasks = await vscode.tasks.fetchTasks();
        let result: vscode.Task[] = [];
        for (const task of tasks) {
            if (task.definition.type === AutomataskProvider.AUTOMATASK_TYPE) {
                continue;
            }
            if (this.taskDefinition.taskToTrigger !== task.name) {
                continue;
            }
            result.push(task);
        }
        return result;
    }
}