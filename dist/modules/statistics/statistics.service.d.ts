import { Counter, Histogram } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsDto } from './dto/statistics.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
export declare class StatisticsService {
    private readonly prisma;
    private readonly statsCounter;
    private readonly statsDuration;
    private readonly logger;
    constructor(prisma: PrismaService, statsCounter: Counter<string>, statsDuration: Histogram<string>);
    generateStatistics(statsDto: StatisticsDto): Promise<StatisticsResponseDto>;
    private getLanguageStatistics;
    private getTopUsers;
    private getTimelineStatistics;
    private formatYearMonth;
    private fillMissingMonths;
}
