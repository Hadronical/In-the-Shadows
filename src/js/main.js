const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
let graphs = stats.dom.querySelectorAll('canvas');
for (g of graphs) {
	g.style.width = "120px";
	g.style.height = "72px";
}

let recordingMouse = true;


//#region screen variables

const W = 800, H = 600;
const W2 = W/2, H2 = H/2;
const pixelation_level = 5;
const pixelation_sqr = pixelation_level * pixelation_level;
const pixelation_width  = Math.floor(W / pixelation_level);
const pixelation_height = Math.floor(H / pixelation_level);
const diag = Math.sqrt(W * W + H * H);
const deg2rad = Math.PI / 180;

//#endregion

//#region time

let TIME_dT_MS;
let TIME_dT;
let TIME_TIME_MS;

//#endregion

//#region shaders

let SHADER_LIGHTING;
let SHADER_PIXELATE;

//#endregion

//#region Matter.js physics engine

let MATTER_ENGINE    = Matter.Engine;
let MATTER_RUNNER    = Matter.Runner;
let MATTER_COMMON    = Matter.Common;
let MATTER_COMPOSITE = Matter.Composite;
let MATTER_WORLD     = Matter.World;
let MATTER_BODY      = Matter.Body;
let MATTER_BODIES    = Matter.Bodies;
let MATTER_QUERY     = Matter.Query;
let PHY_ENGINE;
let PHY_WORLD;

//#endregion

//#region rendering variables

let CANVAS;
const MESHES = new Map();
const LIGHTS = new Map();
const MESHESTODESTROY = [];
const LIGHTSTODESTROY = [];
let LIGHTIDs = [];
let MESHLIST = [];

//#endregion
//#region render buffers

let MAIN, UI;
let G_BUFFER;
let SHADOW, SHADOW_BUFFER, LIGHT_BUFFER;

//#endregion

//#region game variables

let zoom = 3;
let mPos;
let trackPos;

// player and inventory
let PLAYER;
const INVENTORY = Array(5).fill({id: -1, capacity: 0, data: {}});
let currentItem;
let currentInventorySlot = 0;

// movement
let moveDir;
let sprint = false;
let crouch = false;
let lean = 0;
let spd = 1.1;

let muzzleFlash, muzzleFlashMS = 0;

// items
let glowStickDuration = 30;
let throwCharge = 1;

//#endregion

//#region resource variables

const PATH_TO_ASSETS = "../assets";
const PATH_TO_TEXTURES = "../assets/textures";
const PATH_TO_AUDIO = "../assets/audio";
const PATH_TO_ANIMATIONS = "../assets/animations";

const IMG = {};
const AUDIO = {};
const ANIM = {};
const TEXTURE_CONTAINERS = {};

//#endregion


function preload ()
{
	// load shaders
	SHADER_LIGHTING = loadShader('../assets/shaders/lighting.vert', '../assets/shaders/lighting.frag');
	SHADER_PIXELATE = loadShader('../assets/shaders/pixelate.vert', '../assets/shaders/pixelate.frag');

	// load textures
	loadTexture("hand");
	loadTexture("campfire");
	loadTexture("wallLight");
	loadTexture("flashlight");
	loadTexture("glowstick");
	loadTexture("assaultRifle");
	loadTexture("pistol");
	loadTexture("sniper");

	// load audio


	// load animations
	loadSpriteAnimationFrames("lever", 2, 0);
}


