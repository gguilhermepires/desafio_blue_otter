declare enum Environment {
    Development = "development",
    Production = "production",
    Test = "test"
}
declare enum LogLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error"
}
declare class EnvironmentVariables {
    DATABASE_URL: string;
    DB_PASSWORD: string;
    NODE_ENV: Environment;
    PORT: number;
    CORS_ORIGINS: string;
    LOG_LEVEL: LogLevel;
    LOG_RETENTION_DAYS: number;
    GITHUB_TOKEN: string;
    THROTTLE_TTL: number;
    THROTTLE_LIMIT: number;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
export {};
