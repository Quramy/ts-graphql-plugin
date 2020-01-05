export type RepositoryFragment = {
    description: string | null;
};
export type GitHubQuery = {
    viewer: {
        repositories: {
            nodes: (({
                id: string;
            } & RepositoryFragment) | null)[] | null;
        };
    };
};
export type GitHubQueryVariables = {
    first: number;
};
