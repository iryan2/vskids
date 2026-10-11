/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { contentSecurityPolicy, escapeHtml, getNonce } from './webview';

/**
 * The slim header that sits above the app preview. It displays the project name
 * and the single big "Save" button, so nothing else about the workbench needs to
 * be visible.
 */
export class HeaderPanel {

	private static active: HeaderPanel | undefined;

	static create(projectName: string, onSave: () => void): HeaderPanel {
		const panel = vscode.window.createWebviewPanel('vskids.header', 'Vibekids', vscode.ViewColumn.Active, {
			enableScripts: true,
			retainContextWhenHidden: true,
		});
		return new HeaderPanel(panel, projectName, onSave);
	}

	private readonly disposables: vscode.Disposable[] = [];
	private disposing = false;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private projectName: string,
		onSave: () => void,
	) {
		HeaderPanel.active?.dispose();
		HeaderPanel.active = this;

		this.panel.webview.html = this.render();
		this.panel.webview.onDidReceiveMessage(message => {
			if (message && message.type === 'save') {
				onSave();
			}
		}, undefined, this.disposables);
		this.panel.onDidDispose(() => this.handleDisposed(), undefined, this.disposables);
	}

	get viewColumn(): vscode.ViewColumn | undefined {
		return this.panel.viewColumn;
	}

	setProjectName(name: string): void {
		this.projectName = name;
		this.panel.webview.html = this.render();
	}

	dispose(): void {
		if (this.disposing) {
			return;
		}
		this.disposing = true;
		HeaderPanel.active = undefined;
		this.panel.dispose();
		this.disposables.forEach(disposable => disposable.dispose());
	}

	private handleDisposed(): void {
		if (HeaderPanel.active === this) {
			HeaderPanel.active = undefined;
		}
		this.disposables.forEach(disposable => disposable.dispose());
	}

	private render(): string {
		const nonce = getNonce();
		const csp = contentSecurityPolicy(this.panel.webview, nonce);
		const name = escapeHtml(this.projectName);
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="${csp}" />
	<style>
		* { box-sizing: border-box; }
		html, body { height: 100%; }
		body {
			margin: 0;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 8px 14px;
			font-family: system-ui, -apple-system, sans-serif;
			background: linear-gradient(90deg, #6a5cff, #ff5cae);
			color: #fff;
		}
		.title { font-size: 15px; font-weight: 700; letter-spacing: 0.3px; display: flex; align-items: center; gap: 8px; }
		.title .dot { font-size: 18px; }
		button.save {
			border: none;
			border-radius: 999px;
			padding: 8px 22px;
			font-size: 15px;
			font-weight: 800;
			color: #6a5cff;
			background: #fff;
			cursor: pointer;
			box-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
		}
		button.save:active { transform: translateY(1px); box-shadow: none; }
		button.save[disabled] { opacity: 0.6; cursor: default; }
	</style>
</head>
<body>
	<div class="title"><span class="dot">\u{1F680}</span><span>${name}</span></div>
	<button class="save" id="save">Save</button>
	<script nonce="${nonce}">
		const button = document.getElementById('save');
		const vscode = acquireVsCodeApi();
		button.addEventListener('click', () => {
			button.disabled = true;
			button.textContent = 'Saving...';
			vscode.postMessage({ type: 'save' });
			setTimeout(() => {
				button.disabled = false;
				button.textContent = 'Save';
			}, 1200);
		});
	</script>
</body>
</html>`;
	}
}
