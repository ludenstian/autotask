# automatask

This extension aims to automatically trigger suitable task when some conditions are met.

Usage example:
```
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "Run me",
            "command": ["whoami"]
        },
        {
            "type": "automatask",
            "filetype": ".txt",
            "validate": "echo cyberpunk",
            "expected": "cyberpunk",
            "trigger": "Run me",
            "label": "Condition"
        }
    ]
}
```
Press `Ctrl + Shift + P` and then run command `Automatically run tasks`. It will check the `filetype` then execute command `validate` and check result with `expected`. If all conditions are met, the task which has label `Run me` will be triggered.

## Release Notes

### 0.0.1
This is alpha version

**Enjoy!**
