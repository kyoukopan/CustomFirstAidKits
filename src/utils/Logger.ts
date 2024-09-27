import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type CfakConfig from "./types/CfakConfig";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";

export enum LoggerLvl 
{
    INFO = 0,
    DEBUG = 1,
    ERROR = 2,
    HEADER = 3
}

const prefix = "Custom First Aid Kits: ";

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
                    this.sptLogger.debug(prefix + data, true);
                }
                break;
            case LoggerLvl.HEADER:
                this.sptLogger.log(prefix + data, LogTextColor.BLACK, LogBackgroundColor.YELLOW);
                break;
            case LoggerLvl.ERROR:
                this.sptLogger.error(prefix + data);
        }
    }
}