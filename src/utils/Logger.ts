import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { APP_NAME_FRIENDLY } from "./types/AppTypes";
import type CfakConfig from "./types/CfakConfig";

export enum LoggerLvl 
{
    INFO = 0,
    DEBUG = 1,
    ERROR = 2,
    HEADER = 3,
    DEBUG_HEADER = 4
}

const prefix = `${APP_NAME_FRIENDLY}: `;

export default class Logger 
{
    private static isDebug: boolean;
    private sptLogger: ILogger;

    constructor(config: CfakConfig, sptLogger: ILogger) 
    {
        Logger.isDebug = config.debug;
        this.sptLogger = sptLogger;
    }

    public log(data: Parameters<ILogger["log"]>[0], level: LoggerLvl = LoggerLvl.INFO): void 
    {
        switch (level) 
        {
            case LoggerLvl.INFO:
                this.sptLogger.log(prefix + data, LogTextColor.YELLOW);
                break;
            case LoggerLvl.DEBUG:
                if (Logger.isDebug) 
                {
                    this.sptLogger.debug(prefix + data);
                }
                break;
            case LoggerLvl.HEADER:
                this.sptLogger.log(prefix + data, LogTextColor.BLACK, LogBackgroundColor.YELLOW);
                break;
            case LoggerLvl.ERROR:
                this.sptLogger.error(prefix + data);
                break;
            case LoggerLvl.DEBUG_HEADER:
                this.sptLogger.debug(`\n${prefix}================================ ${data} ================================\n`);
        }
    }

    public debug(data: Parameters<ILogger["log"]>[0], header = false): void
    {
        this.log(data, header ? LoggerLvl.DEBUG_HEADER : LoggerLvl.DEBUG);
    }

    public error(data: Parameters<ILogger["log"]>[0]): void
    {
        this.log(data, LoggerLvl.ERROR);
    }
}