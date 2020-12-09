class Character {
    constructor(gl,shader,position) {
        // transform1 handles character translation, up direction, and left/right look
        this.transform1 = new Transform().translate(position);

        // transform2 is a child of transform1, and handles up/down look
        this.transform2 = new Transform();
        this.transform2.setParent(this.transform1);

        this.velocity = vec3.create();

        let meshMat = mat4.create();
        mat4.translate(meshMat, meshMat, [0, 0, 0]);
        //mat4.rotate(meshMat, meshMat, Math.PI * 0.5, [0, 1, 0]);
        //mat4.rotate(meshMat, meshMat, Math.PI, [0, 0, 1]);
        mat4.scale(meshMat, meshMat, [0.5, 0.5, 0.5]);
        let chainSaw = new Mesh(gl, "models/bodyFull.obj");
        let t=new Transform();
        t.setParent(this.transform2);
        t.rotate([0.,0.,1],Math.PI/4).rotate([1.,0.,0.],Math.PI/5).translate([-1.,-2.,-3.]);
        this.model = new GameObject(t, chainSaw, assets.materials.chainsawBody, shader);
        this.chains = [new Mesh(gl, "models/c1.obj"), new Mesh(gl, "models/c2.obj"),
            new Mesh(gl, "models/c3.obj"), new Mesh(gl, "models/c4.obj"), new Mesh(gl, "models/c5.obj"), new Mesh(gl, "models/c6.obj"), new Mesh(gl, "models/c7.obj"), new Mesh(gl, "models/c8.obj")];
        this.blade = new GameObject(t, this.chains[0], assets.materials.chainsawChain, shader);


       // this.weaponTransform = this.model.transform;

        //this.swingTransform = new Transform();
        //this.swingTransform.setParent(this.transform1);
        //this.weaponTransform.setParent(this.swingTransform);
       // this.weaponTransform.rotate([1, 0, 0], Math.PI * 0.5);
       // this.weaponTransform.translate([-2, 0, -1.5]);

        //this.swingTransform.rotate([0, 1., 0], -Math.PI * 0.1);

        this.onGround = false;
        this.dead = false;
        this.deadSideDirection = undefined;

        this.health = 1.;
        this.damageTime = 0.;
        this.attackTime = 0.;
        this.attackDir = vec2.fromValues(0., 0.);
    }


    get transform() {
        return this.transform2;
    }

    update(state, deltaTime) {
        let timeScale = Math.min(deltaTime, 1 / 20) * 60;
        const height = 3;
        const acceleration = 0.1;
        const groundedFrictionCoeff = -0.06;
        const aerialFrictionCoeff = -0.03;
        const minGravity = -0.04;
        const maxGravity = -0.1;
        const jumpPower = 1.;
        const jumpBoost = 1.5;
        this.blade.mesh=this.chains[Math.floor(state.time / 0.05) % (this.chains.length-1)];

        // Handle inputs
        let inputHandler = state.inputHandler;
        let moveAxis = vec3.fromValues(
            inputHandler.isKeyHeld("KeyD") - inputHandler.isKeyHeld("KeyA"),
            0.,
            inputHandler.isKeyHeld("KeyS") - inputHandler.isKeyHeld("KeyW"),
        );
        vec3.normalize(moveAxis, moveAxis);
        let deltaMouse = inputHandler.deltaMouse;

        let timeSinceAttack = state.time - this.attackTime;
        if (inputHandler.isKeyHeld("LeftMouse") && timeSinceAttack > 1. && !this.dead) {
            this.attackDir = vec2.fromValues(normalRandom(), normalRandom());
            this.attackTime = state.time;
            console.log(this.attackTime, this.attackDir);
        }

        if (this.dead) {
            moveAxis[0] = moveAxis[1] = moveAxis[2] = 0.;
            deltaMouse[0] = deltaMouse[1] = 0.;
        }

        let upDirection = vec3.normalize(vec3.create(), this.transform1.globalPosition);
        let centerDistance = vec3.length(this.transform1.globalPosition);
        let t = inverseLerp(state.ground, state.ceiling, centerDistance);
        let gravity = lerp(minGravity, maxGravity, t);
        vec3.scaleAndAdd(this.velocity, this.velocity, upDirection, gravity * timeScale);

        if (!this.dead)
            this.transform1.rotateTowards([0, 1, 0], upDirection, 1., Space.LOCAL, Space.WORLD);
        else {
            this.transform1.rotateTowards([0, 1, 0], this.deadSideDirection,
                0.01, Space.LOCAL, Space.WORLD);
        }

        // Left/right look
        this.transform1.rotate(upDirection, deltaMouse[0] * Math.PI * -0.001, Space.WORLD);

        // Up/down look
        let rotationAmount = deltaMouse[1] * Math.PI * -0.001;
        let lookAxis = vec3.transformMat4(vec3.create(), [0, 0, -1], this.transform2.localRotation);
        let altitude = Math.asin(Math.clamp(lookAxis[1], -1., 1.));
        let maxAltitude = Math.PI * 0.5 - 1e-3;
        let maxRotation = maxAltitude - altitude;
        let minRotation = -maxAltitude - altitude;
        rotationAmount = Math.clamp(rotationAmount, minRotation, maxRotation);
        if (Math.abs(rotationAmount) > 1e-5){
            this.transform2.rotate([1, 0, 0], rotationAmount);
        }
        let localVelocity = this.transform1.inverseTransformVector(this.velocity);

        if (vec3.length(this.transform1.globalPosition) < state.ground+height) {
            this.onGround = true;
            localVelocity[1] = 0.;
            let newPosition = vec3.normalize(vec3.create(), this.transform1.globalPosition);
            vec3.scale(newPosition, newPosition, state.ground+height);
            this.transform1.localPosition = newPosition;
        }

        if (inputHandler.isKeyHeld("Space") && this.onGround && !this.dead) {
            this.onGround = false;
            localVelocity[1] += jumpPower;
            localVelocity[2] *= jumpBoost;
            assets.sounds.jump.play();
        }
        
        if (vec3.length(this.transform1.globalPosition) > state.ceiling-1) {
            if (localVelocity[1] > 0.)
                localVelocity[1] *= -0.1;
            let newPosition = vec3.normalize(vec3.create(), this.transform1.globalPosition);
            vec3.scale(newPosition, newPosition, state.ceiling-1);
            this.transform1.localPosition = newPosition;
        }
 
        let tangentVelocity = vec3.fromValues(localVelocity[0], 0., localVelocity[2]);
        let velocityMagnitude = vec3.length(tangentVelocity);
        let tangentVelocityNormalized = vec3.normalize(tangentVelocity, tangentVelocity);
        let frictionCoeff = this.onGround ? groundedFrictionCoeff : aerialFrictionCoeff;
        let frictionVector = vec3.scale(vec3.create(), tangentVelocityNormalized, velocityMagnitude * frictionCoeff * timeScale);
        vec3.add(localVelocity, localVelocity, frictionVector);

        if (this.onGround && vec2.length(new vec2.fromValues(localVelocity[0],localVelocity[1]))>=0.01){
            //this.playRandom("run");
        }

        vec3.scaleAndAdd(localVelocity, localVelocity, moveAxis, acceleration * timeScale);
        this.velocity = this.transform1.transformVector(localVelocity);

        let scaledVelocity = vec3.scale(vec3.create(), this.velocity, timeScale);
        this.transform1.translate(scaledVelocity);
        this.handleWorldCollision(state);
    }

    handleWorldCollision(state){
        this.columnCollision(state);
        this.snakeCollision(state);
    }

    columnCollision(state){
        const columnRadius = 11;

        for (let i=0; i<(state.noc*3); i++){
            let dColumn=vec3.normalize(vec3.create(),vec3.fromValues(state.columns[3*i],state.columns[3*i+1],state.columns[3*i+2]));//get the direction of the column
            let scalarProj = vec3.dot(dColumn,this.transform1.globalPosition);
            if (scalarProj < 0.)
                continue;
            let center = vec3.scale(vec3.create(),dColumn, scalarProj);

            let deltaCenter = vec3.sub(dColumn, this.transform1.globalPosition, center);
            let centerDist = vec3.length(deltaCenter);

            if (centerDist < columnRadius){
                let deltaDir = vec3.normalize(vec3.create(), deltaCenter);
                let overlap = columnRadius - centerDist;
                let translationVector = vec3.scale(vec3.create(), deltaDir, overlap);
                this.transform1.translate(translationVector);
            }
        }
    }

    snakeCollision(state){
        let position = this.transform1.globalPosition;
        Snake.All.forEach(snake => {
            if (snake.isHead) {
                let distance = vec3.create();
                vec3.negate(position,position);
                vec3.add(distance, position, snake.gameObject.transform.globalPosition);
                let timeSinceDamage = state.time - this.damageTime;
                if (!this.dead && timeSinceDamage > 2. && vec3.length(distance)<10){
                    this.health -= 0.334;
                    assets.sounds.damage.play();
                    vec3.scaleAndAdd(this.velocity, this.velocity, snake.velocity, 10.);
                    this.damageTime = state.time;
                    if (this.health < 0.) {
                        this.health = 0.;
                        this.dead = true;
                        this.deadSideDirection = this.transform1.right;
                    }
                }
            } else {
                let timeSinceDamage = state.time - snake.damageTime;
                if (timeSinceDamage > 0.1 && state.inputHandler.isKeyHeld("MouseLeft")) {
                    let hitPos = vec3.add(vec3.create(), this.transform.globalPosition, this.transform.forward);
                    let hitDist = vec3.distance(hitPos, snake.transform.globalPosition);
                    if (hitDist < 10) {
                        state.freezeTime += 0.025;
                        assets.sounds.attack.play();
                        snake.gameObject.material.albedo = vec3.fromValues(3.,3.,3.);
                        snake.damageTime = state.time;
                        snake.health -= 0.334;
                        if (snake.health < 0.)
                            snake.die();
                    }
                }
            }
        });
    }
}
