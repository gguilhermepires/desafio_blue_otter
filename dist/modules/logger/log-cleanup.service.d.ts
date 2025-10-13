import { LoggerService } from './logger.service';
export declare class LogCleanupService {
    private readonly logger;
    constructor(logger: LoggerService);
    handleLogCleanup(): Promise<void>;
}
