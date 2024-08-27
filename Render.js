////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes.
////////////////////////////////////////////////////////////////////////

var gl;
var color;
var matrixStack = [];

// Model matrix (mMatrix) transforms objects from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;

var aPositionLocation;
var uColorLoc;

var animation;

// Back and forth motion parameters for the boat.
let translationX = 0;
const translationSpeed = 0.003;
const translationRange = 0.7;
let direction = 1;

// Rotation parameters for the windmill and sun.
let rotationAngle = 0.0;
const rotationSpeed = 0.01;

// Circle drawing parameters.
const numSegments = 50; // Number of segments for the circle.
const angleIncrement = (Math.PI * 2) / numSegments;

var mode = 'Solid';  // Drawing mode (Solid, Wireframe, Point).

// Vertex Shader code to handle position data and transformations.
const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
    gl_Position = uMMatrix * vec4(aPosition, 0.0, 1.0);
    gl_PointSize = 6.0;
}`;

// Fragment Shader code to handle color data.
const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 color;

void main() {
    fragColor = color;
}`;

// Pushes a copy of the current matrix onto the matrix stack.
function pushMatrix(stack, m) {
    var copy = mat4.create(m);
    stack.push(copy);
}

// Pops the most recent matrix off the matrix stack.
function popMatrix(stack) {
    if (stack.length > 0) {
        return stack.pop();
    } else {
        console.log("Stack is empty. No matrix to pop!");
    }
}

// Converts degrees to radians for angle calculations.
function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

