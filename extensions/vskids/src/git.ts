/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

const KID_AUTHOR_NAME = 'Vibekids';
const KID_AUTHOR_EMAIL = 'hello@vibekids.app';

interface GitChange {
	readonly uri: vscode.Uri;
}

interface GitRepositoryState {
	readonly workingTreeChanges: GitChange[];
	readonly indexChanges: GitChange[];
	readonly untrackedChanges: GitChange[];
}

interface GitRepository {
	readonly rootUri: vscode.Uri;
	readonly state: GitRepositoryState;
	add(paths: string[]): Promise<void>;
	commit(message: string, options?: unknown): Promise<void>;
}

interface GitAPI {
	readonly repositories: GitRepository[];
	getRepository(uri: vscode.Uri): GitRepository | null;
	openRepository(uri: vscode.Uri): Promise<GitRepository | null>;
	init(root: vscode.Uri, options?: { defaultBranch?: string }): Promise<GitRepository | null>;
}

function getGitAPI(): GitAPI | undefined {
	const extension = vscode.extensions.getExtension<{ getAPI(version: 1): GitAPI }>('vscode.git');
	if (!extension) {
		return undefined;
	}
	try {
		return extension.exports?.getAPI(1);
	} catch {
		return undefined;
	}
}

export async function ensureRepository(root: vscode.Uri): Promise<GitRepository | undefined> {
	const api = getGitAPI();
	if (!api) {
		return undefined;
	}
	const existing = api.getRepository(root);
	if (existing) {
		return existing;
	}
	try {
		return (await api.openRepository(root)) ?? (await api.init(root, { defaultBranch: 'main' })) ?? undefined;
	} catch {
		return undefined;
	}
}

/**
 * Gives the project a friendly local git identity so a Save (commit) never fails
 * on a machine that has no global `user.name` / `user.email` configured, and
 * disables commit signing which a kid's machine won't have set up.
 */
export async function configureRepositoryIdentity(root: vscode.Uri): Promise<void> {
	const set = (key: string, value: string) =>
		execFileAsync('git', ['-C', root.fsPath, 'config', '--local', key, value]);
	try {
		await set('user.name', KID_AUTHOR_NAME);
		await set('user.email', KID_AUTHOR_EMAIL);
		await set('commit.gpgsign', 'false');
	} catch {
		// Best effort: if git isn't available the commit path will report it.
	}
}

/**
 * Initialises a brand-new repository for a project and gives it a kid-friendly
 * identity. Used when creating a project.
 */
export async function initRepository(root: vscode.Uri): Promise<GitRepository | undefined> {
	const repo = await ensureRepository(root);
	if (repo) {
		await configureRepositoryIdentity(root);
	}
	return repo;
}

export interface SaveResult {
	readonly message: string;
}

/**
 * Stages every pending change and commits them with a friendly message. This is
 * the implementation behind the single "Save" button; it hides git entirely.
 */
export async function saveProject(root: vscode.Uri, message: string): Promise<SaveResult> {
	const repo = await ensureRepository(root);
	if (!repo) {
		return { message: 'Could not find the save system.' };
	}

	const changed = repo.state.workingTreeChanges
		.concat(repo.state.untrackedChanges)
		.concat(repo.state.indexChanges)
		.map(change => change.uri.fsPath);

	if (changed.length === 0) {
		return { message: 'Everything is already saved.' };
	}

	if (changed.length > 0) {
		await repo.add(changed);
	}
	await configureRepositoryIdentity(root);
	await repo.commit(message);
	return { message: 'Saved!' };
}
