export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    stargazers_count: number;
    watchers_count: number;
    forks_count: number;
    open_issues_count: number;
    default_branch: string;
    private: boolean;
    fork: boolean;
    archived: boolean;
    disabled: boolean;
    owner: {
        id: number;
        login: string;
    };
}
