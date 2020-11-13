/* eslint-disable */
/* This is an autogenerated file. Do not edit this file directly! */
import { TypedDocumentNode } from "@graphql-typed-document-node/core";
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
export type GitHubQueryDocument = TypedDocumentNode<GitHubQuery, GitHubQueryVariables>;
