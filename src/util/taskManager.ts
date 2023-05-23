import * as vscode from 'vscode';
import { AutomataskProvider } from './provider';
import { Deferred } from 'ts-deferred';
import { INFO } from './logger';

class TaskManager {
    private watcherList_: vscode.FileSystemWatcher[];
    private promiseTasks_: Promise<vscode.Task[]> | undefined;

    constructor() {
        this.watcherList_ = [];
        this.promiseTasks_ = undefined;
        this.initWatcher();
    }

    public async initialize() {
        INFO("Init task manager");
        const deferred = new Deferred<vscode.Task[]>();
        this.promiseTasks_ = deferred.promise;
        deferred.resolve(await vscode.tasks.fetchTasks());
    }

    public async GetTaskBy(predicate: (task: vscode.Task) => boolean | undefined): Promise<vscode.Task[]> {
        const tasks = await this.promiseTasks_;
        const result = tasks?.filter(predicate === undefined ? TaskManager.GetAllPredicate : predicate);
        if (result === undefined) {
            return [];
        }
        return result;
    }

    public async GetAllAutomatask(): Promise<vscode.Task[]> {
        return await this.GetTaskBy(TaskManager.GetAutomataskPredicate);
    }

    public async GetAllTaskExceptAutomatask(): Promise<vscode.Task[]> {
        return await this.GetTaskBy(TaskManager.GetNotAutomataskPredicate);
    }

    public dispose() {
        for (const wc of this.watcherList_) {
            wc.dispose();
        }
    }

    private static GetNotAutomataskPredicate(task: vscode.Task): boolean {
        return !TaskManager.GetAutomataskPredicate(task);
    }

    private static GetAutomataskPredicate(task: vscode.Task): boolean {
        return task.definition.type === AutomataskProvider.AUTOMATASK_TYPE;
    }

    private static GetAllPredicate(task: vscode.Task): boolean {
        return true;
    }

    private async onFileEvent(event: vscode.Uri) {
        INFO(`Handle event on ${event.fsPath}`);
        const deferred = new Deferred<vscode.Task[]>();
        this.promiseTasks_ = deferred.promise;
        deferred.resolve(await vscode.tasks.fetchTasks());
    }

    private initWatcher() {
        const wss = vscode.workspace.workspaceFolders;
        if (wss === undefined) {
            return;
        }
        for (const ws of wss) {
            const path = vscode.Uri.joinPath(ws.uri, ".vscode/tasks.json").fsPath;
            INFO(`Init watcher for ${path}`);
            const watcher = vscode.workspace.createFileSystemWatcher(path);
            watcher.onDidCreate(this.onFileEvent, this);
            watcher.onDidChange(this.onFileEvent, this);
            watcher.onDidDelete(this.onFileEvent, this);
            this.watcherList_.push(watcher);
        }
    }
}

export const GlobalTaskManager = new TaskManager();