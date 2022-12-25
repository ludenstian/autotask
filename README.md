<img align="left" width="70" height="70" src="./public/icon.jpg">

# automatask

This extension aims to automatically trigger suitable task when some conditions are met.

*Problem*: You have to choose the right task before executing it with the current file.
![Before](./public/Before.gif)

*Solution*: With this extension, you can create a task call `automatask` to automatically choose the right task to run for specific file.
![After](./public/After.gif)

*Usage example*:
```
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "Validate script",
            "command": [
                "python ${workspaceFolder}/test_case.py"
            ],
            "problemMatcher": []
        },
        {
            "type": "automatask",
            "filetype": ".txt",
            "filename": "*",
            "taskToTrigger": "Validate script",
            "label": "First example"
        }
    ]
}
```
Press `F6` and this extension will find the suitable task to run.

**Enjoy!**