function setup ()
{
	setupMatterEngine();

	let canvas = createCanvas(W+5,H+5, WEBGL);
	canvas.position((windowWidth - width) / 2, (windowHeight - height) / 2);
	console.log(canvas);
	canvas.canvas.addEventListener('mouseenter', (e) => recordingMouse = true);
	canvas.canvas.addEventListener('mouseleave', (e) => recordingMouse = false);

	noCursor();
	frameRate(30);
	mPos = createVector(0, 0);


	setupBuffers();

	setupProps();
	setupItems();
	setupMap();
	setupPlayer();

	// muzzleflash
	muzzleFlash = new PointLight(200,200, color(230, 200, 150), 10.0,0.4);
	muzzleFlash.setVisible(false);
	muzzleFlash.updateFunc = () => {
		muzzleFlashMS -= TIME_dT_MS; 

		if (muzzleFlashMS <= 0)
		{
			muzzleFlash.setVisible(false);
		}
	}

	setupUIElements();
}
function setupMatterEngine ()
{
	PHY_ENGINE = MATTER_ENGINE.create();
	PHY_ENGINE.gravity.y = 0;
	PHY_WORLD = PHY_ENGINE.world;
	Matter.Resolver._restingThresh = 0.01;
	MATTER_RUNNER.run(PHY_ENGINE);
}
function setupBuffers ()
{
	CANVAS = createGraphics(W, H, WEBGL);
	MAIN = createGraphics(W, H);
	SHADOW = createGraphics(W, H, WEBGL);
	UI = createGraphics(W, H);

	SHADOW_BUFFER = createGraphics(W, H);
	LIGHT_BUFFER = createGraphics(W, H);
	G_BUFFER = createGraphics(W, H);

	CANVAS.noSmooth();
	SHADOW.noSmooth();
}
function setupMap ()
{
	let verts1 = [];
	for (let i = 0; i < 15; i++) {
		let a = map(i, 0, 15, 0, TWO_PI);
		let R = 50 + random(-15, 2);
		verts1.push(
			new vec2(R * cos(a), R * sin(a))
		);
	}
	new Mesh(300, 250, verts1, true, color(100, 50, 50));


	new Mesh(75, 200, [
		new vec2(75, 2.5),
		new vec2(75, 17.5),
		new vec2(-75, -2.5),
		new vec2(-75, -17.2)
	], true, color(100, 50, 50));


	let verts2 = rectVerts(20, 10);
	new Mesh(50, 250, verts2, true, color(150));
	new Mesh(50, 280, verts2, true, color(150));
	new Mesh(50, 310, verts2, true, color(150));


	// room
	new Mesh(62.5, 2.5, rectVerts(125, 5), true, color(100));
	new Mesh(2.5, 42.5, rectVerts(5, 85), true, color(100));
	new Mesh(122.5, 42.5, rectVerts(5, 85), true, color(100));
	new Mesh(45, 82.5, rectVerts(80, 5), true, color(100));

	let verts3 = []
	for (let i = 0; i < 6; i++)
	{
		let a = map(i, 0, 6, 0, TWO_PI);
		let R = 30 + random(-6, 6) + i * 2;
		verts3.push( new vec2(round(R * cos(a)), round(R * sin(a))) );
	}
	new Mesh(180, 130, verts3, true,color(100, 50, 50));

	PROPDICTIONARY.get(0).instantiate(60, 40);
	PROPDICTIONARY.get(1).instantiate(20, 45);
	PROPDICTIONARY.get(2).instantiate(30, 40);
}
function setupPlayer ()
{
	var playerverts = [];
	for (let i = 0; i < 6; i++)
	{
		let a = map(i, 0, 6, 0, TWO_PI);
		let R = 8;
		playerverts.push( new vec2(R * cos(a), R * sin(a)) );
	}
	PLAYER = new Mesh(20, 20, playerverts, false, color(255));
	PLAYER.PHY_body.inertia = Infinity;
	PLAYER.PHY_body.inverseInertia = 0;
	//PLAYER.PHY_body.updateVelocity = false;
	PLAYER.castShadows = false;
	trackPos = new vec2(0, 0);
	moveDir = createVector(0, 0);
	PLAYER.hand = createVector(0, 0);

	PLAYER.recoilControl = 1;


	// inventory
	currentItem = ITEMDICTIONARY.get(-1);
	currentInventorySlot = 0;

	addToInventory(4, {});
	addToInventory(0, {});
	addToInventory(1, {});
	console.table(INVENTORY);
}



function draw ()
{
	stats.begin();
	background(60);

	CANVAS.clear();
	MAIN.background(60);
	SHADOW.background(0);
	UI.clear();

	LIGHTIDs = Array.from(LIGHTS.keys());
	MESHLIST = Array.from(MESHES.values());

	TIME_dT_MS = deltaTime;
	TIME_dT = deltaTime / 1000;
	TIME_MS = millis();


	processInput();


	// item mechanics
	currentItem.update();
	if (leftMousePressed && currentItem.canUse)
	{
		currentItem.use();
	}

	// update meshes and geometry
	for (let mesh of MESHLIST)
	{
		mesh.update();
	}

	drawInventoryItems();
	
	update_G_BUFFER();


	//* UI
	for (let fText of FLOATINGTEXTS)
	{
		fText.update();
	}
	drawUIElements();
	MAIN.push();
	MAIN.translate(W2 - trackPos.x/zoom, H2 - trackPos.y/zoom);
	MAIN.scale(1/zoom);
	MAIN.image(UI, -W2,-H2);
	MAIN.pop();



	renderScene();


	// destroy meshes and lights at end of frame
	for (let id of MESHESTODESTROY)
	{
		MATTER_WORLD.remove(PHY_WORLD, MESHES.get(id).PHY_body);
		MESHES.delete(id);
	}
	MESHESTODESTROY.length = 0;
	for (let id of LIGHTSTODESTROY)
	{
		LIGHTS.delete(id);
	}
	LIGHTSTODESTROY.length = 0;

	stats.end();
}


