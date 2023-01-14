# Automatask

## Overview
This extension will automatically run appropriate tasks based on filetype, filename or user's requirements in Visual Studio Code.

## Before using this extension
You have to choose the right task everytime you want to run it without recommendation.

<img src="./public/Before.gif" width="75%" height="75%"/>

## After using this extension
Now, you can create a task called `automatask` to automatically choose the appropriate task to run by pressing `F6`. It will show a selection list if there are multi tasks which you can run. The ultimate goal of this extenstion is **"Saving your time"**

<img src="./public/After.gif" width="75%" height="75%"/>

## How to use
You need to add a task called `automatask` alongside with already existed tasks. This `automatask` task config is where you define conditions to run the desired ones. Below is the example `tasks.json`: 
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
            "filename": ".*",
            "taskToTrigger": ["Validate script"],
            "label": "First example"
        }
    ]
}
```
Now you can trigger specific `First example` task by `Ctrl + Shift + P` or press `F6` to let this extension do its job, which is a preferred way.

## Contribution
Contributions are always welcome.

## Acknowledgments
Thanks all for endless support for this extension in terms of developing and using it.
