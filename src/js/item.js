/*
TODO ideas:
- pick up PhysicalItem as Item
*/

const ITEMDICTIONARY = new Map();

class Item
{
    static __ID__ = -1;
    static itemID () { return Item.__ID__++; }

    static equipItemTo (item, obj, data)
    {
        item.setOwner(obj);

        new floatingText(`${item.name}`, W2,H2-20, -20);

        if (isEmptyObject(data)) { return; }

        item.equip(data);
    }
    static unequipItemFrom(item, obj)
    {
        item.unequip();

        return item.saveData;
    }

    constructor (name, textureContainer, corner,offX,offY, coolDown, handling)
    {
        this.id = Item.itemID();

        this.name = name;
        this.icon = {center:new vec2(0,0), size:new vec2(1,1)};

        this.offset = new vec2(offX, offY);

        this.textureContainer = null;
        if (textureContainer != null)
        {
            this.textureContainer = textureContainer;
            if (corner)
            {
                this.textureContainer.offX = 0;
                this.textureContainer.offY = -this.textureContainer.resY;
            }
    
            this.textureContainer.offX += this.offset.x;
            this.textureContainer.offY += this.offset.y;
        }

        this.owner = null;

        this.pos = createVector(0, 0);
        this.rotation = 0;
        this.handling = (handling < 1) ? (1) : (handling);

        this.canUse = true;
        this.T = coolDown;
        this.t = 0;

        this.useFunc = () => { return; }
        this.updateFunc = () => { return; }
        this.setupPhysicsItem = (pItem) => { return; }

        this.saveData = {};

        this.physicalSize = new vec2(0, 0);

        ITEMDICTIONARY.set(this.id, this);
    }

    setOwner (obj)
    {
        this.owner = obj;
    }

    setIcon (x,y, w,h)
    {
        this.icon.center.x = x;
        this.icon.center.y = y;
        this.icon.size.x = w;
        this.icon.size.y = h;
    }

    update ()
    {
        this.t -= TIME_dT;
        
        this.canUse = (this.t <= 0);

        // get current item rotation/direction
        if (this.owner != null)
        {
            this.pos = p5.Vector.add(this.owner.pos, rotateVecCW(this.owner.hand, this.owner.a));
            this.rotation = this.owner.a;
            
            this.updateFunc(this.owner);
        }
    }
    setUpdate (func)
    {
        this.updateFunc = func;
    }

    draw ()
    {
        if (this.textureContainer == null) { return; }

        MAIN.push();
        MAIN.translate(this.pos.x, this.pos.y);
        MAIN.rotate(this.rotation);
        if (this.rotation > HALF_PI && this.rotation < 3 * HALF_PI)
        {
            MAIN.scale(1, -1);
        }
        this.textureContainer.display();
        MAIN.pop();
    }
    drawIcon ()
    {
        if (this.image == null) { return; }

        UI.push();
        UI.imageMode(CENTER);

        //UI.translate(this.icon.center.x, this.icon.center.y);
        UI.scale(this.icon.size.x, this.icon.size.y);

        UI.image(
            this.textureContainer.image,
            UI_opt.cellSize/2,UI_opt.cellSize/2,
            UI_opt.cellSize,UI_opt.cellSize);
        UI.pop();
    }

    use ()
    {
        if (!this.canUse) { return; }
        this.t = this.T;

        console.log(`used item: ${this.name}`);

        this.useFunc();
    }
    setUse (func)
    {
        this.useFunc = func;
    }

    equip (data) {}
    unequip () {}

    inspect (txt)
    {
        if (txt == undefined) txt = this.name;

        new floatingText(this.name, W2, H2-15, -20);
    }

    toPhysicsItem ()
    {
        let pItem = new PhysicalItem(optionsForItemMesh(this, [true,24], [false]));

        this.setupPhysicsItem(pItem);

        return pItem;
    }
}
class Weapon extends Item
{
    constructor (name, texContainer, offX,offY, muzzleX,muzzleY, coolDown, handling)
    {
        super(name, texContainer, true,offX,offY, coolDown, handling);

        this.muzzle = createVector(offX + muzzleX, offY + muzzleY);

        // firing settings
        this.maxAmmo = 0;
        this.ammo = 0;
        this.reloadTime = 0;
        this.reloadElapsed = 0;
        this.recoil = 0.01;
        this.jamChance = 0.01;

        this.isReloading = false;

        this.setUse(this.fire);
        this.setUpdate(this.weaponUpdate);
    }

    firingSetup (ammo, reloadTime, bulletSpd, recoil, jamProb)
    {
        this.maxAmmo = ammo;
        this.ammo = ammo;

        this.bulletSpeed = bulletSpd;

        this.reloadTime = reloadTime;
        this.reloadElapsed = this.reloadTime;

        this.recoil = recoil * 0.01;
        this.jamChance = jamProb;
    }

    weaponUpdate ()
    {
        this.reloadElapsed -= TIME_dT;

        let coolDownFinished = (this.t <= 0);
        let reloadFinished = (this.reloadElapsed <= 0);
        let hasAmmo = (this.ammo > 0);
        
        this.canUse = (coolDownFinished && !this.isReloading && hasAmmo);

        if (reloadFinished && this.isReloading)
        {
            this.reload();
        }
    }

