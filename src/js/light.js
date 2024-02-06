let __ID_LIGHT__ = 0;
let availableIDs = [];
const LIGHTID = () => {
	if (availableIDs[0] != undefined)
	{
		let ID = availableIDs[0];
		availableIDs.splice(0, 1);
		return ID;
	}
	return __ID_LIGHT__++;
}

class Light
{
	constructor (x, y, col, type, i,f)
	{
		this.ID = LIGHTID();
		LIGHTS.set(this.ID, this);

		this.type = type;
		this.pos = createVector(x, y);
		this.color = col;

		this.intensity = i;
		this.falloff = f;

		this.visible = true;

		this.updateFunc = () => { return; };

		this.geometry_changed = false;
	}

	update ()
	{
		if (this.visible == false) { return false; }

		let flagInsideGeometry = false;

		// draw shadow geometry to SHADOW_BUFFER
		for (let mesh of MESHLIST)
		{
			if (mesh.shade(this) == false)
			{
				flagInsideGeometry = true;
				break;
			}
		}

		this.geometry_changed = false;

		this.updateFunc();

		return !flagInsideGeometry;
	}

	getIllumination ()
	{
		if (this.visible && this.intensity > 0)
		{
			LIGHT_BUFFER.background(255);
		}
		else
		{
			LIGHT_BUFFER.background(0);
		}
	}

	setVisible (b)
	{
		this.visible = b;
	}
	toggleVisible ()
	{
		this.visible = !this.visible;
	}

	setItensity (I)
	{
		this.intensity = max(I, 0);
	}

	translateTo (x, y)
	{
		if (x == this.pos.x && y == this.pos.y) { return; }

		this.pos.x = x;
		this.pos.y = y;

		this.geometry_changed = true;
	}


	Destroy ()
	{
		LIGHTSTODESTROY.push(this.ID);
		availableIDs.push(this.ID);
	}
}
class PointLight extends Light
{
	constructor (x, y, col, i,f)
	{
		super(x, y, col, "point", i,f);
	}
}
class ConeLight extends Light
{
	constructor (x, y, angle, aWidth, col, i,f)
	{
		super(x, y, col, "cone", i,f);
		this.rotation = angle;
		this.halfAngularWidth = aWidth / 2;
	}

	getIllumination ()
	{
		LIGHT_BUFFER.background(0);
		LIGHT_BUFFER.push();

		LIGHT_BUFFER.noStroke();
		LIGHT_BUFFER.fill(255);
		let v;
		if (this.visible)
		{
			LIGHT_BUFFER.translate(this.pos.x,this.pos.y);
			LIGHT_BUFFER.beginShape();
			LIGHT_BUFFER.vertex(0, 0);
			v = p5.Vector.fromAngle(this.rotation + this.halfAngularWidth).setMag(diag);
			LIGHT_BUFFER.vertex(v.x, v.y);
			v = p5.Vector.fromAngle(this.rotation - this.halfAngularWidth).setMag(diag);
			LIGHT_BUFFER.vertex(v.x, v.y);
			LIGHT_BUFFER.endShape();
		}

		LIGHT_BUFFER.pop();
	}

	rotateTo (a)
	{
		this.rotation = a;

		this.geometry_changed = true;
	}
}
class AreaLight extends Light
{
	//---------------<size>----------------
	//----<size/2>----(x,y)----<size/2>----
	constructor (x, y, size, angle, col, i,f)
	{
		super(x, y, col, "area", i,f);
		this.halfSize = size * 0.5;
		this.rotation = angle;
		this.halfAngularOverflow = atan2(size, 5);
	}

	getIllumination ()
	{
		LIGHT_BUFFER.background(0);
		LIGHT_BUFFER.push();

		LIGHT_BUFFER.noStroke();
		LIGHT_BUFFER.fill(255);
		let v1,v2;
		if (this.visible)
		{
			LIGHT_BUFFER.translate(this.pos.x,this.pos.y);
			LIGHT_BUFFER.beginShape();

			v1 = p5.Vector.fromAngle(this.rotation + HALF_PI).setMag(this.halfSize);
			v2 = p5.Vector.fromAngle(this.rotation - HALF_PI).setMag(this.halfSize);
			LIGHT_BUFFER.vertex(v1.x, v1.y);
			LIGHT_BUFFER.vertex(v2.x, v2.y);

			v1 = p5.Vector.fromAngle(this.rotation - this.halfAngularOverflow).setMag(diag);
			v2 = p5.Vector.fromAngle(this.rotation + this.halfAngularOverflow).setMag(diag);
			LIGHT_BUFFER.vertex(v1.x, v1.y);
			LIGHT_BUFFER.vertex(v2.x, v2.y);
			
			LIGHT_BUFFER.endShape();
		}

		LIGHT_BUFFER.pop();
	}
}
class DirectionalLight extends Light
{
	constructor (dir, col, i,f)
	{
		super(0, 0, col, "directional", i,f);
		this.direction = dir;
	}
}



function renderShadows ()
{
	SHADOW.blendMode(ADD);

	for (let lightID of LIGHTIDs)
	{
		let light = LIGHTS.get(lightID);

		SHADOW_BUFFER.blendMode(BLEND);
		SHADOW_BUFFER.background(0);
		SHADOW_BUFFER.blendMode(ADD);

		if (light.update() == false) { continue; }
		
		light.getIllumination();

		let col = color2array(light.color);

		SHADOW.shader(SHADER_LIGHTING);
		SHADER_LIGHTING.setUniform('uResolution', [W, H]);
		SHADER_LIGHTING.setUniform('buffer_main', MAIN);
		SHADER_LIGHTING.setUniform('buffer_geometry', G_BUFFER);
		SHADER_LIGHTING.setUniform('buffer_shadow', SHADOW_BUFFER);
		SHADER_LIGHTING.setUniform('buffer_light', LIGHT_BUFFER);
		SHADER_LIGHTING.setUniform('light_pos', [light.pos.x, light.pos.y]);
		SHADER_LIGHTING.setUniform('light_intensity', light.intensity);
		SHADER_LIGHTING.setUniform('light_color', [col[0]/255,col[1]/255,col[2]/255]);
		SHADER_LIGHTING.setUniform('light_falloff', light.falloff);
		SHADOW.rect(-W/2,-H/2, W,H);
	}
}