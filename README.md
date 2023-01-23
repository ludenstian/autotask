# Automatask

## Overview
This extension will automatically run appropriate tasks based on filetype, filename or user's requirements in Visual Studio Code.

## Example
Suppose you have 2 tasks called `Install prod package` and `Install dev package`, which are defined in `tasks.json` file like this:
```
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "Install prod package",
            "command": [
                "npm", "install", "${input:package_name}"
            ],
            "problemMatcher": []
        },
        {
            "type": "shell",
            "label": "Install dev package",
            "command": [
                "npm", "install", "${input:package_name}", "--save-dev"
            ],
            "problemMatcher": []
        }
    ],
    "inputs": [
        {
            "id": "package_name",
            "type": "promptString",
            "description": "Package name to install"
        }
    ]
}
```
### Before using this extension
You have to choose the right task everytime you want to run without recommendation by using `Ctrl + Shift + P -> Tasks: Run Task -> Install prod package/Install dev package`

<img src="./public/Before.gif" width="75%" height="75%"/>

### After using this extension
Now, you can create a task called `automatask` to automatically choose the appropriate task to run based on filetype, filename or user's requirements by pressing `F6` only while opening `.js` file. It will show a selection list if there are more than one task that you can run.
```
{
    "type": "automatask",
    "filetype": ".js",
    "filename": ".*",
    "taskToTrigger": ["Install prod package", "Install dev package"],
    "label": "Install package"
}
```

<img src="./public/After.gif" width="75%" height="75%"/>

## How to use
You need to add a new task called `automatask` alongside with already existed tasks. This `automatask` task is where you define conditions to run the desired ones. This is the example `tasks.json`: 
```
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "Install prod package",
            "command": [
                "npm", "install", "${input:package_name}"
            ],
            "problemMatcher": []
        },
        {
            "type": "shell",
            "label": "Install dev package",
            "command": [
                "npm", "install", "${input:package_name}", "--save-dev"
            ],
            "problemMatcher": []
        },
        {
            "type": "automatask",
            "filetype": ".js",
            "filename": ".*",
            "taskToTrigger": ["Install prod package", "Install dev package"],
            "label": "Install package"
        }
    ],
    "inputs": [
        {
            "id": "package_name",
            "type": "promptString",
            "description": "Package name to install"
        }
    ]
}
```
Now you can trigger specific `Install package` task by `Ctrl + Shift + P -> Tasks: Run Task -> Install package` or press `F6` while opening `.js` file to let this extension do its job, which is a preferred way.

## Contribution
Contributions are always welcome.

## Acknowledgments
Thanks all for endless support for this extension in terms of developing and using it.