    draw ()
    {
        super.draw();
    }
    drawIcon ()
    {
        super.drawIcon(2 * UI_opt.cellSize, UI_opt.cellSize);
    }


    fire ()
    {
        this.ammo--;

        if (random() < this.jamChance)
        {
            this.ammo = -1;
        }

        let muzzlePos = p5.Vector.add(this.pos, rotateVecCW(this.muzzle, this.rotation));
        muzzleFlash.setVisible(true);
        muzzleFlashMS = random(50,80);
        muzzleFlash.pos = muzzlePos;
    
        // scaling
        let dir = p5.Vector.fromAngle(this.rotation);
        new Projectile(
            muzzlePos.x, muzzlePos.y,
            dir, this.bulletSpeed, 2.5
        );
    
        MATTER_BODY.applyForce(this.owner.PHY_body, this.owner.pos, dir.setMag(-this.recoil * TIME_dT * 0.1));
        this.owner.rotate(15 * random(-this.recoil, this.recoil) * this.owner.recoilControl);
    }

    reloadStart ()
    {
        this.reloadElapsed = this.reloadTime;
        this.isReloading = true;
    }
    reload ()
    {
        if (!this.isReloading) { return; }

        this.ammo = this.maxAmmo;
        this.isReloading = false;

        new floatingText(`ready`, W2, H2-20, -20);
    }

    equip (data)
    {
        this.ammo = data.ammo;
    }
    unequipFrom (obj)
    {
        this.saveData = {ammo: this.ammo};
    }

    inspect ()
    {
        let ammoCondition = "";
        let ammoPercent = this.ammo / this.maxAmmo;
        switch (true)
        {
            case ammoPercent == 0: {
                ammoCondition = "empty";
                break;
            }
            case ammoPercent > 0 && ammoPercent < 0.4: {
                ammoCondition = "almost empty";
                break;
            }
            case ammoPercent > 0.4 && ammoPercent < 0.6: {
                ammoCondition = "almost half";
                break;
            }
            case ammoPercent > 0.6 && ammoPercent < 1: {
                ammoCondition = "almost full";
                break;
            }
            case ammoPercent == 1: {
                ammoCondition = "full";
                break;
            }
            case ammoPercent < 0: {
                ammoCondition = "jammed";
            }
        }

        super.inspect(`${ammoCondition}`);
    }

    toPhysicsItem ()
    {
        let pItem = super.toPhysicsItem();
        pItem.resolution.x = 48;
        pItem.offset.x = 24;
    }
}


