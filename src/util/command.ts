import * as vscode from 'vscode';
import { GlobalCacheMonitor } from './cacheMonitor';
import { executionManager } from './executionManager';
import { GlobalTaskManager } from './taskManager';

export class AutomataskCommand {
    public static AUTOMATASK_COMMAND = "automatask.run";

    public async run() {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor === undefined) {
            vscode.window.showInformationMessage("There is no selected file");
            return;
        }
        const fullFileName = activeTextEditor.document.fileName;
        const automaTasks = await GlobalTaskManager.GetAllAutomatask();
        const taskName: string | undefined = GlobalCacheMonitor.getCacheTaskForFile(fullFileName);
        if (taskName === undefined) { // Not in cache database
            await executionManager.ExecuteAllTasks(fullFileName, automaTasks);
            return;
        }
        let cachedTaskToRun: vscode.Task | undefined = undefined;
        for (const task of automaTasks) {
            if (taskName === task.name) {
                cachedTaskToRun = task;
                break;
            }
        }
        if (cachedTaskToRun === undefined) {
            await executionManager.ExecuteAllTasks(fullFileName, automaTasks);
            return;
        }
        const result = await executionManager.ExecuteAllTasks(fullFileName, [cachedTaskToRun]);
        if (result === false) {
            await executionManager.ExecuteAllTasks(fullFileName, automaTasks);
        }
    }
}