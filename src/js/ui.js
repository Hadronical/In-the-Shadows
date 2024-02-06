function drawUIElements ()
{
    UIopen = ACTIVEUIELEMENTS.length > 0;

    if (UIopen)
    {
        for (let ui of ACTIVEUIELEMENTS)
        {
            UIELEMENTS[ui].draw();
        }
    }

    if (UIopen)
    {
        UI_cursor.draw();
    }
    else
    {
        UI_reticle.draw();
    }
}


const UIELEMENTS = [];
const ACTIVEUIELEMENTS = [];
let currentUI = 0;
let UIopen = false;
let UI_reticle;
let UI_cursor;
let UI_opt = {
    cellSize: 48,
    gridGutter: 5,
    padding: 3
};

function UIElement ()
{
    this.id = UIELEMENTS.length;
    this.pos = new vec2(0, 0);

    this.draw = () => { return; }

    UIELEMENTS.push(this); 
    return this;
}

function setupUIElements ()
{
    UI_reticle = new UIElement();
    UI_reticle.off = 0;
    UI_reticle.draw = () => {
        UI.push();
        UI.stroke(255);
        UI.strokeWeight(3.5);
        UI_reticle.off = lerp(UI_reticle.off, 5 / PLAYER.recoilControl, TIME_dT * 10);
        UI.line(mouseX-5-UI_reticle.off,mouseY, mouseX-UI_reticle.off,mouseY);
        UI.line(mouseX,mouseY-5-UI_reticle.off, mouseX,mouseY-UI_reticle.off);
        UI.line(mouseX+5+UI_reticle.off,mouseY, mouseX+UI_reticle.off,mouseY);
        UI.line(mouseX,mouseY+5+UI_reticle.off, mouseX,mouseY+UI_reticle.off);
        UI.pop();
    }

    UI_cursor = new UIElement();
    UI_cursor.draw = () => {
        UI.push();
        UI.image(IMG.hand, mouseX-3,mouseY-6);
        UI.pop();
    }

    let UI_inventory = new UIElement();
    UI_inventory.inventory = INVENTORY;
    UI_inventory.draw = () => {
        let cols = 5;
        let rows = ceil(UI_inventory.inventory.length / cols);
        let gridSpace = UI_opt.cellSize + UI_opt.gridGutter;
        let w = UI_opt.padding * 2 + (cols * gridSpace);
        let h = UI_opt.padding * 2 + (rows * gridSpace);

        UI.push();
        UI.translate(W2 - w/2, H2 - h/2);

        UI.fill(150);
        UI.noStroke();
        UI.rect(0,0, w,h);

        UI.rectMode(CORNERS);
        UI.fill(100);
        for (let i = 0; i < UI_inventory.inventory.length; i++)
        {
            UI.push();
            let x = UI_opt.padding + (i % cols) * gridSpace;
            let y = UI_opt.padding + floor(i / cols) * gridSpace;
            UI.translate(x, y);

            UI.rect(0,0, UI_opt.cellSize,UI_opt.cellSize);

            ITEMDICTIONARY.get(UI_inventory.inventory[i].id).drawIcon();
            UI.pop();
        }
        UI.pop();
    }
}


function openUI (id, x,y)
{
    if (ACTIVEUIELEMENTS.includes(id)) { return }

    let e = UIELEMENTS[id];
	e.visible = true;

	e.pos.x = x;
    e.pos.y = y;

    currentUI = ACTIVEUIELEMENTS.length
    ACTIVEUIELEMENTS.push(e.id);
}
function focusUI (id)
{
    if (!ACTIVEUIELEMENTS.includes(id)) { return false; }

    let temp = ACTIVEUIELEMENTS[currentUI];
    ACTIVEUIELEMENTS[currentUI] = ACTIVEUIELEMENTS[id];
    ACTIVEUIELEMENTS[id] = temp;

    return true;
}
function closeCurrentUI ()
{
    ACTIVEUIELEMENTS.splice(currentUI, 1);
    currentUI--;
}

function mouseInUIBounds ()
{

}
function drawInventoryItems ()
{
	currentItem.draw();
}