/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.htm': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.txt': 'text/plain; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
};

const LIVE_RELOAD_PATH = '/__vskids_livereload';

const LIVE_RELOAD_SNIPPET = `<script>/* vskids live reload */
(function () {
	try {
		var source = new EventSource(${JSON.stringify(LIVE_RELOAD_PATH)});
		source.onmessage = function () { location.reload(); };
	} catch (err) { /* no live reload */ }
})();
</script>`;

const NOT_FOUND_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Not found</title>
<style>
	body { margin: 0; min-height: 100vh; display: grid; place-items: center;
		font-family: system-ui, -apple-system, sans-serif; color: #4b3fa8;
		background: #f4f1ff; text-align: center; }
	h1 { font-size: 3rem; margin: 0 0 0.5rem; }
	p { font-size: 1.25rem; opacity: 0.8; }
</style></head>
<body><div><h1>\u{1F50D} 404</h1><p>We could not find that page in your app.</p></div></body>
</html>`;

/**
 * A tiny zero-dependency static file server with live reload, run inside the
 * extension host process. It serves the project folder and reloads the browser
 * whenever a file under the project changes.
 */
export class DevServer {

	private server: http.Server | undefined;
	private watcher: fs.FSWatcher | undefined;
	private reloadTimer: NodeJS.Timeout | undefined;
	private readonly clients = new Set<http.ServerResponse>();
	private root = '';
	private port = 0;

	get url(): string {
		return `http://127.0.0.1:${this.port}/`;
	}

	async start(root: string): Promise<string> {
		this.stop();
		this.root = root;
		this.server = http.createServer((req, res) => this.onRequest(req, res));
		await new Promise<void>((resolve, reject) => {
			this.server!.once('error', reject);
			this.server!.listen(0, '127.0.0.1', () => resolve());
		});
		const address = this.server.address();
		this.port = address && typeof address === 'object' ? address.port : 0;
		try {
			this.watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
				if (filename && this.isIgnored(String(filename))) {
					return;
				}
				this.scheduleReload();
			});
		} catch {
			// Watching is best-effort; the app still loads without live reload.
		}
		return this.url;
	}

	stop(): void {
		if (this.reloadTimer) {
			clearTimeout(this.reloadTimer);
			this.reloadTimer = undefined;
		}
		for (const client of this.clients) {
			try { client.end(); } catch { /* ignore */ }
		}
		this.clients.clear();
		this.watcher?.close();
		this.watcher = undefined;
		this.server?.close();
		this.server = undefined;
	}

	private isIgnored(relativePath: string): boolean {
		const parts = relativePath.split(path.sep);
		return parts.some(part => part === 'node_modules' || part === '.git' || part === '.vskids');
	}

	private scheduleReload(): void {
		if (this.reloadTimer) {
			clearTimeout(this.reloadTimer);
		}
		this.reloadTimer = setTimeout(() => {
			this.reloadTimer = undefined;
			this.notifyReload();
		}, 120);
	}

	dispose(): void {
		this.stop();
	}

	private notifyReload(): void {
		for (const client of this.clients) {
			try { client.write('data: reload\n\n'); } catch { /* ignore */ }
		}
	}

	private onRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
		const requestUrl = req.url ?? '/';
		if (requestUrl.startsWith(LIVE_RELOAD_PATH)) {
			this.onLiveReload(res);
			return;
		}

		const filePath = this.resolvePath(requestUrl);
		if (!filePath) {
			this.send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
			return;
		}

		fs.readFile(filePath, (err, data) => {
			if (err) {
				this.send(res, 404, 'text/html; charset=utf-8', NOT_FOUND_PAGE);
				return;
			}
			const ext = path.extname(filePath).toLowerCase();
			const type = MIME_TYPES[ext] ?? 'application/octet-stream';
			if (type.startsWith('text/html')) {
				const html = data.toString('utf8');
				const injected = html.includes('</body>')
					? html.replace(/<\/body>/i, `${LIVE_RELOAD_SNIPPET}\n</body>`)
					: html + LIVE_RELOAD_SNIPPET;
				this.send(res, 200, type, injected);
				return;
			}
			res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
			res.end(data);
		});
	}

	private onLiveReload(res: http.ServerResponse): void {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		});
		res.write('retry: 1000\n\n');
		this.clients.add(res);
		res.on('close', () => this.clients.delete(res));
	}

	private resolvePath(requestUrl: string): string | undefined {
		let pathname = requestUrl.split('?')[0].split('#')[0];
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			return undefined;
		}
		if (pathname.endsWith('/')) {
			pathname += 'index.html';
		}
		const resolved = path.join(this.root, path.normalize(pathname));
		const relative = path.relative(this.root, resolved);
		if (relative.startsWith('..') || path.isAbsolute(relative)) {
			return undefined;
		}
		return resolved;
	}

	private send(res: http.ServerResponse, status: number, type: string, body: string | Buffer): void {
		res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
		res.end(body);
	}
}
