/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const CONFIG_KEY = 'opencodeCommand';

async function isRunnable(candidate: string): Promise<boolean> {
	try {
		return (await fs.promises.stat(candidate)).isFile();
	} catch {
		return false;
	}
}

/**
 * Locate the opencode executable.
 *
 * A GUI-launched app inherits a minimal `PATH` (roughly `/usr/bin:/bin:/usr/sbin:/sbin`),
 * so a developer's `opencode` installed via fnm/npm/homebrew will not be found.
 * We therefore check the configured command, then search common install
 * locations explicitly.
 *
 * The configuration value may be an absolute path (used as-is) or a bare command
 * name (searched for on `PATH` and in the common locations below).
 */
export async function resolveOpencodeCommand(): Promise<string | undefined> {
	const configured = (vscode.workspace.getConfiguration('vskids').get<string>(CONFIG_KEY) ?? 'opencode').trim();
	if (configured.length === 0) {
		return undefined;
	}

	// An absolute (or path-containing) value is honoured directly.
	if (configured.includes('/') || configured.includes('\\')) {
		const expanded = configured.startsWith('~')
			? path.join(os.homedir(), configured.slice(1))
			: configured;
		return (await isRunnable(expanded)) ? expanded : undefined;
	}

	const searchDirs = [
		...(process.env.PATH ?? '').split(path.delimiter),
		path.join(os.homedir(), '.local', 'bin'),
		path.join(os.homedir(), '.opencode', 'bin'),
		path.join(os.homedir(), '.bun', 'bin'),
		path.join(os.homedir(), '.cargo', 'bin'),
		'/opt/homebrew/bin',
		'/usr/local/bin',
		'/usr/bin',
	].filter(entry => entry.length > 0);

	for (const dir of searchDirs) {
		const candidate = path.join(dir, configured);
		if (await isRunnable(candidate)) {
			return candidate;
		}
	}

	return undefined;
}

export const OPENCODE_MISSING_MESSAGE =
	'\u{1F6A7}  The coding helper (opencode) was not found. Ask a grown-up to install it, then open the app again. See https://opencode.ai';
