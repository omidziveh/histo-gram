type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export class Logger {
    private context: string;
    constructor(context: string) {
        this.context = context;
    }

    private log(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] [${this.context}]: ${message}`;

        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    public info(message: string, data?: any) {
        this.log('INFO', message, data);
    }

    public warn(message: string, data?: any) {
        this.log('WARN', message, data);
    }

    public error(message: string, data?: any) {
        this.log('ERROR', message, data);
    }
}


export function isError(err: unknown): err is Error {
    return err instanceof Error;
}