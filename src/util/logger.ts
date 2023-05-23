import * as vscode from "vscode";

enum LogLevel {
    INFO,
    WARN,
    ERR
}

class Logger {
    private _implLogger : vscode.OutputChannel;

    constructor() {
        this._implLogger = vscode.window.createOutputChannel("Automatask");
    }

    private composeMessage(level: LogLevel, message: string) {
        let template : string = "";
        switch (level) {
            case LogLevel.INFO:
                template = "[info]: ";
                break;
            case LogLevel.WARN:
                template = "[warning]: ";
                break;
            case LogLevel.ERR:
                template = "[error]: ";
                break;
            default:
                break;
        }
        return Date().toString() + " " + template + message;
    }

    public write(level: LogLevel, message: string) {
        this._implLogger.appendLine(this.composeMessage(level, message));
    }

    public dispose() {
        this._implLogger.dispose();
    }
}

const logger = new Logger();

export function INFO(message: string) {
    logger.write(LogLevel.INFO, message);
}

export function WARN(message: string) {
    logger.write(LogLevel.WARN, message);
}

export function ERR(message: string) {
    logger.write(LogLevel.ERR, message);
}

export function disposeLogger() {
    logger.dispose();
}