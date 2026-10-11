/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DevServer } from './devServer';
import { HeaderPanel } from './header';
import { saveProject } from './git';
import { OPENCODE_MISSING_MESSAGE, resolveOpencodeCommand } from './opencode';
import { addRecent } from './projects';

const KID_MODE_CONTEXT = 'vskids.kidMode';

/**
 * Owns everything that happens once a project is open: starts the live-reload
 * server, arranges the window into "app on the left, helper on the right", and
 * wires up the Save button.
 */
export class KidModeController {

	private readonly devServer = new DevServer();
	private header: HeaderPanel | undefined;
	private terminal: vscode.Terminal | undefined;
	private projectRoot: vscode.Uri | undefined;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly output: vscode.OutputChannel,
	) {
		this.context.subscriptions.push(this.devServer);
	}

	async enter(root: vscode.Uri, name: string): Promise<void> {
		this.projectRoot = root;
		await addRecent(this.context, root);
		await vscode.commands.executeCommand('setContext', KID_MODE_CONTEXT, true);

		const url = await this.devServer.start(root.fsPath);
		this.output.appendLine(`[vskids] serving ${root.fsPath} at ${url}`);

		await this.buildLayout(url, name, root);
	}

	async save(): Promise<void> {
		if (!this.projectRoot) {
			return;
		}
		const prefix = vscode.workspace.getConfiguration('vskids').get<string>('saveCommitMessage') ?? 'Save';
		const message = `${prefix}: ${new Date().toLocaleString()}`;
		try {
			const result = await saveProject(this.projectRoot, message);
			vscode.window.showInformationMessage(result.message);
		} catch (err) {
			this.output.appendLine(`[vskids] save failed: ${String(err)}`);
			vscode.window.showErrorMessage('Oops! Could not save right now.');
		}
	}

	dispose(): void {
		this.devServer.stop();
		this.header?.dispose();
		this.header = undefined;
		this.terminal?.dispose();
		this.terminal = undefined;
	}

	/**
	 * Arranges the editor grid using only relative focus commands and the active
	 * group, so we never depend on absolute group indices:
	 *
	 *   +---------------------+        +---------------------+
	 *   |   header (Save)     |        |                     |
	 *   +---------------------+        |   opencode helper   |
	 *   |  live app preview   |        |                     |
	 *   +---------------------+        +---------------------+
	 */
	private async buildLayout(url: string, name: string, root: vscode.Uri): Promise<void> {
		const config = vscode.workspace.getConfiguration('vskids');
		const terminalTitle = config.get<string>('terminalTitle') ?? 'Helper';

		await this.tryCommand('workbench.action.closeAllEditors');
		await this.tryCommand('workbench.action.joinAllGroups');
		await delay(100);

		// Create a full-height column on the right, then split the left column in two.
		await this.tryCommand('workbench.action.splitEditorRight');
		await delay(80);
		await this.tryCommand('workbench.action.focusLeftGroup');
		await this.tryCommand('workbench.action.splitEditorDown');
		await delay(80);

		// Top-left: the header with the Save button.
		await this.tryCommand('workbench.action.focusAboveGroup');
		this.header = HeaderPanel.create(name, () => this.save());
		await delay(80);

		// Bottom-left: the live app preview.
		await this.tryCommand('workbench.action.focusBelowGroup');
		await this.tryCommand('workbench.action.browser.open', { url });
		await delay(80);

		// Right: the opencode helper terminal.
		await this.tryCommand('workbench.action.focusRightGroup');
		this.terminal = vscode.window.createTerminal({
			name: terminalTitle,
			cwd: root.fsPath,
			location: vscode.TerminalLocation.Editor,
		});
		this.terminal.show(false);

		// Kick off opencode once the shell is ready.
		const opencode = await resolveOpencodeCommand();
		if (!opencode) {
			this.output.appendLine('[vskids] opencode was not found; see the helper terminal for instructions.');
		}
		setTimeout(() => {
			try {
				if (opencode) {
					this.terminal?.sendText(JSON.stringify(opencode));
				} else {
					this.terminal?.sendText(`echo ${JSON.stringify(OPENCODE_MISSING_MESSAGE)}`);
				}
			} catch (err) {
				this.output.appendLine(`[vskids] could not start opencode: ${String(err)}`);
			}
		}, 800);
	}

	private async tryCommand(command: string, ...args: unknown[]): Promise<void> {
		try {
			await vscode.commands.executeCommand(command, ...args);
		} catch (err) {
			this.output.appendLine(`[vskids] command "${command}" failed: ${String(err)}`);
		}
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
