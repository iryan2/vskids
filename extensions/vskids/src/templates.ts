/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface ProjectTemplate {
	readonly id: string;
	readonly name: string;
	readonly emoji: string;
	readonly description: string;
	readonly files: Record<string, string>;
}

const SHARED_README = `# My App

This is your very own web app. Try asking the helper on the right to change
things, or edit the files yourself.

Have fun!
`;

export const TEMPLATES: ProjectTemplate[] = [
	{
		id: 'hello',
		name: 'Hello App',
		emoji: '\u{1F44B}',
		description: 'A friendly page to make your own.',
		files: {
			'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>My App</title>
	<link rel="stylesheet" href="styles.css" />
</head>
<body>
	<main>
		<h1>Hi! I am your new app.</h1>
		<p>Click the button and make something happen.</p>
		<button id="magic">Make it magic</button>
	</main>
	<script src="script.js"></script>
</body>
</html>
`,
			'styles.css': `* { box-sizing: border-box; }
body {
	margin: 0;
	min-height: 100vh;
	display: grid;
	place-items: center;
	font-family: system-ui, -apple-system, sans-serif;
	background: linear-gradient(135deg, #6a5cff, #ff5cae);
	color: white;
}
main { text-align: center; padding: 2rem; }
h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }
p { font-size: 1.25rem; opacity: 0.9; }
button {
	margin-top: 1rem; padding: 1rem 2rem; font-size: 1.25rem;
	border: none; border-radius: 999px; background: white;
	color: #6a5cff; cursor: pointer; font-weight: 700;
}
button:active { transform: scale(0.97); }
`,
			'script.js': `const button = document.getElementById('magic');
const colors = ['#6a5cff', '#ff5cae', '#00c2a8', '#ffb000', '#00a2ff'];
let index = 0;

button.addEventListener('click', () => {
	index = (index + 1) % colors.length;
	document.body.style.background = colors[index];
	const messages = ['Wow! Great click!', 'You are making things happen!', 'Keep going!', 'This is your app!'];
	button.textContent = messages[Math.floor(Math.random() * messages.length)];
});
`,
		},
	},
	{
		id: 'drawing',
		name: 'Drawing App',
		emoji: '\u{1F3A8}',
		description: 'Paint with your mouse or finger.',
		files: {
			'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Drawing</title>
	<link rel="stylesheet" href="styles.css" />
</head>
<body>
	<canvas id="board"></canvas>
	<div class="bar">
		<button class="swatch" data-color="#6a5cff" style="background:#6a5cff"></button>
		<button class="swatch" data-color="#ff5cae" style="background:#ff5cae"></button>
		<button class="swatch" data-color="#00c2a8" style="background:#00c2a8"></button>
		<button class="swatch" data-color="#ffb000" style="background:#ffb000"></button>
		<button id="clear">Clear</button>
	</div>
	<script src="script.js"></script>
</body>
</html>
`,
			'styles.css': `* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; }
body { font-family: system-ui, -apple-system, sans-serif; background: #fffdf5; }
canvas { display: block; width: 100vw; height: 100vh; touch-action: none; cursor: crosshair; }
.bar { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
	display: flex; gap: 10px; align-items: center; padding: 10px 14px;
	background: #fff; border-radius: 999px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
.swatch { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px #ddd; cursor: pointer; }
#clear { border: none; background: #eee; border-radius: 999px; padding: 8px 16px; font-size: 15px; font-weight: 700; cursor: pointer; }
`,
			'script.js': `const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
let color = '#6a5cff';
let drawing = false;

function resize() {
	const image = ctx.getImageData(0, 0, canvas.width || 1, canvas.height || 1);
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	ctx.putImageData(image, 0, 0);
}
resize();
window.addEventListener('resize', resize);

function draw(event) {
	if (!drawing) { return; }
	const x = event.clientX;
	const y = event.clientY;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, 8, 0, Math.PI * 2);
	ctx.fill();
}

canvas.addEventListener('pointerdown', event => { drawing = true; draw(event); });
canvas.addEventListener('pointermove', draw);
window.addEventListener('pointerup', () => { drawing = false; });

document.querySelectorAll('.swatch').forEach(button => {
	button.addEventListener('click', () => { color = button.dataset.color; });
});
document.getElementById('clear').addEventListener('click', () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});
`,
		},
	},
	{
		id: 'game',
		name: 'Clicking Game',
		emoji: '\u{1F3AE}',
		description: 'Catch the star to score points.',
		files: {
			'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Catch the Star</title>
	<link rel="stylesheet" href="styles.css" />
</head>
<body>
	<header>Score: <span id="score">0</span></header>
	<div id="stage"></div>
	<script src="script.js"></script>
</body>
</html>
`,
			'styles.css': `* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0f1b4c; color: #fff; }
header { position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
	font-size: 26px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.4); }
#stage { position: absolute; inset: 0; }
.star { position: absolute; font-size: 48px; cursor: pointer; user-select: none;
	animation: pop 0.15s ease-out; }
@keyframes pop { from { transform: scale(0.3); } to { transform: scale(1); } }
`,
			'script.js': `const stage = document.getElementById('stage');
const scoreLabel = document.getElementById('score');
let score = 0;
let star;

function place() {
	const padding = 60;
	const x = padding + Math.random() * (window.innerWidth - padding * 2);
	const y = padding + Math.random() * (window.innerHeight - padding * 2);
	star.style.left = x + 'px';
	star.style.top = y + 'px';
}

function spawn() {
	star = document.createElement('div');
	star.className = 'star';
	star.textContent = '\u2B50';
	star.addEventListener('click', () => {
		score += 1;
		scoreLabel.textContent = String(score);
		place();
	});
	stage.appendChild(star);
	place();
	setInterval(place, 1400);
}
spawn();
`,
		},
	},
	{
		id: 'story',
		name: 'Story Maker',
		emoji: '\u{1F4D6}',
		description: 'A story where you pick what happens.',
		files: {
			'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Story</title>
	<link rel="stylesheet" href="styles.css" />
</head>
<body>
	<main>
		<div id="emoji">\u{1F331}</div>
		<p id="text"></p>
		<div id="choices"></div>
	</main>
	<script src="script.js"></script>
</body>
</html>
`,
			'styles.css': `* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center;
	font-family: system-ui, -apple-system, sans-serif; color: #233;
	background: linear-gradient(160deg, #e8f7ff, #fff3e0); }
main { max-width: 640px; padding: 2rem; text-align: center; }
#emoji { font-size: 90px; }
#text { font-size: 1.5rem; line-height: 1.5; }
button { display: block; width: 100%; margin: 10px 0; padding: 16px;
	font-size: 1.2rem; font-weight: 700; border: none; border-radius: 16px;
	background: #6a5cff; color: #fff; cursor: pointer; }
button:hover { background: #564bc9; }
`,
			'script.js': `const pages = {
	start: {
		emoji: '\u{1F331}',
		text: 'You find a tiny seed on the ground. What do you do?',
		choices: [['Plant it', 'plant'], ['Put it in your pocket', 'pocket']],
	},
	plant: {
		emoji: '\u{1F333}',
		text: 'You plant the seed. It grows into a giant tree overnight!',
		choices: [['Climb it', 'climb'], ['Start again', 'start']],
	},
	pocket: {
		emoji: '\u{1F9F5}',
		text: 'In your pocket the seed starts to hum a little song.',
		choices: [['Sing along', 'sing'], ['Start again', 'start']],
	},
	climb: {
		emoji: '\u{1F31F}',
		text: 'At the top you can touch the stars. The end!',
		choices: [['Start again', 'start']],
	},
	sing: {
		emoji: '\u{1F3B5}',
		text: 'The song makes flowers bloom all around you. The end!',
		choices: [['Start again', 'start']],
	},
};

const emojiLabel = document.getElementById('emoji');
const textLabel = document.getElementById('text');
const choicesBox = document.getElementById('choices');

function show(key) {
	const page = pages[key];
	emojiLabel.textContent = page.emoji;
	textLabel.textContent = page.text;
	choicesBox.innerHTML = '';
	page.choices.forEach(([label, next]) => {
		const button = document.createElement('button');
		button.textContent = label;
		button.addEventListener('click', () => show(next));
		choicesBox.appendChild(button);
	});
}
show('start');
`,
		},
	},
	{
		id: 'music',
		name: 'Sound Board',
		emoji: '\u{1F3B9}',
		description: 'Tap the keys to play sounds.',
		files: {
			'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Sound Board</title>
	<link rel="stylesheet" href="styles.css" />
</head>
<body>
	<main id="keys"></main>
	<script src="script.js"></script>
</body>
</html>
`,
			'styles.css': `* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #12102a; }
main { min-height: 100vh; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; }
.key { flex: 1; max-width: 120px; height: 60vh; border: none; border-radius: 20px;
	color: #fff; font-size: 22px; font-weight: 800; cursor: pointer;
	display: flex; align-items: flex-end; justify-content: center; padding-bottom: 18px;
	transition: transform 0.05s; }
.key:active { transform: translateY(6px); }
`,
			'script.js': `const notes = [
	['C', 261.63, '#ff5cae'], ['D', 293.66, '#ff8a3d'], ['E', 329.63, '#ffd23d'],
	['F', 349.23, '#7ed957'], ['G', 392.00, '#3dc9ff'], ['A', 440.00, '#6a5cff'],
	['B', 493.88, '#b56bff'],
];

const audio = new (window.AudioContext || window.webkitAudioContext)();
const keys = document.getElementById('keys');

notes.forEach(([label, frequency, color]) => {
	const button = document.createElement('button');
	button.className = 'key';
	button.style.background = color;
	button.textContent = label;
	button.addEventListener('click', () => play(frequency));
	keys.appendChild(button);
});

function play(frequency) {
	const oscillator = audio.createOscillator();
	const gain = audio.createGain();
	oscillator.frequency.value = frequency;
	oscillator.type = 'triangle';
	oscillator.connect(gain);
	gain.connect(audio.destination);
	gain.gain.setValueAtTime(0.25, audio.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
	oscillator.start();
	oscillator.stop(audio.currentTime + 0.6);
}
`,
		},
	},
];

export function getTemplate(id: string): ProjectTemplate {
	return TEMPLATES.find(template => template.id === id)
		?? TEMPLATES.find(template => template.id === 'hello')
		?? TEMPLATES[0];
}

export { SHARED_README };
