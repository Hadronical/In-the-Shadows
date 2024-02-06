function Face (i1, i2, normal)
{
	this.i = [i1, i2];
	this.n = normal;
}


//TODO optimization: mesh tracks shadow vertices

let __ID_MESH__ = 0;
const IDMESH = () => { return __ID_MESH__++; }

class Mesh
{
	constructor (x,y, vertices, isStatic, c)
	{
		this.ID = IDMESH();
		MESHES.set(this.ID, this);

		this.PHY_body = MATTER_BODIES.fromVertices(x,y, vertices);
		this.PHY_body.friction = 0;
		this.PHY_body.frictionAir = 0.2;
		MATTER_BODY.setStatic(this.PHY_body, isStatic);
		MATTER_WORLD.add(PHY_WORLD, this.PHY_body);

		this.pos = createVector(x, y);
		this.verts = vertices;
		this.faces = [];
		this.col = c;

		this.a = 0;
		this.dA = 0;

		this.castShadows = true;

		this.geometry_changed = false;
		this.shadowVertsForLight = new Map();

		this.constructFaces();
	}

	constructFaces ()
	{
		for (let i = 0, l = this.verts.length; i < l; i++)
		{
			let i_ = (i + 1) % l;
			let p1 = this.verts[i];
			let p2 = this.verts[i_];
			this.faces.push(new Face(i, i_, getNormal(p1, p2)));
		}
	}

	update ()
	{
		this.translateTo(this.PHY_body.position.x, this.PHY_body.position.y);
		this.a = this.PHY_body.angle;

		if (this.geometry_changed)
		{
			if (this.dA != 0)
			{
				for (let i = 0, l = this.verts.length; i < l; i++)
				{
					let v = this.verts[i];
					let c = cos(this.dA);
					let s = sin(this.dA);

					this.verts[i] = new vec2(
						v.x * c - v.y * s,
						v.x * s + v.y * c
					);
				}
				this.constructFaces();

				this.dA = 0;
			}
		}

		this.draw();
	}

	draw ()
	{
		MAIN.push();
		MAIN.fill(this.col);
		MAIN.noStroke();
		MAIN.translate(this.pos.x, this.pos.y);
		MAIN.beginShape();
		for (let i = 0, l = this.verts.length; i < l; i++)
		{
			MAIN.vertex(this.verts[i].x, this.verts[i].y);
		}
		MAIN.endShape();
		MAIN.pop();
	}

	copy ()
	{
		return new Mesh(this.pos.x, this.pos.y, this.verts);
	}

	shade (light)
	{
		if (this.castShadows == false) { return; }

		SHADOW_BUFFER.push();
		SHADOW_BUFFER.fill(1);
		SHADOW_BUFFER.noStroke();

		// check for existing shadow mesh
		let hasReferenceToLight = this.shadowVertsForLight.has(light.id);
		if (hasReferenceToLight == false)
		{
			this.shadowVertsForLight.set(light.id, {verts:[], flagInside:true});
		}
		let shadow = this.shadowVertsForLight.get(light.id);


		SHADOW_BUFFER.beginShape();

		// compute, draw, and save new shadow mesh for light
		if (!hasReferenceToLight || light.geometry_changed || this.geometry_changed)
		{
			for (let i = 0, l = this.faces.length; i < l; i++)
			{
				let faceVerts = this.faces[i].i;
				let v1 = this.verts[faceVerts[0]].p5();
				let v2 = this.verts[faceVerts[1]].p5();
				let normal = this.faces[i].n;

				let p1 = p5.Vector.add(v1, this.pos);
				let p2 = p5.Vector.add(v2, this.pos);

				let m = midpoint(p1, p2);

				let dir2lightFace = p5.Vector.sub(light.pos, m);
				if (light.type == "directional")
				{
					dir2lightFace = p5.Vector.mult(light.direction, -1);
				}

				let dot = p5.Vector.dot(normal, dir2lightFace) / (dir2lightFace.mag());

				if (dot <= 0)
				{
					let dir2light1 = p5.Vector.sub(p1, light.pos);
					let dir2light2 = p5.Vector.sub(p2, light.pos);
					if (light.type == "directional") {
						dir2light1 = p5.Vector.mult(light.direction, -1);
						dir2light2 = p5.Vector.mult(light.direction, -1);
					}
					p1.add(dir2light1.mult(diag));
					p2.add(dir2light2.mult(diag));
				}
				else
				{
					shadow.flagInside = false;
				}

				if (!this.castShadows)
				{
					p1 = p5.Vector.add(v1, this.pos);
					p2 = p5.Vector.add(v2, this.pos);
				}

				SHADOW_BUFFER.vertex(p1.x, p1.y);
				SHADOW_BUFFER.vertex(p2.x, p2.y);
				shadow.verts.push(new vec2(p1.x, p1.y));
				shadow.verts.push(new vec2(p2.x, p2.y));
			}
		}
		// draw saved shadow mesh for light
		else
		{
			for (let vert of shadow.verts)
			{
				SHADOW_BUFFER.vertex(vert.x, vert.y);
			}
		}


		if (shadow.flagInside == false)
		{
			SHADOW_BUFFER.endShape(CLOSE);
		}
		SHADOW_BUFFER.pop();

		return shadow.inside;
	}


