/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { KidModeController } from './kidMode';
import {
	addRecent,
	createProject,
	deleteProject,
	getProjectsFolder,
	loadRecent,
	readMarker,
	renameProject,
} from './projects';
import { TEMPLATES } from './templates';
import { WelcomePanel } from './welcome';

let controller: KidModeController | undefined;
let output: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
	output = vscode.window.createOutputChannel('Vibekids');
	controller = new KidModeController(context, output);
	context.subscriptions.push(output);

	context.subscriptions.push(
		vscode.commands.registerCommand('vskids.welcome', () => showWelcome(context)),
		vscode.commands.registerCommand('vskids.newProject', () => showWelcome(context)),
		vscode.commands.registerCommand('vskids.loadProject', () => pickFolderThenOpen()),
		vscode.commands.registerCommand('vskids.save', () => controller?.save()),
		vscode.commands.registerCommand('vskids.start', () => startCurrentWorkspace()),
	);

	applyFirstRunSettings(context);

	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		void startCurrentWorkspace();
	} else {
		void showWelcome(context);
	}
}

/**
 * A handful of settings (telemetry, updates, experiments, window size) are
 * application-scoped and cannot be supplied through `configurationDefaults`.
 * We set them once in the user's global settings on first run instead.
 */
function applyFirstRunSettings(context: vscode.ExtensionContext): void {
	if (context.globalState.get<boolean>('vskids.settingsApplied')) {
		return;
	}
	void (async () => {
		const config = vscode.workspace.getConfiguration();
		const settings: [string, unknown][] = [
			['telemetry.telemetryLevel', 'off'],
			['update.mode', 'none'],
			['update.showReleaseNotes', false],
			['extensions.autoUpdate', false],
			['extensions.autoCheckUpdates', false],
			['security.workspace.trust.enabled', false],
			['workbench.enableExperiments', false],
			['window.newWindowDimensions', 'maximized'],
		];
		for (const [key, value] of settings) {
			try {
				await config.update(key, value, vscode.ConfigurationTarget.Global);
			} catch (err) {
				output?.appendLine(`[vskids] could not set "${key}": ${String(err)}`);
			}
		}
		await context.globalState.update('vskids.settingsApplied', true);
	})();
}

export function deactivate(): void {
	controller?.dispose();
	controller = undefined;
}

async function startCurrentWorkspace(): Promise<void> {
	if (!controller) {
		return;
	}
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		return;
	}
	const root = folders[0].uri;
	const marker = await readMarker(root);
	const name = marker?.name ?? root.path.split('/').filter(Boolean).pop() ?? 'My App';
	try {
		await controller.enter(root, name);
	} catch (err) {
		output?.appendLine(`[vskids] could not start: ${String(err)}`);
	}
}

async function showWelcome(context: vscode.ExtensionContext): Promise<void> {
	const recents = await loadRecent(context);
	WelcomePanel.show(recents, TEMPLATES, {
		onNew: (name, template) => void createThenOpen(context, name, template),
		onLoad: () => void pickFolderThenOpen(),
		onOpen: path => void openFolder(vscode.Uri.file(path)),
		onRename: path => void renameThenRefresh(context, path),
		onDelete: path => void deleteThenRefresh(context, path),
	});
}

async function createThenOpen(context: vscode.ExtensionContext, name: string, template: string): Promise<void> {
	try {
		const result = await createProject(name, template);
		await addRecent(context, result.folder);
		await openFolder(result.folder);
	} catch (err) {
		output?.appendLine(`[vskids] create failed: ${String(err)}`);
		vscode.window.showErrorMessage('Could not create the app. Please try again.');
	}
}

async function renameThenRefresh(context: vscode.ExtensionContext, path: string): Promise<void> {
	const folder = vscode.Uri.file(path);
	const marker = await readMarker(folder);
	const current = marker?.name ?? path.split('/').filter(Boolean).pop() ?? '';
	const name = await vscode.window.showInputBox({
		title: 'Rename app',
		value: current,
		placeHolder: 'My Amazing App',
		validateInput: value => value.trim().length === 0 ? 'Please type a name' : undefined,
	});
	if (name !== undefined) {
		await renameProject(folder, name);
		await showWelcome(context);
	}
}

async function deleteThenRefresh(context: vscode.ExtensionContext, path: string): Promise<void> {
	const folder = vscode.Uri.file(path);
	const marker = await readMarker(folder);
	const name = marker?.name ?? path.split('/').filter(Boolean).pop() ?? 'this app';
	const confirm = await vscode.window.showWarningMessage(
		`Delete "${name}"? This cannot be undone.`,
		{ modal: true },
		'Delete',
	);
	if (confirm === 'Delete') {
		try {
			await deleteProject(context, folder);
		} catch (err) {
			output?.appendLine(`[vskids] delete failed: ${String(err)}`);
		}
		await showWelcome(context);
	}
}

async function pickFolderThenOpen(): Promise<void> {
	const selection = await vscode.window.showOpenDialog({
		canSelectFolders: true,
		canSelectFiles: false,
		canSelectMany: false,
		defaultUri: vscode.Uri.file(getProjectsFolder()),
		openLabel: 'Open App',
	});
	if (selection && selection.length > 0) {
		await openFolder(selection[0]);
	}
}

async function openFolder(folder: vscode.Uri): Promise<void> {
	await vscode.commands.executeCommand('vscode.openFolder', folder, { forceNewWindow: false });
}
