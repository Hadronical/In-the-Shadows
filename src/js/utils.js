function vec2 (x, y)
{
    this.x = x;
    this.y = y;

    this.p5 = () => {
        return createVector(this.x, this.y);
    }

    this.matter = () => {
        return Matter.Vector.create(x, y);
    }
}

const FLOATINGTEXTS = [];
const floatingTextLifetime = 1.5;
function floatingText (str, x,y, endHeight)
{
    this.string = str;
    this.x = x;
    this.y = y;
    this.endH = endHeight;
    this.t = 0;

    FLOATINGTEXTS.push(this);

    this.update = () => {
        UI.push();
        UI.noStroke();
        UI.fill(255, 255 * (1 - this.t/floatingTextLifetime));
        UI.textAlign(CENTER);
        UI.textSize(18);
        UI.textStyle(BOLD);
        UI.drawingContext.letterSpacing = "5px";
        UI.text(this.string, this.x,this.y + lerp(0,this.endH, this.t/floatingTextLifetime));
        UI.pop();

        this.t += TIME_dT;
        if (this.t >= floatingTextLifetime)
        {
            FLOATINGTEXTS.splice(0, 1);
        }
    }
}

// math
function rotateVecCW (vec, angle)
{
    let c = cos(angle);
    let s = sin(angle);

    return createVector(
        vec.x * c - vec.y * s,
        vec.x * s + vec.y * c
    );
}

function acceleratingFalloff (x, duration, speed)
{
    return 1 - pow(x / duration, speed);
}

function rectVerts(w, h)
{
    let W = w/2;
    let H = h/2;
    return [
        new vec2( W,-H),
        new vec2( W, H),
        new vec2(-W, H),
        new vec2(-W,-H)
    ];
}

function centralizeVertices(verts)
{
    let xm = verts[0].x;
    let xM = verts[0].x;
    let ym = verts[0].y;
    let yM = verts[0].y;
    for (let i = 1, l = verts.length; i < l; i++)
    {
        xm = min(verts[i].x, xm);
        xM = max(verts[i].x, xM);
        ym = min(verts[i].y, ym);
        xM = max(verts[i].y, yM);
    }

    let dx = (xM - xm) / 2;
    let dy = (yM - ym) / 2;
    for (let i = 0, l = verts.length; i < l; i++)
    {
        verts[i].x -= dx;
        verts[i].y -= dy;
    }

    return verts;
}


function screenToWorld (pos)
{
    let temp = pos.copy();

    temp.sub(trackPos);
    temp.div(zoom);

    return temp;
}


function angleLerp (a1, a2, t)
{
    let dA = abs(a2 - a1);

    if (TWO_PI - dA < dA)
    {
        if (a1 < a2)
        {
            a1 = lerp(a1, a2 - TWO_PI, t);
        }
        else
        {
            a1 = lerp(a1, a2 + TWO_PI, t)
        }
    }
    else
    {
        a1 = lerp(a1, a2, t);
    }

    return a1 % TWO_PI;
}


function isEmptyObject (obj)
{
    return JSON.stringify(obj) === '{}'
}


function color2array (col)
{
    return [red(col), green(col), blue(col)];
}


// input
let leftMousePressed = false;
let rightMousePressed = false;
const INPUT_KEYS = {
	'SHIFT'  : 16,
	'CONTROL': 17,
	'SPACE'  : 32,
    'ESC'    : 27,
    'TAB'    : 9,
    'RETURN' : 13,
    'ZERO'   : 48,
    'ONE'    : 49,
    'TWO'    : 50,
    'THREE'  : 51,
    'FOUR'   : 52,
    'FIVE'   : 54,
    'SIX'    : 54,
    'SEVEN'  : 55,
    'EIGHT'  : 56,
    'NINE'   : 57,
};
for (let charCode = 65; charCode <= 90; charCode++)
{
	INPUT_KEYS[String.fromCharCode(charCode)] = charCode;
}


// general
function loadTexture (name, fileType) {
	if (fileType == undefined) {fileType = "png"};
	IMG[name] = loadImage(`${PATH_TO_TEXTURES}/${name}.${fileType}`);

    TEXTURE_CONTAINERS[name] = new TextureContainer(IMG[name]);
}

//TODO CHECK IF CORRECT:
function loadAudio (name, fileType) {
	//AUDIO[name] = loadAudio(`${PATH_TO_AUDIO}/${name}.${fileType}`);
}

function loadSpriteAnimationFrames (name, numFrames, duration) {
    ANIM[name] = [];
    let count = "";
    for (let i = 0; i < numFrames; i++)
    {
        count = `${floor(i / 10)}${i % 10}`;
        ANIM[name].push(loadImage(`${PATH_TO_ANIMATIONS}/${name}/${name}${count}.png`));
    }

    TEXTURE_CONTAINERS[name] = new SpriteAnimator(ANIM[name], duration);
}