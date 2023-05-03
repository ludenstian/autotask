import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import { AutomataskDefinition, AutomataskProvider } from './provider';
import { GlobalTaskManager } from './taskManager';

interface CacheRecord {
    taskName: string,
    lastAccess: Date,
    taskDiscription: AutomataskDefinition
};

class CacheMonitor {
    private extensionContext_: vscode.ExtensionContext | undefined = undefined;
    private database_: Map<string, CacheRecord>;
    private db_file_: vscode.Uri | undefined;

    constructor() {
        this.database_ = new Map<string, CacheRecord>();
        this.db_file_ = undefined;
    }

    public async initialize(context: vscode.ExtensionContext) {
        this.setExtentionContext(context);
        await this.initDatabase();
    }

    public getCacheTaskForFile(fullFileName: string): string | undefined {
        return this.database_.get(fullFileName)?.taskName;
    }

    public updateTaskForFile(file: string, task: vscode.Task) {
        this.database_.set(file, { taskName: task.name, lastAccess: new Date(), taskDiscription: <any>task.definition });
    }

    public async dispose() {
        if (this.db_file_ === undefined) {
            return;
        }
        try {
            await fs.writeFile(this.db_file_.fsPath, JSON.stringify(Object.fromEntries(this.database_)));
        } catch (error) {
            console.log((error as Error).message);
        }
        console.log("Done");
    }

    private async initDatabase() {
        if (this.extensionContext_ === undefined) {
            return;
        }
        if (this.extensionContext_.storageUri === undefined) {
            return;
        }
        try {
            await vscode.workspace.fs.createDirectory(this.extensionContext_.storageUri);
        }
        catch (error) {
            console.log((error as Error).message);
        }
        this.db_file_ = vscode.Uri.joinPath(this.extensionContext_.storageUri, "cache.json");
        console.log(this.db_file_.path);
        await vscode.workspace.fs.stat(this.db_file_).then(() => { }, async (reason: vscode.FileSystemError) => {
            // Create file
            console.log(reason.message);
            await vscode.workspace.fs.writeFile(this.db_file_!, new Uint8Array([parseInt("{"), parseInt("}")]));
        });
        const binaryDatabase = await vscode.workspace.fs.readFile(this.db_file_).then((value: Uint8Array) => { return value; }, (reason: vscode.FileSystemError) => {
            console.log(reason.message);
            return undefined;
        });
        if (binaryDatabase === undefined) {
            return;
        }
        let jsonDatabase: Object = new Object();
        try {
            jsonDatabase = JSON.parse(binaryDatabase.toString());
        } catch (error) {
            console.log((error as Error).message);
        }
        for (const [key, value] of Object.entries<CacheRecord>(<any>jsonDatabase)) {
            const Month = 2592000000; // 30 days in milliseconds
            const dateInDb = new Date(value.lastAccess);
            if (Date.now() - dateInDb.getTime() >= Month) { // Reduce database size through time
                continue;
            }
            this.database_.set(key, value);
        }
        this.integrityCheck();
    }

    private async integrityCheck() {
        const tasks = await GlobalTaskManager.GetAllAutomatask();
        for (const task of tasks) {
            if (task.definition.type !== AutomataskProvider.AUTOMATASK_TYPE) {
                continue;
            }
            const taskName = task.name;
            const taskDescriptionInDatabase = this.database_.get(taskName)?.taskDiscription;
            if (taskDescriptionInDatabase === undefined) {
                continue;
            }
            const taskDescriptionInJsonTask: AutomataskDefinition = <any>task.definition;
            if (taskDescriptionInDatabase === taskDescriptionInJsonTask) {
                continue;
            }
            this.database_.delete(taskName);
        }
    }

    private setExtentionContext(context: vscode.ExtensionContext) {
        this.extensionContext_ = context;
    }
};

export const GlobalCacheMonitor = new CacheMonitor();