	// static transformation
	translateTo (x, y)
	{
		this.pos.x = x;
		this.pos.y = y;

		this.geometry_changed = true;
	}
	translate (x, y)
	{
		this.translateTo(this.pos.x + x, this.pos.y + y);
	}

	// physics transformation
	move (x, y)
	{
		if (x == 0 && y == 0) { return; }

		MATTER_BODY.setVelocity(this.PHY_body, new vec2(x, y).matter());
	}
	moveTo (x, y)
	{
		if (x == this.PHY_body.position.x && y == this.PHY_body.position.y) { return; }

		MATTER_BODY.setPosition(this.PHY_body, new vec2(x, y).matter());
	}
	moveToPos (pos)
	{
		this.moveTo(pos.x, pos.y);
	}

	rotate (a)
	{
		if (a == 0) { return; }

		this.rotateTo(this.PHY_body.angle + a);
	}
	rotateTo (a)
	{
		if (a == this.PHY_body.angle) { return; }

		this.dA = a - this.a;

		this.PHY_body.angle = a;

		this.geometry_changed = true;
	}


	Destroy() {
		MESHESTODESTROY.push(this.ID);
	}
}

class Projectile extends Mesh
{
	constructor (x, y, dir, spd, life)
	{
		super(x,y, rectVerts(3,3), false, color(255));

		this.shadeFlat = true;
		this.castShadows = false;

		this.PHY_body.friction = 1.0;
		this.PHY_body.frictionAir = 0.01;
		MATTER_WORLD.add(PHY_WORLD, this.PHY_body);

		MATTER_BODY.setVelocity(this.PHY_body, dir.setMag(spd));

		this.lifetime = life;
	}

	update ()
	{
		super.update();

		this.lifetime -= TIME_dT;

		if (this.pos.x > 2 * W || this.pos.y > 2 * H || this.pos.x < -W || this.pos.y < -H || this.lifetime <= 0)
		{
			this.Destroy();
		}
	}
}
// image based mesh
class PhysicalItem extends Mesh
{
    constructor (options)
    {
		let verts = rectVerts(options.textureContainer.resX, options.textureContainer.resY);
		if (options.circular == false)
		{
			verts = rectVerts(options.w, options.h);
		}
		let x = (options.x == undefined) ? (0) : (options.x);
		let y = (options.y == undefined) ? (0) : (options.y);
		super(x,y, verts, options.static, color(255));


		this.itemID = -1;
		this.name = "none";
		this.textureContainer = null;
		this.data = {};
		if (options.isItem)
		{
			this.itemID = options.item.id;
			this.name = options.item.name;

			this.textureContainer = options.item.textureContainer;
			this.data = {...options.item.saveData};
		}
		else
		{
			this.textureContainer = options.textureContainer;
		}


		this.pickupRadius = -1;
		if (options.pickupable)
		{
			this.pickupRadius = options.pRadius;
		}
		if (options.circular)
		{
			this.verts = [];
			MATTER_COMPOSITE.remove(PHY_WORLD, this.PHY_body);

			this.PHY_body = MATTER_BODIES.circle(x,y, options.radius);
			MATTER_BODY.setStatic(this.PHY_body, options.static);
			MATTER_WORLD.add(PHY_WORLD, this.PHY_body);
		}
		this.PHY_body.friction = 1;
		this.PHY_body.frictionAir = 0.3;


		this.updateFunc = () => { return; }
		this.destroyFunc = () => { return; }

		this.castShadows = false;
    }

	setStatic (b)
	{
		this.PHY_body.set
	}

    update ()
	{
		super.update();

		this.updateFunc();
	}
	setUpdate (func)
	{
		this.updateFunc = func;
	}

