/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RecentProjectEntry } from './projects';
import { ProjectTemplate } from './templates';
import { contentSecurityPolicy, escapeHtml, getNonce } from './webview';

export interface WelcomeHandlers {
	onNew(name: string, template: string): void;
	onLoad(): void;
	onOpen(path: string): void;
	onRename(path: string): void;
	onDelete(path: string): void;
}

/**
 * The full-screen welcome surface shown when no project is open. It replaces the
 * default VS Code welcome with a project gallery plus a two-step "New App" flow
 * (choose a template, then name it).
 */
export class WelcomePanel {

	private static active: WelcomePanel | undefined;

	static show(recents: RecentProjectEntry[], templates: ProjectTemplate[], handlers: WelcomeHandlers): WelcomePanel {
		const panel = vscode.window.createWebviewPanel('vskids.welcome', 'Vibekids', vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true,
		});
		return new WelcomePanel(panel, recents, templates, handlers);
	}

	private readonly disposables: vscode.Disposable[] = [];
	private disposing = false;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly recents: RecentProjectEntry[],
		private readonly templates: ProjectTemplate[],
		handlers: WelcomeHandlers,
	) {
		WelcomePanel.active?.dispose();
		WelcomePanel.active = this;

		this.panel.webview.html = this.render();
		this.panel.webview.onDidReceiveMessage(message => {
			switch (message?.type) {
				case 'create':
					if (typeof message.name === 'string' && typeof message.template === 'string') {
						handlers.onNew(message.name, message.template);
					}
					break;
				case 'load':
					handlers.onLoad();
					break;
				case 'open':
					if (typeof message.path === 'string') {
						handlers.onOpen(message.path);
					}
					break;
				case 'rename':
					if (typeof message.path === 'string') {
						handlers.onRename(message.path);
					}
					break;
				case 'delete':
					if (typeof message.path === 'string') {
						handlers.onDelete(message.path);
					}
					break;
			}
		}, undefined, this.disposables);
		this.panel.onDidDispose(() => this.handleDisposed(), undefined, this.disposables);
	}

	dispose(): void {
		if (this.disposing) {
			return;
		}
		this.disposing = true;
		WelcomePanel.active = undefined;
		this.panel.dispose();
		this.disposables.forEach(disposable => disposable.dispose());
	}

	private handleDisposed(): void {
		if (WelcomePanel.active === this) {
			WelcomePanel.active = undefined;
		}
		this.disposables.forEach(disposable => disposable.dispose());
	}

	private render(): string {
		const nonce = getNonce();
		const csp = contentSecurityPolicy(this.panel.webview, nonce);

		const recents = this.recents.map(recent => `
			<div class="card" data-path="${escapeHtml(recent.folder.fsPath)}">
				<div class="card-main">
					<div class="card-emoji">${escapeHtml(recent.emoji)}</div>
					<div class="card-name">${escapeHtml(recent.name)}</div>
				</div>
				<div class="card-tools">
					<button class="tool rename" title="Rename" data-path="${escapeHtml(recent.folder.fsPath)}">\u270F\uFE0F</button>
					<button class="tool delete" title="Delete" data-path="${escapeHtml(recent.folder.fsPath)}">\u{1F5D1}\uFE0F</button>
				</div>
			</div>`).join('');

		const gallerySection = this.recents.length > 0
			? `<section class="gallery"><h2>Your apps</h2><div class="cards">${recents}</div></section>`
			: '';

		const templates = this.templates.map(template => `
			<button class="template" data-template="${escapeHtml(template.id)}">
				<span class="template-emoji">${escapeHtml(template.emoji)}</span>
				<span class="template-name">${escapeHtml(template.name)}</span>
				<span class="template-desc">${escapeHtml(template.description)}</span>
			</button>`).join('');

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="${csp}" />
	<style>
		* { box-sizing: border-box; }
		html, body { min-height: 100%; }
		body {
			margin: 0;
			padding: 40px;
			font-family: system-ui, -apple-system, sans-serif;
			background: linear-gradient(135deg, #6a5cff, #ff5cae 60%, #ffb000);
			color: #fff;
			text-align: center;
		}
		.step { min-height: calc(100vh - 80px); display: flex; flex-direction: column;
			align-items: center; justify-content: center; gap: 24px; }
		.hidden { display: none !important; }
		h1 { font-size: 52px; margin: 0; text-shadow: 0 4px 0 rgba(0,0,0,0.12); }
		h2 { font-size: 18px; opacity: 0.92; margin: 0 0 14px; font-weight: 700; }
		.subtitle { font-size: 20px; opacity: 0.95; margin: 0; }
		.actions { display: flex; gap: 22px; flex-wrap: wrap; justify-content: center; }
		.big {
			border: none; border-radius: 28px; padding: 26px 40px; font-size: 26px; font-weight: 800;
			cursor: pointer; background: #fff; color: #6a5cff; box-shadow: 0 6px 0 rgba(0,0,0,0.18);
			display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 220px;
		}
		.big .emoji { font-size: 44px; }
		.big:active { transform: translateY(2px); box-shadow: 0 3px 0 rgba(0,0,0,0.18); }
		.gallery { width: min(860px, 100%); margin-top: 34px; }
		.cards { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }
		.card { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.4);
			border-radius: 20px; padding: 14px 12px 14px 18px; display: flex; align-items: center;
			gap: 12px; min-width: 210px; }
		.card-main { display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; text-align: left; }
		.card-emoji { font-size: 34px; }
		.card-name { font-size: 18px; font-weight: 700; }
		.card-tools { display: flex; gap: 4px; }
		.tool { border: none; background: rgba(255,255,255,0.25); border-radius: 10px;
			cursor: pointer; font-size: 15px; padding: 6px 8px; }
		.tool:hover { background: rgba(255,255,255,0.45); }
		.template-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
			gap: 16px; width: min(760px, 100%); }
		.template { border: none; border-radius: 22px; padding: 20px; background: #fff;
			color: #3b2f9e; cursor: pointer; display: flex; flex-direction: column; align-items: center;
			gap: 6px; box-shadow: 0 5px 0 rgba(0,0,0,0.15); }
		.template:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.15); }
		.template-emoji { font-size: 44px; }
		.template-name { font-size: 20px; font-weight: 800; }
		.template-desc { font-size: 14px; opacity: 0.75; }
		input { font-size: 22px; padding: 14px 20px; border-radius: 16px; border: none;
			width: 360px; text-align: center; }
		.back { background: transparent; border: none; color: #fff; font-size: 16px;
			opacity: 0.9; cursor: pointer; text-decoration: underline; }
	</style>
