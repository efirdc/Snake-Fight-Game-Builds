main();

function main() {
    const canvas = document.querySelector("#mainCanvas");

    let gl = canvas.getContext("webgl2");
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }
    let g = 250;
    let shader = transformShader(gl);
    let state = {
        character: new Character(gl, shader, vec3.fromValues(0.0, g + 0.5, 0.5)),
        inputHandler: new InputHandler(),
        canvas: canvas,
        lights: new Float32Array(42 * 3),
        lColor: new Float32Array(42 * 3),
        lStrength: new Float32Array(42),
        nol: 6,
        columns: new Float32Array(30 * 3),
        noc: 40,
        ground: g,
        ceiling: 650,
        time: 0.,
        unscaledTime: 0.,
        freezeTime: 0.,
        size: new vec2.fromValues(canvas.width, canvas.height),
    };

    let cubeMesh = new Mesh(gl, "models/cube.obj");
    let sphereMesh = new Mesh(gl,"models/sphere6S.obj", mat4.fromScaling(mat4.create(),[state.ground,state.ground,state.ground]));
    let cylinderMesh = new Mesh(gl, "models/cylinder.obj", mat4.fromScaling(mat4.create(),[10.0,600.0,10.0]));
    let outerSphere = new Mesh(gl,"models/sphere6.obj",
        mat4.fromScaling(mat4.create(),[state.ceiling,state.ceiling,state.ceiling]), true);
    let ground = new GameObject(new Transform(), sphereMesh, assets.materials.ground, shader);
    let ceiling = new GameObject(new Transform(), outerSphere, assets.materials.celing, shader);
    state.groundObject = ground;

    const gr = (Math.sqrt(5.0) + 1.0) / 2.0;
    const ga = (2.0 - gr) * 2.0 * Math.PI;
    for (i = 0; i < state.noc; i++) {
        let lat = Math.asin(-1. + 2. * i / (state.noc + 1));
        let lon = ga * i;
        let dir = vec3.fromValues(Math.cos(lon)*Math.cos(lat), Math.sin(lon)*Math.cos(lat), Math.sin(lat));
        vec3.normalize(dir, dir);
        state.columns[3*i]=dir[0];state.columns[3*i+1]=dir[1];state.columns[3*i+2]=dir[2];
        let pos = vec3.scale(vec3.create(), dir, (state.ground + state.ceiling) * 0.5);
        let t1 = new Transform();
        t1.localPosition = pos;
        t1.rotateTowards([0, 1, 0], dir);
        let material = {
            albedo:hsv2rgb(randRange(0, 260), randRange(0.8, 1.0), randRange(0.8, 1.0)),
            metallic: randRange(0.2, 0.6), roughness: randRange(0.2, 0.6),
        };
        let cylinder = new GameObject(t1, cylinderMesh, material, shader);
    }

    let headMesh = new Mesh(gl, "models/cube.obj", mat4.fromScaling(mat4.create(), [8, 8, 8]));
    let bodyMat = mat4.create();
    mat4.scale(bodyMat, bodyMat, [5., 5., 9]);
    mat4.rotate(bodyMat, bodyMat, Math.PI / 4., [1, 1, 0.]);
    let bodyMesh = new Mesh(gl, "models/smoothCube.obj", bodyMat);
    state["snake"] = new Snake(undefined, 200, 6.,
        headMesh, assets.materials.red, bodyMesh, assets.materials.body, shader);
    
    let then = 0.0;
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        drawScene(gl, deltaTime, state);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function drawScene(gl, deltaTime, state) {
    state.unscaledTime += deltaTime;
    if (state.freezeTime > 0.) {
        state.freezeTime -= deltaTime;
        deltaTime = 0.;
    } else {
        state.freezeTime = 0.;
    }
    state.time += deltaTime;
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

     if (state.inputHandler.isKeyPressed("KeyO"))
         state.groundObject.active = !state.groundObject.active;

    state.character.update(state, deltaTime);

    Snake.All.forEach(snake => {
        if (snake.isHead)
            snake.update(state, deltaTime);
    });

    for (var i=0;i<state.nol;i++){
        let now = state.time;
        let lHeight = (state.ceiling-state.ground)/2+state.ground;
        state.lights[3*i] = (lHeight)*Math.cos(now+2*i*Math.PI/state.nol);//x values
        state.lights[1+3*i] = (lHeight)*Math.cos(i*Math.PI);
        state.lights[2+3*i] = (lHeight)*Math.sin(now+2*i*Math.PI/state.nol);
        state.lColor[3*i]=1.0//Math.sin(now/10);//red values
        state.lColor[1+3*i]=1.0//Math.cos(now/10);//-i/3;//green values
        state.lColor[2+3*i]=1.0//i/3;//blue values
        state.lStrength[i]=1.0;//strength values
    }


    //update last light as current character position
    state.lights[3*state.nol] = state.character.transform1.globalPosition[0];
    state.lights[1+3*state.nol] = state.character.transform1.globalPosition[1];
    state.lights[2+3*state.nol] = state.character.transform1.globalPosition[2];
    state.lColor[3*state.nol]=1.0;
    state.lColor[1+3*state.nol]=1.0;
    state.lColor[2+3*state.nol]=1.0;
    state.lStrength[state.nol]=1.0;


    //we can have a light on the snakes head! :D
    state.lights[3*state.nol+3] = state.snake.gameObject.transform.globalPosition[0];
    state.lights[4+3*state.nol] = state.snake.gameObject.transform.globalPosition[1];
    state.lights[5+3*state.nol] = state.snake.gameObject.transform.globalPosition[2];
    state.lColor[3*state.nol+3]=1.0;
    state.lColor[4+3*state.nol]=0.0;
    state.lColor[5+3*state.nol]=0.0;
    state.lStrength[state.nol+1]=10.0;

    let projectionMatrix = mat4.create();
    let aspect = state.canvas.clientWidth / state.canvas.clientHeight;
    mat4.perspective(projectionMatrix, 75.0 * Math.PI / 180.0, aspect, 0.1, 10000.);

    GameObject.All.forEach(object => {
        if (!object.active)
            return;

        gl.useProgram(object.shader.id);

        let m1 = state.character.transform.worldToLocalMatrix;
        let m2 = object.transform.localToWorldMatrix;
        let m3 = object.transform.normalMatrix;
        gl.uniformMatrix4fv(object.shader.uniformLocations.uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(object.shader.uniformLocations.uViewMatrix, false, m1);
        gl.uniformMatrix4fv(object.shader.uniformLocations.uModelMatrix, false, m2);
        gl.uniformMatrix4fv(object.shader.uniformLocations.uNormalMatrix, false, m3);
        gl.uniform3fv(object.shader.uniformLocations.albedo, object.material.albedo);
        gl.uniform1f(object.shader.uniformLocations.metallic, object.material.metallic);
        gl.uniform1f(object.shader.uniformLocations.roughness, object.material.roughness);
        gl.uniform3fv(object.shader.uniformLocations.camPos, state.character.transform1.globalPosition);
        gl.uniform3fv(object.shader.uniformLocations.lightPos, state.lights);
        gl.uniform3fv(object.shader.uniformLocations.lColor, state.lColor);
        gl.uniform1fv(object.shader.uniformLocations.lStrength, state.lStrength);
        gl.uniform1i(object.shader.uniformLocations.nLights, state.nol+2);//+1 for the character light
        gl.uniform1f(object.shader.uniformLocations.health, state.character.health);
        gl.uniform1f(object.shader.uniformLocations.damageTime, state.character.damageTime);
        gl.uniform1f(object.shader.uniformLocations.coolTime, state.time);
        gl.uniform2fv(object.shader.uniformLocations.size, state.size);
        gl.uniform2fv(object.shader.uniformLocations.attackDir, state.character.attackDir);
        gl.uniform1f(object.shader.uniformLocations.attackTime, state.character.attackTime);

        gl.bindVertexArray(object.mesh.VAO);
        gl.drawArrays(gl.TRIANGLES, 0, object.mesh.numVertices);
    });

    state.inputHandler.update();
}


function transformShader(gl) {
    const vsSource =
        `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;
    
    out vec4 fragPos;
    out vec3 oN;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;
    uniform mat4 uNormalMatrix;
 
    void main() {
        oN = mat3(uNormalMatrix) * aNormal;
        fragPos = uModelMatrix * vec4(aPosition, 1.0);
        gl_Position =  uProjectionMatrix * uViewMatrix * fragPos;
    }
    `;

    const fsSource =
        `#version 300 es
    precision highp float;

    out vec4 fragColor;
    in vec3 oN;
    in vec4 fragPos;
    
    uniform float coolTime;
    uniform float damageTime;
    uniform float attackTime;
    uniform vec2 attackDir;
    
    uniform vec3 albedo;
    uniform float metallic;
    uniform float roughness;
    uniform float health;
    uniform vec2 size;
    uniform vec3 camPos;
    uniform int nLights;
    uniform vec3[42] lightPos;
    uniform vec3[42] lColor;
    uniform float[42] lStrength;
    #define kPi 3.14159265
    
    vec3 fresnelSchlick(float cosTheta, vec3 F0)
    {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }  
    float DistributionGGX(vec3 N, vec3 H, float rough)
    {
        float a      = rough*rough;
        float a2     = a*a;
        float NdotH  = max(dot(N, H), 0.0);
        float NdotH2 = NdotH*NdotH;
        
        float num   = a2;
        float denom = (NdotH2 * (a2 - 1.0) + 1.0);
        denom = kPi * denom * denom;
        
        return num / denom;
    }
    
    float GeometrySchlickGGX(float NdotV, float rough)
    {
        float r = (rough + 1.0);
        float k = (r*r) / 8.0;
    
        float num   = NdotV;
        float denom = NdotV * (1.0 - k) + k;
        
        return num / denom;
    }
    float GeometrySmith(vec3 N, vec3 V, vec3 L, float rough)
    {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        float ggx2  = GeometrySchlickGGX(NdotV, rough);
        float ggx1  = GeometrySchlickGGX(NdotL, rough);
        
        return ggx1 * ggx2;
    }

    vec3 combineLights(){
        vec3 N = normalize(oN);
        vec3 outColor = vec3(0);
        for (int i=0;i<nLights;i++) { 
            vec3 F0 = vec3(0.04);
            F0 = mix(F0, albedo, metallic);
        
            vec3 radiance = lColor[i] * lStrength[i];
        
            vec3 L = normalize(lightPos[i] - fragPos.xyz);
            vec3 V = normalize(camPos-fragPos.xyz);
            vec3 H = normalize(L + V);
        
            // cook-torrance brdf
            float NDF = DistributionGGX(N, H, roughness);
            float G   = GeometrySmith(N, V, L, roughness);
            vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);
        
            vec3 kS = F;
            vec3 kD = vec3(1.0) - kS;
            kD *= 1.0 - metallic;	  
                
            vec3 numerator    = NDF * G * F;
            float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
            vec3 specular     = numerator / max(denominator, 0.001);  
                    
            // add to outgoing radiance Lo
            float NdotL = max(dot(N, L), 0.0);                
            outColor += (kD * albedo / kPi + specular) * radiance * NdotL; 
        }
        vec2 screenCoord=(gl_FragCoord.xy/size) * 2. - 1.;
        
        float grey=(outColor.r+outColor.g+outColor.b)/3.0;
        float dist = length(screenCoord);
        //outColor=mix(vec3(grey),outColor,health);
        
        outColor=mix(outColor,vec3(0.1,0.0,0.0),smoothstep(0.2, 1.3, dist) * (1. - health));
        
        float timeSinceDamage = coolTime - damageTime;
        if (timeSinceDamage < 4.)
            outColor = mix(outColor, vec3(1., 0., 0.), exp(-3.*timeSinceDamage) * 0.9);
        
        float timeSinceAttack = coolTime - attackTime;
        if (timeSinceAttack < 1.) {
            
        }
        //outColor = outColor / (outColor + 1.);
        outColor = pow(outColor, vec3(1. / 2.2));
        return outColor;
    }

    void main() {
       fragColor = vec4(combineLights(),1.0);
    }
    `;

    const id = initShaderProgram(gl, vsSource, fsSource);
    const shader = {
        id: id,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(id, 'aPosition'),
            normalPosition: gl.getAttribLocation(id, 'aNormal'),
        },
        uniformLocations: {
            "uProjectionMatrix": gl.getUniformLocation(id, "uProjectionMatrix"),
            "uViewMatrix": gl.getUniformLocation(id, "uViewMatrix"),
            "uModelMatrix": gl.getUniformLocation(id, "uModelMatrix"),
            "uNormalMatrix": gl.getUniformLocation(id, "uNormalMatrix"),
            "albedo": gl.getUniformLocation(id, "albedo"),
            "lightPos": gl.getUniformLocation(id, "lightPos"),
            "metallic": gl.getUniformLocation(id, "metallic"),
            "roughness": gl.getUniformLocation(id, "roughness"),
            "camPos": gl.getUniformLocation(id, "camPos"),
            "lColor": gl.getUniformLocation(id,"lColor"),
            "nLights": gl.getUniformLocation(id, "nLights"),
            "lStrength": gl.getUniformLocation(id, "lStrength"),
            "health": gl.getUniformLocation(id, "health"),
            "coolTime": gl.getUniformLocation(id, "coolTime"),
            "damageTime": gl.getUniformLocation(id, "damageTime"),
            "size": gl.getUniformLocation(id, "size"),
            "attackTime": gl.getUniformLocation(id, "attackTime"),
            "attackDir": gl.getUniformLocation(id, "attackDir"),
        },
    };

    for (let attribute in shader.attribLocations) {
        let location = shader.attribLocations[attribute];
        if (location === -1)
            printError('Shader Location Error', `attribute variable ${attribute} could not be located'`);
    }
    for (let uniform in shader.uniformLocations) {
        let location = shader.uniformLocations[uniform];
        if (location === -1)
            printError('Shader Location Error', `uniform variable ${uniform} could not be located'`);
    }

    return shader;
}
