import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import { AutomataskDefinition, AutomataskProvider } from './provider';
import { GlobalTaskManager } from './taskManager';
import { ERR, INFO } from './logger';

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
        INFO("Init cache monitor");
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
        await this.syncDb();
    }

    private async syncDb() {
        try {
            if (this.db_file_ === undefined) {
                return;
            }
            INFO("Write to database file");
            await fs.writeFile(this.db_file_.fsPath, JSON.stringify(Object.fromEntries(this.database_)));
        } catch (error) {
            ERR((error as Error).message);
        }
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
            ERR((error as Error).message);
            return;
        }
        this.db_file_ = vscode.Uri.joinPath(this.extensionContext_.storageUri, "cache.json");
        INFO(`Database file ${this.db_file_.path}`);
        try {
            const jsonObject = JSON.parse((await fs.readFile(this.db_file_.fsPath)).toString());
            for (const [key, value] of Object.entries<CacheRecord>(<any>jsonObject)) {
                const Month = 2592000000; // 30 days in milliseconds
                const dateInDb = new Date(value.lastAccess);
                if (Date.now() - dateInDb.getTime() >= Month) { // Reduce database size through time
                    INFO(`Remove outdated ${key} entry out of db`);
                    continue;
                }
                this.database_.set(key, value);
            }
            await this.integrityCheck();
        } catch (error) {
            ERR((error as Error).message);
        }
    }

    private async integrityCheck() {
        const tasks = await GlobalTaskManager.GetAllAutomatask();
        for (const task of tasks) {
            const taskDescriptionInDatabase = this.database_.get(task.name)?.taskDiscription;
            if (taskDescriptionInDatabase === undefined) {
                continue;
            }
            const taskDescriptionInJsonTask: AutomataskDefinition = <any>task.definition;
            if (taskDescriptionInDatabase === taskDescriptionInJsonTask) {
                continue;
            }
            INFO(`Remove noexisted task '${task.name}' out of db`);
            this.database_.delete(task.name);
        }
    }

    private setExtentionContext(context: vscode.ExtensionContext) {
        this.extensionContext_ = context;
    }
};

export const GlobalCacheMonitor = new CacheMonitor();