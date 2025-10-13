export declare class SummaryDto {
    total_repos: number;
    total_users?: number;
}
export declare class TopUserDto {
    login: string;
    count: number;
}
export declare class StatisticsResponseDto {
    summary: SummaryDto;
    languages: Record<string, number>;
    top_users_by_repos?: TopUserDto[];
    timeline_created_monthly: Record<string, number>;
}
