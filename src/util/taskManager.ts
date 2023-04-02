import * as vscode from 'vscode';
import { AutomataskProvider } from './provider';

class TaskManager {
    private tasks: vscode.Task[] | undefined = undefined;

    // TODO: Need to handle by TaskManager itself instead of manually call
    public async FetchTask() {
        this.tasks = await vscode.tasks.fetchTasks();
    }

    public GetTaskBy(predicate: (task: vscode.Task) => boolean | undefined) : vscode.Task[] {
        const result = this.tasks?.filter(predicate === undefined ? TaskManager.GetAllPredicate : predicate);
        if (result === undefined) {
            return [];
        }
        return result;
    }

    public GetAutomatask() : vscode.Task[] {
        return this.GetTaskBy(TaskManager.GetAutomataskPredicate);
    }

    public GetAllTaskExceptAutomatask() : vscode.Task[] {
        return this.GetTaskBy(TaskManager.GetNotAutomataskPredicate);
    }

    private static GetNotAutomataskPredicate(task: vscode.Task) : boolean {
        return !TaskManager.GetAutomataskPredicate(task);
    }

    private static GetAutomataskPredicate(task: vscode.Task) : boolean {
        return task.definition.type === AutomataskProvider.AUTOMATASK_TYPE;
    }

    private static GetAllPredicate(task: vscode.Task) : boolean {
        return true;
    }
}

export const taskManager = new TaskManager();