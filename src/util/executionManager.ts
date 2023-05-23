import * as vscode from 'vscode';
import { GlobalCacheMonitor } from './cacheMonitor';
import { Deferred } from 'ts-deferred';
import { ERR, INFO, WARN } from './logger';

class ExecutionManager {
    private isRunning_: boolean;
    private taskDeferredPromiseMap_: Map<string, Deferred<vscode.TaskExecution>>;
    private runningTaskExecution_: vscode.TaskExecution | undefined;
    private downstreamTaskExecution_: vscode.TaskExecution | undefined;

    constructor() {
        this.isRunning_ = false;
        this.taskDeferredPromiseMap_ = new Map<string, Deferred<vscode.TaskExecution>>();
        this.runningTaskExecution_ = undefined;
    }

    public async ExecuteTask(task: vscode.Task): Promise<vscode.TaskExecution> {
        const deferredPromise = new Deferred<vscode.TaskExecution>();
        this.taskDeferredPromiseMap_.set(task.name, deferredPromise);
        const taskExecution = vscode.tasks.executeTask(task);
        return deferredPromise.promise.then(async (value: vscode.TaskExecution) => {
            this.runningTaskExecution_ = await taskExecution;
            return value;
        }, undefined);
    }

    public async ExecuteAllTasks(fullFileName: string, tasks: vscode.Task[]): Promise<boolean> {
        if (this.isRunning_) {
            WARN("There is another session running!");
            vscode.window.showInformationMessage("There is another session running. Please wait until it finishes!");
            return false;
        }
        this.initNewSession();
        const taskExecutionList: Promise<vscode.TaskExecution>[] = [];
        for (const task of tasks) {
            taskExecutionList.push(this.ExecuteTask(task));
        }
        try {
            INFO("Wait for tasks to finish");
            this.downstreamTaskExecution_ = await Promise.any(taskExecutionList);
            GlobalCacheMonitor.updateTaskForFile(fullFileName, this.runningTaskExecution_!.task);
            INFO("Have triggered downstream task");
        } catch (error) {
            ERR((error as Error).message);
            this.isRunning_ = false;
            return false;
        }
        this.isRunning_ = false;
        return true;
    }

    public GetDeferredPromiseByTaskName(taskName: string): Deferred<vscode.TaskExecution> {
        const deferred = this.taskDeferredPromiseMap_.get(taskName);
        if (deferred === undefined) {
            ERR(`Can not find Deferred<vscode.TaskExecution> object for ${taskName}`);
            throw new Error("Fatal error! Can not get Deferred object");
        }
        return deferred;
    }

    private initNewSession() {
        INFO("Init new session");
        this.taskDeferredPromiseMap_.clear();
        this.isRunning_ = true;
    }
}

export const executionManager = new ExecutionManager();