    draw ()
    {
		if (this.textureContainer == null) { console.error(`${this.name} has no texture container!`); return; }

		MAIN.push();
		MAIN.translate(this.pos.x, this.pos.y);
		MAIN.rotate(this.a);
        this.textureContainer.display();
        MAIN.pop();
	}


	Destroy ()
	{
		this.destroyFunc();

		super.Destroy();
	}
}

let optionsForItemMesh = (itm, pickup, circle) => {
	return {
		isItem:true, item:itm,
		textureContainer:itm.textureContainer,
		static:false,
		pickupable:pickup[0], pRadius:pickup[1],
		circular:circle[0], radius:circle[1],
		w:itm.physicalSize.x, h:itm.physicalSize.y
	};
}
let optionsForEnvironmentMesh = (x,y, obj, circle, size) => {
	return {
		x:x, y:y,
		isItem:false, textureContainer:obj,
		static:true,
		pickupable:false,
		circular:circle, radius:size[0],
		w:size[0], h:size[1],
	};
}


function update_G_BUFFER ()
{
	G_BUFFER.background(0);
	G_BUFFER.fill(255);
	G_BUFFER.stroke(255);

	for (let mesh of MESHLIST)
	{
		if (mesh.castShadows == false) { continue; }

		G_BUFFER.push();
		G_BUFFER.translate(mesh.pos.x, mesh.pos.y);
		G_BUFFER.beginShape();
		for (let j = 0, n = mesh.verts.length; j < n; j++)
		{
			G_BUFFER.vertex(mesh.verts[j].x, mesh.verts[j].y);
		}
		G_BUFFER.endShape();
		G_BUFFER.pop();
	}
}

function midpoint (p1, p2)
{
	return createVector((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
}
function getNormal (p1, p2)
{
	return createVector(p2.y - p1.y, p1.x - p2.x).normalize();
}


const PROPDICTIONARY = new Map();

// factory for PhysicalItem as map props
class Prop
{
	static __ID__ = 0;
    static propID () { return Prop.__ID__++; }

	constructor (nm, options)
	{
		this.id = Prop.propID();
		this.name = nm;
		this.setupFunc = (pItem) => { return; }
		this.interactFunc = null;

		this.options = options;

		PROPDICTIONARY.set(this.id, this);
	}

	instantiate (x, y)
	{
		this.options.x = x;
		this.options.y = y;

		let pItem = new PhysicalItem(this.options);
		pItem.interactable = false;
		if (this.interactFunc != null)
		{
			pItem.interactable = true;
			pItem.interact = this.interactFunc;
		}
		this.setupFunc(pItem);

		return pItem;
	}
}

function setupProps ()
{
	let texContainer;

	//#region campfire
	texContainer = new TextureContainer(IMG.campfire, 24,24);
	let campfire = new Prop("campfire", optionsForEnvironmentMesh(0,0, texContainer, true, [8]));
	campfire.setupFunc = (pItem) => {
		pItem.light = new PointLight(0,0, color(240,180,130), 5.0, 0.12);
		pItem.light.updateFunc = () => {
			pItem.light.translateTo(pItem.pos.x, pItem.pos.y);
			pItem.light.intensity = 10 + random(1,2) * (random() > 0.8);
		}
	}

	//#endregion

	//#region wall light
	texContainer = new TextureContainer(IMG.wallLight, 24,24);
	let wallLight = new Prop("wall light", optionsForEnvironmentMesh(0,0, texContainer, true, [3]));
	wallLight.setupFunc = (pItem) => {
		pItem.light = new AreaLight(0,0, 15, -HALF_PI, color(240,240,240), 5.0,0.15);
		pItem.isOn = true;

		pItem.light.updateFunc = () => {
			pItem.light.translateTo(pItem.pos.x, pItem.pos.y-1);
			pItem.light.intensity = lerp(pItem.light.intensity, (pItem.isOn) ? (5) : (0), 0.9);
		}
		pItem.readState = (state) => {
			pItem.isOn = state;
		}
	}

	//#endregion

	//#region switch

	texContainer = new SpriteAnimator(ANIM.lever, 0, 24,24);
	let lever = new Prop("lever", optionsForEnvironmentMesh(0,0, texContainer, true, [8]));
	lever.setupFunc = (pItem) => {
		pItem.state = false;
		pItem.target = null;
		pItem.setTarget = (obj) => { this.target = obj; }
	}
	lever.interactFunc = (pItem) => {
		pItem.state = !pItem.state;

		pItem.textureContainer.stepFrame();

		if (pItem.target != null)
		{
			pItem.target.readState(pItem.state);
		}
	}

	//#endregion
}
