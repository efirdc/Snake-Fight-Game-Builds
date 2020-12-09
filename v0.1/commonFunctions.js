setup();

Math.clamp = function (x, minValue, maxValue) {
    return Math.min(Math.max(x, minValue), maxValue);
};


function setup() {
    let navTag = document.createElement('nav');
    navTag.classList = "navbar navbar-expand-lg navbar-dark bg-dark";
    document.getElementById('myNavBar').appendChild(navTag);
}


/**
 * A custom error function. The tag with id `webglError` must be present
 * @param  {string} tag Main description
 * @param  {string} errorStr Detailed description
 */
function printError(tag, errorStr) {
    // Create a HTML tag to display to the user
    var errorTag = document.createElement('div');
    errorTag.classList = 'alert alert-danger';
    errorTag.innerHTML = '<strong>' + tag + '</strong><p>' + errorStr + '</p>';

    // Insert the tag into the HMTL document
    document.getElementById('webglError').appendChild(errorTag);

    // Print to the console as well
    console.error(tag + ": " + errorStr);
}

/**
 * @param  {} gl WebGL2 Context
 * @param  {string} vsSource Vertex shader GLSL source code
 * @param  {string} fsSource Fragment shader GLSL source code
 * @returns {} A shader program object. This is `null` on failure
 */
function initShaderProgram(gl, vsSource, fsSource) {
    // Use our custom function to load and compile the shader objects
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program by attaching and linking the shader objects
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to link the shader program' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

/**
 * Loads a shader from source into a shader object. This should later be linked into a program.
 * @param  {} gl WebGL2 context
 * @param  {} type Type of shader. Typically either VERTEX_SHADER or FRAGMENT_SHADER
 * @param  {string} source GLSL source code
 */
function loadShader(gl, type, source) {
    // Create a new shader object
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        // Fail with an error message
        var typeStr = '';
        if (type === gl.VERTEX_SHADER) {
            typeStr = 'VERTEX';
        } else if (type === gl.FRAGMENT_SHADER) {
            typeStr = 'FRAGMENT';
        }
        printError('An error occurred compiling the shader: ' + typeStr, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}


function loadTextFileAjaxSync(filePath, mimeType)
{
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath,false);
    if (mimeType != null) {
        if (xmlhttp.overrideMimeType) {
            xmlhttp.overrideMimeType(mimeType);
        }
    }
    xmlhttp.send();
    if (xmlhttp.status === 200 && xmlhttp.readyState === 4 )
        return xmlhttp.responseText;
    else
        return null;
}

function loadJSON(filePath) {
    return JSON.parse(loadTextFileAjaxSync(filePath, "application/json"));
}

function parseOBJFileToJSON(objFileURL) {
    return OBJLoader.prototype.parse(loadTextFileAjaxSync(objFileURL, "text/plain"));
}

var spareRandom = null;

function normalRandom()
{
    var val, u, v, s, mul;

    if(spareRandom !== null)
    {
        val = spareRandom;
        spareRandom = null;
    }
    else
    {
        do
        {
            u = Math.random()*2-1;
            v = Math.random()*2-1;

            s = u*u+v*v;
        } while(s === 0 || s >= 1);

        mul = Math.sqrt(-2 * Math.log(s) / s);

        val = u * mul;
        spareRandom = v * mul;
    }

    return val;
}

function hsv2rgb(h,s,v)
{
    let f= (n,k=(n+h/60)%6) => v - v*s*Math.max( Math.min(k,4-k,1), 0);
    return [f(5),f(3),f(1)];
}

function randRange(min, max) {
    return Math.random() * (max - min) + min;
}

function lerp(a, b, t) {
    return (1 - t) * a + t * b;
}

function inverseLerp(a, b, q) {
    return (q - a) / (b - a);
}