function renderScene ()
{
	renderShadows();

	resetShader();

	push();
	CANVAS.resetShader();
	CANVAS.push();
	trackPos.x = lerp(trackPos.x, (W/2-PLAYER.pos.x) * zoom + moveDir.x * 2, 0.4);
	trackPos.y = lerp(trackPos.y, (H/2-PLAYER.pos.y) * zoom + moveDir.y * 2, 0.4);
	CANVAS.translate(trackPos.x, trackPos.y);
	CANVAS.scale(zoom);
	CANVAS.image(SHADOW, -W/2,-H/2);
	//CANVAS.image(MAIN, -W/2,-H/2);
	CANVAS.pop();

	//pixelateCanvas();

	image(CANVAS, -W/2,-H/2);
}
function pixelateCanvas ()
{
	CANVAS.shader(SHADER_PIXELATE);
	SHADER_PIXELATE.setUniform('uTexture', CANVAS);
	SHADER_PIXELATE.setUniform('uResolution', [W, H]);
	SHADER_PIXELATE.setUniform('uPixels', 220);

	CANVAS.rect(-W/2,-H/2, W,H);
	pop();
}


function processInput ()
{
	// mouse inputs
	if (recordingMouse)
	{
		mPos.x = PLAYER.pos.x + (mouseX - W/2)/zoom;
		mPos.y = PLAYER.pos.y + (mouseY - H/2)/zoom;
	}

	// keyboard inputs
	if (keyIsDown(INPUT_KEYS.T))
	{
		throwCharge = min(throwCharge + TIME_dT * 1.8, 5);
		UI.push();
		UI.fill(255);
		UI.rect(W2-20, H2+30, throwCharge/5 * 40, 8);
		UI.pop();
	}


	PLAYER.hand.y = lerp(PLAYER.hand.y, lean, TIME_dT * 7);

	let spdMult = 1;

	// shift and crouch
	switch (true)
	{
		case sprint && crouch:
		default: {
			spdMult = 1;
			PLAYER.recoilControl = 1;
			break;
		}
		case sprint: {
			spdMult = 1.7;
			PLAYER.recoilControl = 0.2;
			break;
		}
		case crouch: {
			spdMult = 0.6;
			PLAYER.recoilControl = 2;
			break;
		}
	}

	// move player
	if (moveDir.x != 0 || moveDir.y != 0)
	{
		let move = p5.Vector.normalize(moveDir).mult(spd * spdMult / currentItem.handling);
		PLAYER.move(move.x, move.y);
	}

	// player look at mouse
	let dir2mouse = p5.Vector.sub(mPos, PLAYER.pos);
	PLAYER.rotateTo(angleLerp(
		PLAYER.a,
		dir2mouse.heading(),
		TIME_dT * 20 / currentItem.handling
	));
}

function mousePressed ()
{
	if (recordingMouse == false) { return; }

	leftMousePressed  = mouseButton === LEFT;
	rightMousePressed = mouseButton === RIGHT;
}
function mouseReleased ()
{
	if (recordingMouse == false) { return; }

	if (mouseButton === LEFT)   leftMousePressed = false;
	if (mouseButton === RIGHT) rightMousePressed = false;
}
function keyPressed ()
{
	switch (keyCode)
	{
		case INPUT_KEYS.ONE:
		case INPUT_KEYS.TWO:
		case INPUT_KEYS.THREE:
		case INPUT_KEYS.FOUR:
		case INPUT_KEYS.FIVE: {
			equipItem(keyCode - INPUT_KEYS.ONE);
			break;
		}
		case INPUT_KEYS.R: {
			if (currentItem instanceof Weapon)
			{
				currentItem.reloadStart();
			}
			break;
		}
		case INPUT_KEYS.F: {
			currentItem.inspect();
			break;
		}
		case INPUT_KEYS.I: {
			openUI(2);
			break;
		}
		case INPUT_KEYS.ESC: {
			if (UIopen)
			{
				closeCurrentUI();
			}
			break;
		}

		case INPUT_KEYS.W: moveDir.y -= 1; break;
		case INPUT_KEYS.A: moveDir.x -= 1; break;
		case INPUT_KEYS.S: moveDir.y += 1; break;
		case INPUT_KEYS.D: moveDir.x += 1; break;
		case INPUT_KEYS.SHIFT: sprint = true; break;
		case INPUT_KEYS.C: crouch = true; break;

		case INPUT_KEYS.Q: lean -= 6; break;
		case INPUT_KEYS.E: lean += 6;break;
		default: break;
	}
}
function keyReleased ()
{
	switch (keyCode)
	{
		case INPUT_KEYS.T: {
			throwItem();
			throwCharge = 1;
			break;
		}

		case INPUT_KEYS.W: moveDir.y += 1; break;
		case INPUT_KEYS.A: moveDir.x += 1; break;
		case INPUT_KEYS.S: moveDir.y -= 1; break;
		case INPUT_KEYS.D: moveDir.x -= 1; break;
		case INPUT_KEYS.SHIFT: sprint = false; break;
		case INPUT_KEYS.C: crouch = false; break;

		case INPUT_KEYS.Q: lean += 6; break;
		case INPUT_KEYS.E: lean -= 6;break;

	}
}