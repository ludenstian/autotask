import * as vscode from 'vscode';
import {EventEmitter} from 'node:events';

export enum Status {
    SUCCESS="success",
    FAIL="fail"
};

export type TaskStatusEmitter = vscode.EventEmitter<Status>;

class ExecutionManager {
    private _isRunning: boolean;
    private _taskStatusEmitter: EventEmitter;
    private _runningExecutionList: Thenable<vscode.TaskExecution>[];
    private _hasResolved: boolean;
    private _rejectTask: number;

    constructor() {
        this._isRunning = false;
        this._taskStatusEmitter = new EventEmitter();
        this._runningExecutionList = [];
        this._hasResolved = false;
        this._rejectTask = 0;
    }

    public async ExecuteTask(task: vscode.Task) : Promise<Thenable<vscode.TaskExecution>> {
        return new Promise<Thenable<vscode.TaskExecution>>((resolve, reject) => {
            const taskExecution = vscode.tasks.executeTask(task);
            this._runningExecutionList.push(taskExecution);
            this._taskStatusEmitter.on(Status.SUCCESS, async () => {
                if (this._hasResolved) {
                    reject("Have resolved task");
                    return;
                }
                this._hasResolved = true;
                resolve(taskExecution);
                const executionList = await Promise.all(this._runningExecutionList);
                for (const execution of executionList) {
                    execution.terminate();
                }
                this._isRunning = false;
            });
            this._taskStatusEmitter.on(Status.FAIL, () => {
                reject("Failed task");
                this._rejectTask += 1;
                if (this._rejectTask === this._runningExecutionList.length) {
                    this._isRunning = false;
                }
            });
        });
    }

    public async ExecuteAllTasks(tasks: vscode.Task[]) {
        if (this._isRunning) {
            vscode.window.showInformationMessage("There is another session running. Please wait until it finishes!");
            return;
        }
        this._rejectTask = 0;
        this._hasResolved = false;
        this._runningExecutionList = [];
        this._isRunning = true;
        const taskExecutionList: Promise<Thenable<vscode.TaskExecution>>[] = [];
        for (const task of tasks) {
            taskExecutionList.push(this.ExecuteTask(task));
        }
        await Promise.any(taskExecutionList);
    }

    public GetEmitterFromManager() : EventEmitter {
        return this._taskStatusEmitter;
    }
}

export const executionManager = new ExecutionManager();