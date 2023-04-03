import path = require('path');
import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as util from 'node:util';
import { Status, executionManager } from './executionManager';
import { taskManager } from './taskManager';
import { EventEmitter } from 'node:events';
const exec = util.promisify(cp.exec);

export interface Shell {
    executable?: string | undefined;
}
export interface CommandOptions {
    cwd?: string | undefined;
    env?: NodeJS.Dict<string>;
    shell?: Shell | undefined;
}
export interface Requirement {
    command: string;
    expectedValue: string;
    name: string;
    options?: CommandOptions | undefined;
}
export interface AutomataskDefinition extends vscode.TaskDefinition {
    filePatterns: Array<string>;
    taskToTrigger: Array<string>;
    require?: Array<Requirement>;
}

export class AutomataskProvider implements vscode.TaskProvider {
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
    ENDLINE = "\r\n",
    TAB = "\t"
};

class AutomataskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private taskDefinition: AutomataskDefinition;
    private taskExecution: vscode.TaskExecution | undefined;
    private taskStatusEmitter: EventEmitter | undefined;

    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<number> = this.closeEmitter.event;

    constructor(taskDef: AutomataskDefinition) {
        this.taskDefinition = taskDef;
    }

    async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
        this.taskStatusEmitter = executionManager.GetEmitterFromManager();
        if (this.taskStatusEmitter === undefined) { // Should never happen
            vscode.window.showErrorMessage("Extension error. Please open issue at https://github.com/ludenstian/automatask/issues");
            this.closeEmitter.fire(1);
            return;
        }
        this.writeEmitter.fire(`Running ${this.taskDefinition.name}${Character.ENDLINE}`);
        if (!this.doesMatchFilepatterns()) {
            this.closeEmitter.fire(1);
            this.taskStatusEmitter.emit(Status.FAIL);
            return;
        }

        if (! (await this.doesTaskMeetRequirements())) {
            this.closeEmitter.fire(1);
            this.taskStatusEmitter.emit(Status.FAIL);
            return;
        }

        let tasksToRunNext = await this.getTasksToTrigger();

        if (tasksToRunNext.length === 0) {
            this.writeEmitter.fire(Character.TAB + "Cannot find any suitable tasks!" + Character.TAB);
            this.closeEmitter.fire(1);
            this.taskStatusEmitter.emit(Status.FAIL);
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
            this.taskStatusEmitter.emit(Status.SUCCESS);
            return;
        }
        this.taskExecution = await vscode.tasks.executeTask(tasksToRunNext.at(0)!);
        this.closeEmitter.fire(0);
        this.taskStatusEmitter.emit(Status.SUCCESS);
    }

    close(): void {
        this.taskExecution?.terminate();
    }

    private doesMatchFilepatterns(): boolean {
        try {
            let currentFilename = vscode.window.activeTextEditor!.document.fileName;
            for (const pattern of this.taskDefinition.filePatterns) {
                let regexPattern = RegExp(pattern);
                if (regexPattern.test(currentFilename)) {
                    return true;
                }
            }
        }
        catch (e) {
            this.writeEmitter.fire(Character.TAB + (e as Error).message + Character.ENDLINE);
            return false;
        }
        return false;
    }

    private async execRequirement(requirement: Requirement) : Promise<boolean> {
        let command = requirement.command;
        try {
            const {stdout, stderr} = await exec(command, {
                encoding: "utf-8",
                cwd: requirement.options?.cwd,
                shell: requirement.options?.shell?.executable,
                env: requirement.options?.env
            });
            const trim_result = stdout.trim();
            if (trim_result !== requirement.expectedValue) {
                this.writeEmitter.fire(Character.TAB + `The result '${trim_result}' is not equal with '${requirement.expectedValue}'` + Character.ENDLINE);
                return false;
            }
            return true;
        }
        catch (e) {
            this.writeEmitter.fire(Character.TAB + `Can not run command: ${command}` + Character.ENDLINE);
            return false;
        }
    }

    private async doesTaskMeetRequirements(): Promise<boolean> {
        if (this.taskDefinition.require === undefined || this.taskDefinition.require.length === 0) {
            return true;
        }
        let requirePromises: Promise<boolean>[] = [];
        for (const requirement of this.taskDefinition.require!) {
            requirePromises.push(this.execRequirement(requirement));
        }
        let finalResult = await Promise.all(requirePromises).catch(reason => {
            this.writeEmitter.fire(Character.TAB + `${reason}` + Character.ENDLINE);
            return [false];
        });
        return finalResult.every(Boolean);
    }

    private async getTasksToTrigger(): Promise<vscode.Task[]> {
        let tasks = taskManager.GetAllTaskExceptAutomatask();
        let result: vscode.Task[] = [];
        for (const task of tasks) {
            if (task.definition.type === AutomataskProvider.AUTOMATASK_TYPE) {
                continue;
            }
            if (this.taskDefinition.taskToTrigger.indexOf(task.name) === -1) {
                continue;
            }
            result.push(task);
        }
        return result;
    }
}