// Compiles and returns a vertex shader.
function vertexShaderSetup(vertexShaderCode) {
    const shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

// Compiles and returns a fragment shader.
function fragmentShaderSetup(fragShaderCode) {
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

// Initializes shaders and returns the shader program.
function initShaders() {
    const shaderProgram = gl.createProgram();
    const vertexShader = vertexShaderSetup(vertexShaderCode);
    const fragmentShader = fragmentShaderSetup(fragShaderCode);

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // Check for linking errors and log them if any.
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }

    gl.useProgram(shaderProgram);

    return shaderProgram;
}

// Initializes WebGL context and sets viewport dimensions.
function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

// Initializes the buffer for a square's vertex positions and indices.
function initSquareBuffer() {
    // Vertex positions for the square.
    const sqVertices = new Float32Array([
        0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;

    // Indices for the square's vertices to draw it as two triangles.
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
}

// Draws a square with the specified color and transformation matrix.
function drawSquare(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // Bind and set up the vertex position buffer for the square.
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.vertexAttribPointer(aPositionLocation, sqVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Bind the index buffer and set the color for the square.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.uniform4fv(uColorLoc, color);

    // Draw the square based on the current mode.
    if (mode === 'Solid') {
        gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (mode === 'Wireframe') {
        gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (mode === 'Point') {
        gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// Initializes the buffer for a triangle's vertex positions and indices.
function initTriangleBuffer() {
    // Vertex positions for the triangle.
    const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
    triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    triangleBuf.itemSize = 2;
    triangleBuf.numItems = 3;

    // Indices for the triangle's vertices.
    const triangleIndices = new Uint16Array([0, 1, 2]);
    triangleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    triangleIndexBuf.itemsize = 1;
    triangleIndexBuf.numItems = 3;
}

// Draws a triangle with the specified color and transformation matrix.
function drawTriangle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // Bind and set up the vertex position buffer for the triangle.
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.vertexAttribPointer(aPositionLocation, triangleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // Bind the index buffer and set the color for the triangle.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // Draw the triangle based on the current mode.
    if (mode === 'Solid') {
        gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (mode === 'Wireframe') {
        gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (mode === 'Point') {
        gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// Initializes the buffer for a circle's vertex positions and indices.
function initCircleBuffer() {
    const positions = [0, 0]; // Center of the circle.

    // Calculate the positions of the circle's perimeter.
    for (let i = 0; i < numSegments; i++) {
        const angle = angleIncrement * i;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        positions.push(x, y);
    }

    const circleVertices = new Float32Array(positions);
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
    circleBuf.itemSize = 2;
    circleBuf.numItems = numSegments + 1;

    // Create indices to draw the circle.
    const indices = [0, 1, numSegments];
    for (let i = 0; i < numSegments; i++) {
        indices.push(0, i, i + 1);
    }

    const circleIndices = new Uint16Array(indices);
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = indices.length;
}

// Draws a circle with the specified color and transformation matrix.
function drawCircle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // Bind and set up the vertex position buffer for the circle.
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.vertexAttribPointer(aPositionLocation, circleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // Bind the index buffer and set the color for the circle.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // Draw the circle based on the current mode.
    if (mode === 'Solid') {
        gl.drawElements(gl.TRIANGLES, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (mode === 'Wireframe') {
        gl.drawElements(gl.LINE_LOOP, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (mode === 'Point') {
        gl.drawElements(gl.POINTS, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the rays of the sun
function initRayBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // taking only 8 segments
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2) * i / 8;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const rayVertices = new Float32Array(positions);
    rayBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.bufferData(gl.ARRAY_BUFFER, rayVertices, gl.STATIC_DRAW);
    rayBuf.itemSize = 2;
    rayBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 0; i < 8; i++) {
      indices.push(0, i+1);
    }

    // buffer for point indices
    const rayIndices = new Uint16Array(indices);
    rayIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rayIndices, gl.STATIC_DRAW);
    rayIndexBuf.itemsize = 1;
    rayIndexBuf.numItems = indices.length;
}

function drawRays(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.vertexAttribPointer(aPositionLocation, rayBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 'Point') {
        gl.drawElements(gl.POINTS, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // the rays are lines even in "solid" view
    else {
        gl.drawElements(gl.LINE_STRIP, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the blades of the windmill (easier to rotate)
function initFanBladesBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // based on manual calculations
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2) * i / 16;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const bladeVertices = new Float32Array(positions);
    bladeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, bladeVertices, gl.STATIC_DRAW);
    bladeBuf.itemSize = 2;
    bladeBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 1; i < 16; i=i+4) {
      indices.push(0, i, i+1);
    }

    // buffer for point indices
    const bladeIndices = new Uint16Array(indices);
    bladeIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bladeIndices, gl.STATIC_DRAW);
    bladeIndexBuf.itemsize = 1;
    bladeIndexBuf.numItems = indices.length;
}

function drawFanBlades(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.vertexAttribPointer(aPositionLocation, bladeBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 'Solid') {
        gl.drawElements(gl.TRIANGLE_FAN, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'Wireframe') {
        gl.drawElements(gl.LINE_LOOP, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'Point') {
        gl.drawElements(gl.POINTS, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

function drawSky() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];  // sky blue colour
    // local translation operation for the square
    mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// The rotation angle is taken as input for animation
function drawSun(rotationAngle) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.68, 0.84, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.09, 0.09, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.68, 0.84, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.135, 0.135, 1.0]);
    // rotation of the circle for animation
    mMatrix = mat4.rotate(mMatrix, rotationAngle, [0, 0, 1]);
    drawRays(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCloud() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.7, 0.7, 0.7, 1.0];
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.82, 0.55, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.23, 0.13, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    color = [0.9, 0.9, 0.9, 1.0];
    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.6, 0.514, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.17, 0.095, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    color = [0.7, 0.7, 0.7, 1.0];
    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.39, 0.515, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.09, 0.055, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}


// draw function for star
function drawStar(tx, ty, s_x, s_y, angle, size) {
    /*
    tx : Translation along X axis for the star
    ty : Translation along Y axis for the star
    s_x : Scaling factor on X axis for the triangles
    s_y : Scaling factor on Y axis for the triangles
    angle : Rotating angle to align each triangle properly to form a star shape
    size : Overall size of the star (controls how big the star is)
    */

    // Color for the star (white)
    let color = [1.0, 1.0, 1.0, 1.0];

    // Adjust scaling factors for overall size
    s_x *= size;
    s_y *= size;

    // Define rotation angles for the triangles to create a star
    const angles = [0,Math.PI/2,Math.PI,Math.PI*3/2];

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    // draw first triangle
    mMatrix = mat4.translate(mMatrix, [tx, ty, 0]);
    mMatrix = mat4.rotate(mMatrix, angle + angles[0], [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    // draw second triangle
    mMatrix = mat4.translate(mMatrix, [tx-0.8*s_x, ty-0.5*s_y, 0]);
    mMatrix = mat4.rotate(mMatrix, angle + angles[1], [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // draw thrid triangle
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [tx, ty-s_y, 0]);
    mMatrix = mat4.rotate(mMatrix, angle + angles[2], [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // draw four triangle
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [tx+0.8*s_x, ty-0.5*s_y, 0]);
    mMatrix = mat4.rotate(mMatrix, angle + angles[3], [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

}

function drawMountain(t_x1, t_y1, s_x, s_y, t_x2 = 0, t_y2 = 0, single = false) {
    /*
    t_x1, t_x2 : Translation along X-axis for the first and second triangle respectively
    t_y1, t_y2 : Translation along Y-axis for the first and second triangle respectively
    s_x : Scale Factor on X Axis for both triangles
    s_y : Scale Factor on Y Axis for both triangles
    single : Since one of the mountains has only one triangle, this is used to denote that
    */
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.57, 0.36, 0.15, 1.0];
    if (single) color = [0.65, 0.46, 0.16, 1.0];

    mMatrix = mat4.translate(mMatrix, [t_x1, t_y1, 0]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // if there is a single triangle in the mountain, we ignore the darker portion
    if (!single) {
        pushMatrix(matrixStack, mMatrix);
        color = [0.65, 0.46, 0.16, 1.0];
        mMatrix = mat4.translate(mMatrix, [t_x2, t_y2, 0]);
        mMatrix = mat4.rotate(mMatrix, 6.5, [0, 0, 1]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
    }
}

function drawGround() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.15, 0.61, 0, 0.7];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.6, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// for drawing lines on the river
function drawLines(move = false, x = 0, y = 0) {
    /*
    move : this is for global translation of the lines along the river
    x : translation along X axis
    y : translation along Y axis
    */
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [x, y, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0.9, 0.9, 0.9, 0.8];
    mMatrix = mat4.translate(mMatrix, [-0.7, -0.19, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.71, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.003, 0.4, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawRiver() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0.8, 0.8];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.14, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 0.23, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // draw the lines on the river
    drawLines();
    drawLines(true, 0.85, 0.1);
    drawLines(true, 1.5, -0.06);
}

function drawRoad() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.30, 0.40, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.568, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 7.2, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.6, 2.1, 1]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawTrees(move = false, t_x = 0, t_y= 0, s_x = 0, s_y = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation and scaling
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 0]);
    }

    pushMatrix(matrixStack, mMatrix);
    color = [0.30, 0.41, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.38, 0.51, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [0.375, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.45, 0.60, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // stem of the tree
    pushMatrix(matrixStack, mMatrix);
    color = [0.57, 0.36, 0.15, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.14, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.33, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// translationX is taken as argument for the animation
function drawBoat(translationX, tx, ty, s, cl=[1, 0, 0, 0.9]) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    // applying global translation
    mMatrix = mat4.translate(mMatrix, [translationX/s-(1-s)*0.3, 0., 0]);

    pushMatrix(matrixStack, mMatrix);
    color = [0.83, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [tx, ty-0.15*s, 0]);
    mMatrix = mat4.scale(mMatrix, [0.18*s, 0.06*s, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [tx-0.09*s, ty-0.15*s, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1*s, 0.06*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [tx+0.09*s, ty-0.15*s, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1*s, 0.06*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [tx+0.01*s,ty+ 0.006*s, 0]);
    mMatrix = mat4.scale(mMatrix, [0.01*s, 0.25*s, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [tx-0.03*s, ty-0.01*s, 0]);
    mMatrix = mat4.rotate(mMatrix, 5.9, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.005*s, 0.23*s, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = cl;
    mMatrix = mat4.translate(mMatrix, [tx+0.115*s, ty+0.006*s, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.72, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.2*s, 0.2*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// rotationAngle is taken as input for animation of the blades
function drawFan(rotationAngle, move = false, t_x = 0, t_y=0, sc=1) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0.3, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.7*sc, -0.25*sc, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [0.03*sc, 0.55*sc, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // drawing the fan blades
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.65, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.7*sc, 0.06*sc, 0]);
    mMatrix = mat4.scale(mMatrix, [0.2*sc, 0.2*sc, 1.0]);
    // rotating the fan blades
    mMatrix = mat4.rotate(mMatrix, rotationAngle, [0, 0, 1]);
    drawFanBlades(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.7*sc, 0.053*sc, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03*sc, 0.03*sc, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawBush(move=false, t_x=0, t_y=0, s=0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s, s, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.7, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-1, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 0.055, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.4, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.72, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.05, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.51, 0, 0.9]
    mMatrix = mat4.translate(mMatrix, [-0.86, -0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.13, 0.09, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawHouse() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);

    // roof of the house
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.3, 0.1, 1];
    mMatrix = mat4.translate(mMatrix, [-0.57, -0.29, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.77, -0.29, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.37, -0.29, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // base of the house
    pushMatrix(matrixStack, mMatrix);
    color = [0.83, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [-0.57, -0.515, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // windows
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.55, 0.1, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.715, -0.46, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.425, -0.46, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // door of the house
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.57, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.18, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// wheels for the car
function drawWheel(move = false, t_x = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation for the other wheel
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [-0.652, -0.88, 0]);
    mMatrix = mat4.scale(mMatrix, [0.055, 0.055, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.51, 0.51, 0.51, 1];
    mMatrix = mat4.translate(mMatrix, [-0.652, -0.88, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCar() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
   

    
    color = [0, 0, 1, 0.9];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.501, -0.73, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.18, 0.10, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
     

    pushMatrix(matrixStack, mMatrix);
    color = [0.9, 0.9, 0.9, 1];
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.73, 0]);
    mMatrix = mat4.scale(mMatrix, [0.198, 0.10, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    // drawing wheels
    drawWheel();
    drawWheel(true, 0.3);
    
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0.8, 0.7];
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.429, 0.10, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.285, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.154, 0.10, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.716, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.154, 0.10, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // stop the current loop of animation
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    function animate() {
        // Update the rotation angle
        rotationAngle += rotationSpeed;

        // Update translation based on direction
        translationX += translationSpeed * direction;

        // Reverse direction at translationRange
        if (Math.abs(translationX) > translationRange) {
            direction *= -1;
        }
        drawSky();

        // applying animation to the sun
        drawSun(rotationAngle);

        drawCloud();

        drawStar(0.4, 0.8, 0.015, 0.025, 0, 1.2);
        drawStar(0.55, 0.95, 0.012, 0.02, 0, 0.8);
        drawStar(-0.15, 0.75, 0.01, 0.015, 0, 1.2);
        drawStar(0.02, 0.65, 0.005, 0.01, 0, 1.7);
        drawStar(-0.03, 0.5, 0.003, 0.006, 0, 2.0);

        // draw the 3 mountains
        drawMountain(-0.69, 0.097, 1.1, 0.25, -0.665, 0.1);
        drawMountain(-0.054, 0.1, 1.5, 0.5, 0.00, 0.106);
        drawMountain(0.83, 0.075, 0.8, 0.2, -0.545, -0.005, true);

        drawGround();
        drawRoad();
        drawRiver();

        // draw the trees
        drawTrees(true, 0.35, 0.01, 0.86, 0.85)
        drawTrees(true, 0, 0.005, 1, 1);
        drawTrees(true, -0.15, 0.01, 0.8, 0.8)

        // applying back and forth motion to the boat

        drawBoat(translationX, 0.08, 0.055, 0.75, [0.2, 0.2, 0.5, 0.9]);
        drawBoat(translationX, 0, 0, 1);
        
        // applying rotatory motion to the blades of the windmill
        drawFan(-1*rotationAngle, true, 0.0, 0.045, 0.7);
        drawFan(-1*rotationAngle, true, -0.04, 0.05, 1);
        

        // draw the bushes
        drawBush();
        drawBush(true, 0.7, 0.00, 1.02);
        drawBush(true, 1.46, -0.18, 1.6);
        drawBush(true, 2.15, 0.25, 1.3);

        drawHouse();

        drawCar();

        // Request the next animation frame
        animation = window.requestAnimationFrame(animate);
    }
    animate();
}

// This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("2d_render");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);

    uColorLoc = gl.getUniformLocation(shaderProgram, "color");

    initSquareBuffer();
    initTriangleBuffer();
    initCircleBuffer();
    initRayBuffer();
    initFanBladesBuffer();

    drawScene();
}

// this function gets called when the button is pressed.
// it changes the mode of the canvas by to point view ('p'), 
// wireframe view ('w') or solid view ('s')
function changeView(view) {
    mode = view;
    drawScene();
}