function setupItems ()
{
    let texContainer;

    // hands
    new Item("hands", null, false,0,0, 0, 1);

    //-----ITEMS
    //#region flashlight

    texContainer = new TextureContainer(IMG.flashlight, 24,24);
    let flashlight = new Item("flashlight", texContainer, false,8,0, 0.3, 1);
    flashlight.setIcon(0,0, 1.2,1.2);

    flashlight.light = new ConeLight(0,0, 0, PI/3, color(230, 220, 130), 7.0,0.05);
    flashlight.lightOffset = new vec2(5, 0);
    flashlight.light.setVisible(false);

    flashlight.equip = (data) => {
        flashlight.light.visible = data.on;
        flashlight.battery = data.battery;
    }
    flashlight.unequip = () => {
        flashlight.saveData = {on: flashlight.light.visible, battery: flashlight.battery};
        flashlight.light.setVisible(false);
    }

    flashlight.battery = 180;

    flashlight.setUse(() => {
        flashlight.light.toggleVisible();
    });
    flashlight.setUpdate((obj) => {
        flashlight.battery -= TIME_dT;
        if (flashlight.battery <= 0)
        {
            flashlight.canUse = false;
            flashlight.light.setVisible(false);
        }

        flashlight.light.intensity = 3 + 1 * (noise(TIME_MS / 10) > 0.3);

        if (obj == null) { return; }

        flashlight.light.rotateTo(flashlight.rotation);
        let offset = createVector(flashlight.offset.x + flashlight.lightOffset.x, flashlight.offset.y + flashlight.lightOffset.y);
        let lightPos = p5.Vector.add(flashlight.pos, rotateVecCW(offset, flashlight.rotation));
        flashlight.light.translateTo(lightPos.x, lightPos.y);
    });

    //#endregion
    //#region glowstick

    texContainer = new TextureContainer(IMG.glowstick, 24,24);
    let glowstick = new Item("glowstick", texContainer, false,10,0, 0, 1);
    glowstick.setIcon(0,0, 1.2,1.2);
    glowstick.physicalSize = new vec2(3, 5);
    
    let possibleColors = [
        color( 80, 255, 255),
        color(255, 120, 120),
        color( 80,  80, 255),
    ];
    glowstick.light = new PointLight(0,0, random(possibleColors), 1,0.2);
    glowstick.lightOffset = new vec2(0, 0);
    glowstick.light.setVisible(false);
    glowstick.lit = false;
    glowstick.fuse = glowStickDuration;

    glowstick.equip = (data) => {
        glowstick.light.setVisible(data.lit);
        glowstick.fuse = data.fuse;
    }
    glowstick.unequip = () => {
        glowstick.saveData = {lit: glowstick.light.visible, fuse: glowstick.fuse};
        glowstick.light.setVisible(false);
    }
    glowstick.setupPhysicsItem = (pItem) => {
        if (glowstick.lit)
        {
            pItem.light = new PointLight(0,0, random(possibleColors), 1,0.2);
            pItem.fuse = glowstick.fuse;

            pItem.updateFunc = () => {
                pItem.fuse -= TIME_dT;
                if (pItem.fuse <= 0)
                {
                    pItem.light.setVisible();
                }
                pItem.light.setItensity(5 * acceleratingFalloff(glowStickDuration - pItem.fuse, glowStickDuration,6));
                pItem.light.translateTo(pItem.pos.x, pItem.pos.y);
            }
        }
    }

    glowstick.setUse(() => {
        glowstick.lit = true;
        glowstick.light.setVisible(true);
    });
    glowstick.setUpdate((obj) => {
        if (glowstick.lit)
        {
            glowstick.fuse -= TIME_dT;
        }
        if (glowstick.lit && glowstick.fuse <= 0)
        {
            glowstick.canUse = false;
            glowstick.light.setVisible(false);
        }
        glowstick.light.setItensity(5 * acceleratingFalloff(glowStickDuration - glowstick.fuse, glowStickDuration,6));
        let offset = createVector(glowstick.offset.x + glowstick.lightOffset.x, glowstick.offset.y + glowstick.lightOffset.y);
        let lightPos = p5.Vector.add(glowstick.pos, rotateVecCW(offset, glowstick.rotation));
        glowstick.light.translateTo(lightPos.x, lightPos.y);
    });

    //#endregion
    //TODO #region rock

    let rock = new Item("rock", null, false,10,0, 0, 1);
    rock.setIcon(0,0, 1.2,1.2);
    rock.physicalSize = new vec2(5, 5);

    rock.setUse(() => {
        new floatingText("...", W2,H2+20, 20);
    });
    
    //#endregion
    //TODO #region backpack

    let bag = new Item("backpack", null, false,0,0, 0, 1);
    bag.capacity = 10;
    bag.inventory = Array(bag.capacity).fill({id: -1, data: {}});

    //#endregion

    //-----WEAPONS
    //#region pistol

    texContainer = new TextureContainer(IMG.pistol, 48,24);
    let pistol = new Weapon("pistol", texContainer, 2,5, 10,-4, 1, 1.2);
    pistol.firingSetup(6, 1.2, 2.8, 0.2, 0.01);
    pistol.setIcon(12,-4, 2.4,1.2);

    //#endregion
    //#region assault rifle

    texContainer = new TextureContainer(IMG.assaultRifle, 48,24);
    let ar = new Weapon("assault rifle", texContainer, -10,5, 25,-6, 0.14, 2, 2);
    ar.firingSetup(25, 2, 3.3, 2, 0.02);
    ar.setIcon(4,-4, 1.6,0.8);

    //#endregion
}

function equipItem (i)
{
    if (i == currentInventorySlot) { return; }

    // old item
    INVENTORY[currentInventorySlot].data = Item.unequipItemFrom(currentItem, PLAYER);

    // new item
    currentInventorySlot = i;
    let itemID = INVENTORY[currentInventorySlot].id;
    currentItem = ITEMDICTIONARY.get(itemID);

    console.log(`switched to item: ${currentItem.name}`);

    Item.equipItemTo(currentItem, PLAYER, INVENTORY[currentInventorySlot].data);
}

function addToInventory (itemID, dat)
{
    let succeeded = false;

    let i = 0;
    for (; i < 5; i++)
    {
        if (INVENTORY[i].id == -1)
        {
            INVENTORY[i] = {id: itemID, data: dat};
            succeeded = true;
            break;
        }
    }

    return succeeded;
}
function removeFromInventory (slot)
{
    if (INVENTORY[slot].id == -1) { return; }

    Item.unequipItemFrom(currentItem, PLAYER);

    INVENTORY[slot] = {id: -1, data: {}};

    currentInventorySlot = slot;
    let itemID = INVENTORY[currentInventorySlot].id;
    currentItem = ITEMDICTIONARY.get(itemID);
}

function pickupItem () {}
function throwItem ()
{
    if (INVENTORY[currentInventorySlot].id == -1) { return; }

    let pItem = currentItem.toPhysicsItem();

    let throwDir = p5.Vector.fromAngle(PLAYER.a);
    pItem.moveToPos(p5.Vector.add(currentItem.pos, throwDir.setMag(10)));
    MATTER_BODY.applyForce(pItem.PHY_body, pItem.pos, throwDir.setMag(0.001 * TIME_dT * throwCharge / currentItem.handling));
    pItem.PHY_body.angle = random(0, TWO_PI);

    removeFromInventory(currentInventorySlot);
}