</head>
<body>
	<div class="step" id="home">
		<h1>Vibekids</h1>
		<p class="subtitle">Make something awesome today!</p>
		<div class="actions">
			<button class="big" id="new"><span class="emoji">\u2728</span>New App</button>
			<button class="big" id="load"><span class="emoji">\u{1F4C2}</span>Open App</button>
		</div>
		${gallerySection}
	</div>

	<div class="step hidden" id="template">
		<h1>Pick a start</h1>
		<p class="subtitle">What would you like to make?</p>
		<div class="template-grid">${templates}</div>
		<button class="back" id="template-back">Back</button>
	</div>

	<div class="step hidden" id="name">
		<h1>Name your app</h1>
		<input id="name-input" placeholder="My Amazing App" maxlength="40" />
		<div class="actions">
			<button class="big" id="create"><span class="emoji">\u{1F680}</span>Create</button>
		</div>
		<button class="back" id="name-back">Back</button>
	</div>

	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const steps = {
			home: document.getElementById('home'),
			template: document.getElementById('template'),
			name: document.getElementById('name'),
		};
		let chosenTemplate = 'hello';

		function show(step) {
			for (const key of Object.keys(steps)) {
				steps[key].classList.toggle('hidden', key !== step);
			}
		}

		document.getElementById('new').addEventListener('click', () => show('template'));
		document.getElementById('template-back').addEventListener('click', () => show('home'));
		document.getElementById('name-back').addEventListener('click', () => show('template'));
		document.getElementById('load').addEventListener('click', () => vscode.postMessage({ type: 'load' }));

		document.querySelectorAll('.template').forEach((button) => {
			button.addEventListener('click', () => {
				chosenTemplate = button.dataset.template;
				show('name');
				document.getElementById('name-input').focus();
			});
		});

		const nameInput = document.getElementById('name-input');
		document.getElementById('create').addEventListener('click', () => {
			const name = nameInput.value.trim() || 'My Amazing App';
			vscode.postMessage({ type: 'create', name, template: chosenTemplate });
		});
		nameInput.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				document.getElementById('create').click();
			}
		});

		document.querySelectorAll('.card-main').forEach((main) => {
			main.addEventListener('click', () => vscode.postMessage({ type: 'open', path: main.parentElement.dataset.path }));
		});
		document.querySelectorAll('.tool.rename').forEach((button) => {
			button.addEventListener('click', () => vscode.postMessage({ type: 'rename', path: button.dataset.path }));
		});
		document.querySelectorAll('.tool.delete').forEach((button) => {
			button.addEventListener('click', () => vscode.postMessage({ type: 'delete', path: button.dataset.path }));
		});
	</script>
</body>
</html>`;
	}
}
