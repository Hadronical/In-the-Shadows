// TODO! make this work with the rest of the code

const space = 10;
const minAngleDiff = Math.PI / 2;

let p_beg, p_end;
let currentPath = [];

const POLYGONS = [];

let visibilityNodes = [];
let N = 0;
let graph = [];

let mode = 0;


function setup() {
    createCanvas(400, 400);

    // setup polygons
    new polygon(70, 140, [
        vert(-15, -15),
        vert(15, -15),
        vert(15, 15),
        vert(-15, 15)
    ]);
    new polygon(200, 100, [
        vert(0, 15),
        vert(-20, 0),
        vert(20, 0)
    ]);

    let n = 10;
    let verts = [];
    let deg = randomIntervals(0, TWO_PI, n);
    for (let a of deg) {
        let r = random(30, 40);
        verts.push({ x: r * cos(a), y: r * sin(a) });
    }
    new polygon(240, 280, verts);

    // source and end
    p_beg = { x: 0, y: 0 };
    p_end = { x: 0, y: 0 };


    drawingContext.lineCap = "round";
}

function draw() {
    background(255);

    push();
    fill(100, 120, 240, 120);
    noStroke();
    rect(0, 0, width, height);
    pop();

    switch (mode) {
        case 0: break;
        case 1: {
            p_beg.x = mouseX;
            p_beg.y = mouseY;
            break;
        }
        case 2: {
            p_end.x = mouseX;
            p_end.y = mouseY;
            break;
        }
    }

    // draw polygons and visibility field
    for (let poly of POLYGONS) {
        poly.drawVisNodes();
    }
    for (let poly of POLYGONS) {
        poly.draw();
    }

    // draw begining and end
    push();
    noStroke();

    fill(80, 240, 80);
    circle(p_beg.x, p_beg.y, 10);

    fill(240, 80, 80);
    circle(p_end.x, p_end.y, 10);
    pop();

    // move towards next pos in path
    if (currentPath.length > 1) {
        let nextPos = visibilityNodes[currentPath[1]];
        let v = fromTo(p_beg, nextPos);
        let vel = p5.Vector.setMag(v, 1);
        p_beg.x += vel.x;
        p_beg.y += vel.y;

        if (v.mag() < 1) {
            currentPath.splice(1, 1);
        }
    }

    // draw path
    push();
    noFill();
    stroke(240, 240, 80, 100);
    strokeWeight(3.5);
    beginShape();
    for (let i of currentPath) {
        vertex(visibilityNodes[i].x, visibilityNodes[i].y);
    }
    endShape();
    pop();
}

function keyPressed() {
    switch (keyCode) {
        case RETURN: {
            switchMode(3);
            break;
        }
        case 83: {
            saveCanvas("vg", "jpg");
            break;
        }
    }
}
function mousePressed() {
    switchMode((mode + 1) % 3);
}
function switchMode(m) {
    mode = m;
    if (mode == 0) {
        // recreate visibilityNodes array
        getVisibilityNodes();
        // recreate graph
        createGraph();

        currentPath = dijkstra();
    }
}



function getVisibilityNodes() {
    visibilityNodes = [p_beg];
    for (let poly of POLYGONS) {
        visibilityNodes = visibilityNodes.concat(poly.visNodes);
    }
    visibilityNodes.push(p_end);

    N = visibilityNodes.length;
}

function vertsEqual(v1, v2) {
    return v1.x == v2.x && v1.y == v2.y;
}
function vertsDist(v1, v2) {
    let dx = v2.x - v1.x;
    let dy = v2.y - v1.y;
    return sqrt(dx * dx + dy * dy);
}
function createGraph() {
    graph = new Array(N).fill(0).map(x => new Array(N).fill(0));

    for (let i = 0; i < N; i++) {
        for (let j = i; j < N; j++) {
            if (i == j) { continue; }

            let dist = vertsDist(visibilityNodes[i], visibilityNodes[j]);
            if (vertVisible(i, j) == false) {
                dist = Infinity;
            }
            graph[i][j] = dist;
            graph[j][i] = dist;
        }
    }
}

function calculatePath(parents) {
    let path = [parents.length - 1];
    let prev = parents[parents.length - 1];

    while (prev != -1) {
        path.unshift(prev);
        prev = parents[prev];
    }

    return path;
}
function dijkstra(src) {
    // keep track of visited vertices to avoid a revisit
    let visited = new Array(N).fill(false);
    // theoretical maximum value of our cost function = 1e7
    // which will be filled with actual values later
    let shortest = new Array(N).fill(Infinity);
    // store node parents (previous node in an optimal path)
    // no parent = -1
    let parents = new Array(N).fill(-1);

    // set p_beg as visited
    shortest[src] = 0;

    for (let i = 0; i < N; i++) {
        // find nearest vertex u, that was not visited
        let u = -1;
        minDist = Infinity;
        for (let j = 0; j < N; j++) {
            if (visited[j] == false && shortest[j] < minDist) {
                u = j;
                minDist = shortest[j];
            }
        }

        // if there is no nearest vertex, we are done
        if (u == -1) { break; }

        // mark u as visited
        visited[u] = true;

        for (let v = 0; v < N; v++) {
            if (visited[v] == false && graph[u][v] < Infinity && shortest[u] + graph[u][v] < shortest[v]) {
                // if not visited v AND u can reach v AND (src -> u -> v) < (src -> v)
                // set (src -> u -> v) to the new shortest (src -> v)
                shortest[v] = shortest[u] + graph[u][v];
                // then the parent of v is u
                parents[v] = u
            }
        }
    }

    return calculatePath(parents);
}


