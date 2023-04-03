import { executionManager } from './executionManager';
import { taskManager } from './taskManager';

export class AutomataskCommand {
    public static AUTOMATASK_COMMAND = "automatask.run";

    public async run() {
        await taskManager.FetchTask();
        const tasks = taskManager.GetAutomatask();
        executionManager.ExecuteAllTasks(tasks);
    }
}