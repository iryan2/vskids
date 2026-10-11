/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { initRepository } from './git';
import { getTemplate, SHARED_README } from './templates';

const RECENT_KEY = 'vskids.recentProjects';
const MARKER_DIR = '.vskids';
const MARKER_FILE = 'config.json';

export interface ProjectMarker {
	name: string;
	template: string;
}

export function getProjectsFolder(): string {
	const configured = vscode.workspace.getConfiguration('vskids').get<string>('projectsFolder');
	if (configured && configured.trim().length > 0) {
		return configured;
	}
	return path.join(os.homedir(), 'vskids');
}

function sanitizeName(name: string): string {
	const trimmed = name.trim();
	const safe = trimmed.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
	return safe.length > 0 ? safe : 'My App';
}

function folderNameFor(name: string): string {
	return sanitizeName(name).replace(/\s+/g, '-').toLowerCase();
}

export async function readMarker(folder: vscode.Uri): Promise<ProjectMarker | undefined> {
	try {
		const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder, MARKER_DIR, MARKER_FILE));
		return JSON.parse(Buffer.from(bytes).toString('utf8')) as ProjectMarker;
	} catch {
		return undefined;
	}
}

export async function writeMarker(folder: vscode.Uri, marker: ProjectMarker): Promise<void> {
	await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder, MARKER_DIR));
	await vscode.workspace.fs.writeFile(
		vscode.Uri.joinPath(folder, MARKER_DIR, MARKER_FILE),
		Buffer.from(JSON.stringify(marker, null, 2), 'utf8'),
	);
}

function folderDisplayName(folder: vscode.Uri): string {
	return folder.path.split('/').filter(Boolean).pop() ?? 'My App';
}

export interface RecentProjectEntry {
	readonly folder: vscode.Uri;
	readonly name: string;
	readonly template: string;
	readonly emoji: string;
}

export async function loadRecent(context: vscode.ExtensionContext): Promise<RecentProjectEntry[]> {
	const raw = context.globalState.get<string[]>(RECENT_KEY, []);
	const entries: RecentProjectEntry[] = [];
	for (const entry of raw) {
		const folder = vscode.Uri.file(entry);
		try {
			await vscode.workspace.fs.stat(folder);
		} catch {
			continue; // Drop folders that no longer exist.
		}
		const marker = await readMarker(folder);
		const template = getTemplate(marker?.template ?? 'hello');
		entries.push({
			folder,
			name: marker?.name ?? folderDisplayName(folder),
			template: template.id,
			emoji: template.emoji,
		});
	}
	return entries;
}

export async function addRecent(context: vscode.ExtensionContext, folder: vscode.Uri): Promise<void> {
	const raw = context.globalState.get<string[]>(RECENT_KEY, []);
	const next = [folder.fsPath, ...raw.filter(entry => entry !== folder.fsPath)].slice(0, 12);
	await context.globalState.update(RECENT_KEY, next);
}

async function removeRecent(context: vscode.ExtensionContext, folder: vscode.Uri): Promise<void> {
	const raw = context.globalState.get<string[]>(RECENT_KEY, []);
	await context.globalState.update(RECENT_KEY, raw.filter(entry => entry !== folder.fsPath));
}

export interface CreateProjectResult {
	readonly folder: vscode.Uri;
}

export async function createProject(name: string, templateId: string): Promise<CreateProjectResult> {
	const template = getTemplate(templateId);
	const projectsFolder = vscode.Uri.file(getProjectsFolder());
	await vscode.workspace.fs.createDirectory(projectsFolder);

	const folder = vscode.Uri.joinPath(projectsFolder, folderNameFor(name));
	await vscode.workspace.fs.createDirectory(folder);

	for (const [fileName, contents] of Object.entries({ ...template.files, 'README.md': SHARED_README })) {
		await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, fileName), Buffer.from(contents, 'utf8'));
	}

	await writeMarker(folder, { name: sanitizeName(name), template: template.id });
	await initRepository(folder);
	return { folder };
}

export async function renameProject(folder: vscode.Uri, newName: string): Promise<void> {
	const marker = await readMarker(folder);
	const safeName = sanitizeName(newName);
	await writeMarker(folder, { name: safeName, template: marker?.template ?? 'hello' });
}

export async function deleteProject(context: vscode.ExtensionContext, folder: vscode.Uri): Promise<void> {
	await vscode.workspace.fs.delete(folder, { recursive: true, useTrash: true });
	await removeRecent(context, folder);
}