class polygon {
    constructor(x, y, verts) {
        this.pos = createVector(x, y);
        this.vertices = verts;

        this.normals = [];

        this.visNodes = [];
        this.visFaces = [];

        this.calculateNormals();
        this.calculateVisibilityPolygon();

        POLYGONS.push(this);
    }

    calculateNormals() {
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = (i + 1) % l;

            let vi = vector(this.vertices[i]);
            let vj = vector(this.vertices[j]);

            this.normals.push(rotateVec90(p5.Vector.sub(vi, vj).normalize()));
        }
    }

    calculateVisibilityPolygon() {
        let tempVisFaceVerts = [];

        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let v = vector(this.vertices[i]);

            let n1 = this.normals[(l - 1 + i) % l];
            let n2 = this.normals[i];

            let N1 = p5.Vector.mult(n1, space);
            let N2 = p5.Vector.mult(n2, space);
            let N12 = midArc(N1, N2, space);

            v.add(this.pos);

            let isConvex = (vecCrossMag(n1, n2) >= 0);
            let largeAngleDiff = (p5.Vector.angleBetween(n1, n2) > minAngleDiff);

            if (isConvex && largeAngleDiff) {
                this.addVisNode(p5.Vector.add(v, N1));
                this.addVisNode(p5.Vector.add(v, N12));
                this.addVisNode(p5.Vector.add(v, N2));

                tempVisFaceVerts.push(p5.Vector.add(v, N1.mult(0.9)));
                tempVisFaceVerts.push(p5.Vector.add(v, N12.mult(0.9)));
                tempVisFaceVerts.push(p5.Vector.add(v, N2.mult(0.9)));
            }
            else {
                this.addVisNode(p5.Vector.add(v, N12));

                tempVisFaceVerts.push(p5.Vector.add(v, N12.mult(0.9)));
            }
        }

        for (let i = 0, l = tempVisFaceVerts.length; i < l; i++) {
            let j = (i + 1) % l;

            let vi = tempVisFaceVerts[i];
            let vj = tempVisFaceVerts[j];

            this.visFaces.push(new lineSegHelper(
                { x: vi.x, y: vi.y },
                { x: vj.x, y: vj.y }
            ));
        }
    }
    addVisNode(vec, temp) {
        this.visNodes.push(vec2vert(vec));
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        fill(180);
        stroke(0);
        beginShape();
        for (let vert of this.vertices) {
            vertex(vert.x, vert.y);
        }
        endShape(CLOSE);
        pop();
    }

    drawVisNodes() {
        push();
        fill(255);
        stroke(80, 120, 240, 200);
        strokeWeight(2);
        beginShape();
        for (let vn of this.visNodes) {
            vertex(vn.x, vn.y);
        }
        endShape(CLOSE);
        pop();
    }
}

function vert(x, y) {
    return { x: x, y: y };
}
function fromTo(v1, v2) {
    return createVector(
        v2.x - v1.x,
        v2.y - v1.y
    );
}

function vector(vert) {
    return createVector(vert.x, vert.y);
}
function vec2vert(vec) {
    return { x: vec.x, y: vec.y };
}
function vecAdd(...V) {
    let vec = createVector(0, 0);
    for (let v of V) {
        vec.x += v.x;
        vec.y += v.y;
    }
    return vec;
}
function vecCrossMag(a, b) {
    return a.x * b.y - a.y * b.x;
}

function midpoint(a, b) {
    return createVector((a.x + b.x) / 2, (a.y + b.y) / 2);
}
function midArc(a, b, magnitude) {
    return midpoint(p5.Vector.normalize(a), p5.Vector.normalize(b)).setMag(magnitude);
}

function rotateVec90(vec) {
    return createVector(-vec.y, vec.x);
}
function vecRotateVec(a, b) {
    let mag = b.mag();
    return createVector(
        (a.x * b.x - a.y * b.y) / mag,
        (a.x * b.y + a.y * b.x) / mag
    );
}

function vertVisible(i, j) {
    let ls = new lineSegHelper(visibilityNodes[i], visibilityNodes[j]);

    for (let poly of POLYGONS) {
        if (linesgIntersectVisiblePolygon(ls, poly)) {
            return false;
        }
    }

    return true;
}
function linesgIntersectVisiblePolygon(ls, poly) {
    let flagIntersects = false;

    for (let face of poly.visFaces) {
        if (ls.intersects(face)) {
            flagIntersects = true;
            break;
        }
    }

    return flagIntersects;
}
function lineSegHelper(a, b) {
    this.a = a;
    this.b = b;
    this.diff = {
        x: b.x - a.x,
        y: b.y - a.y
    };
    this.temp = a.x * b.y - a.y * b.x;

    this.intersects = (other) => {
        return linesegIntersectLine(this, other) && linesegIntersectLine(other, this);
    }

    this.sideOfPoint = (p) => {
        return Math.sign(this.diff.x * p.y - this.diff.y * p.x + this.temp);
    }
}
function linesegIntersectLine(l1, l2) {
    let t1 = l1.sideOfPoint(l2.a);
    let t2 = l1.sideOfPoint(l2.b);

    // l2 points on same side of l1 => lines not interesecting
    if (t1 == t2) { return false; }
    // otherwise lines intecting
    return true;
}

function vertDist(a, b) {
    let x = a.x - b.x;
    let y = a.y - b.y;
    return sqrt(x * x, y * y);
}

function randomIntervals(min, max, n) {
    let res = [];

    let d = (max - min) / n;
    for (let i = 0; i < n; i++) {
        res.push(random(i * d, (i + 1) * d));
    }

    return res;
}



