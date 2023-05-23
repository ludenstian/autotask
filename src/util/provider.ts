import path = require('path');
import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as util from 'node:util';
import { executionManager } from './executionManager';
import { GlobalTaskManager } from './taskManager';
import { Deferred } from 'ts-deferred';
import { INFO } from './logger';
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
                return new AutomataskTerminal(task.name, <any>resolvedDefinition);
            }), "");
    }
}

enum Character {
    ENDLINE = "\r\n"
};

class AutomataskTerminal implements vscode.Pseudoterminal {
    private writeEmitter_ = new vscode.EventEmitter<string>();
    private closeEmitter_ = new vscode.EventEmitter<number>();
    private taskDefinition_: AutomataskDefinition;
    private downstreamTaskExecution_: vscode.TaskExecution | undefined;
    private taskName_: string;
    private deferred_: Deferred<vscode.TaskExecution> | undefined;
    private requirementProcessList_: cp.ChildProcess[];

    onDidWrite: vscode.Event<string> = this.writeEmitter_.event;
    onDidClose?: vscode.Event<number> = this.closeEmitter_.event;

    constructor(taskName: string, taskDef: AutomataskDefinition) {
        this.taskName_ = taskName;
        this.taskDefinition_ = taskDef;
        this.deferred_ = undefined;
        this.requirementProcessList_ = [];
    }

    async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
        INFO(`Open terminal for task '${this.taskName_}'`);
        this.deferred_ = executionManager.GetDeferredPromiseByTaskName(this.taskName_);
        this.writeEmitter_.fire(`Running ${this.taskName_}${Character.ENDLINE}`);
        if (!this.doesMatchFilepatterns()) {
            this.deferred_.reject();
            this.closeEmitter_.fire(1);
            return;
        }

        if (!(await this.doesTaskMeetRequirements())) {
            this.deferred_.reject();
            this.closeEmitter_.fire(1);
            return;
        }
        this.requirementProcessList_ = [];
        const candidateDownstreamTasks = await this.getTasksToTrigger();

        if (candidateDownstreamTasks.length === 0) {
            this.writeEmitter_.fire("Cannot find any suitable tasks!" + Character.ENDLINE);
            this.deferred_.reject();
            this.closeEmitter_.fire(1);
            return;
        }
        let index = 0;
        if (candidateDownstreamTasks.length > 1) {
            const downstreamTaskName = await vscode.window.showQuickPick(candidateDownstreamTasks.map(task => task.name));
            index = candidateDownstreamTasks.findIndex((task) => {
                return task.name === downstreamTaskName;
            });
        }
        INFO(`Preparing to trigger downstream task '${candidateDownstreamTasks.at(index)!.name}'`)
        this.downstreamTaskExecution_ = await vscode.tasks.executeTask(candidateDownstreamTasks.at(index)!);
        this.deferred_.resolve(this.downstreamTaskExecution_);
        this.closeEmitter_.fire(0);
    }

    close(): void {
        INFO(`Close terminal for task '${this.taskName_}'`);
        for (const cp of this.requirementProcessList_) {
            cp.kill();
        }
        this.requirementProcessList_ = [];
        this.deferred_?.reject();
        this.downstreamTaskExecution_?.terminate();
    }

    private doesMatchFilepatterns(): boolean {
        try {
            const currentFullFilename = vscode.window.activeTextEditor!.document.fileName;
            for (const pattern of this.taskDefinition_.filePatterns) {
                const regexPattern = RegExp(pattern);
                if (regexPattern.test(currentFullFilename)) {
                    return true;
                }
                else {
                    this.writeEmitter_.fire(`Filepath doesn't match pattern '${regexPattern.source}'` + Character.ENDLINE);
                }
            }
        }
        catch (e) {
            this.writeEmitter_.fire((e as Error).message + Character.ENDLINE);
            return false;
        }
        return false;
    }

    private async execRequirement(requirement: Requirement): Promise<boolean> {
        try {
            const process = exec(requirement.command, {
                encoding: "utf-8",
                cwd: requirement.options?.cwd,
                shell: requirement.options?.shell?.executable,
                env: requirement.options?.env
            });
            this.requirementProcessList_.push(process.child);
            const { stdout, stderr } = await process;
            const trim_result = stdout.trim();
            const expectedValuePattern = RegExp(requirement.expectedValue);
            if (!expectedValuePattern.test(trim_result)) {
                this.writeEmitter_.fire(`The result '${trim_result}' is not equal with '${requirement.expectedValue}'` + Character.ENDLINE);
                return false;
            }
            return true;
        }
        catch (e) {
            this.writeEmitter_.fire(`Can not run command: ${requirement.command} because ${(e as Error).message}` + Character.ENDLINE);
            return false;
        }
    }

    private async doesTaskMeetRequirements(): Promise<boolean> {
        if (this.taskDefinition_.require === undefined || this.taskDefinition_.require.length === 0) {
            return true;
        }
        const requirePromises: Promise<boolean>[] = [];
        for (const requirement of this.taskDefinition_.require!) {
            requirePromises.push(this.execRequirement(requirement));
        }
        const finalResult = await Promise.all(requirePromises).catch(reason => {
            this.writeEmitter_.fire(`${reason}` + Character.ENDLINE);
            return [false];
        });
        return finalResult.every(Boolean);
    }

    private async getTasksToTrigger(): Promise<vscode.Task[]> {
        const tasks = await GlobalTaskManager.GetAllTaskExceptAutomatask();
        const result: vscode.Task[] = [];
        for (const task of tasks) {
            if (task.definition.type === AutomataskProvider.AUTOMATASK_TYPE) {
                continue;
            }
            if (this.taskDefinition_.taskToTrigger.indexOf(task.name) === -1) {
                continue;
            }
            result.push(task);
        }
        return result;
    }
}