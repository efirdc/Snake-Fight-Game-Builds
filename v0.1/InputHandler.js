class InputHandler {
    constructor(pointerLockMode=true) {
        this.pointerLockMode = pointerLockMode;
        this.pointerLocked = false;
        this.frame = 0;
        this.keyStates = {};

        this.deltaMouse = vec2.create();

        this.canvas = document.querySelector("#mainCanvas");
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;

        // 'this' has to be bound for event handler methods
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleWindowLoseFocus = this._handleWindowLoseFocus.bind(this);
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handlePointerLockChange = this._handlePointerLockChange.bind(this);
        window.addEventListener("keydown", this._handleKeyDown);
        window.addEventListener("keyup", this._handleKeyUp);
        window.addEventListener("blur", this._handleWindowLoseFocus);
        this.canvas.addEventListener("mousedown", this._handleMouseDown);
        this.canvas.addEventListener("mouseup", this._handleMouseUp);
        this.canvas.addEventListener("mousemove", this._handleMouseMove);
        document.addEventListener("pointerlockchange", this._handlePointerLockChange);
    }

    _handlePointerLockChange(event) {
        console.log("Pointer lock changed");
        this.pointerLocked = document.pointerLockElement === this.canvas;
    }

    _handleMouseMove(event) {
        if (this.pointerLockMode && !this.pointerLocked)
            return;
        this.deltaMouse[0] = event.movementX;
        this.deltaMouse[1] = event.movementY;
    }

    _handleMouseDown(event) {
        event.preventDefault();
        this.canvas.requestPointerLock();
        this.canvas.requestFullscreen();

        if (event.button === 0)
            event.code = "MouseLeft";
        else
            event.code = "MouseRight";
        this._handleKeyDown(event)
    }

    _handleMouseUp(event) {
        if (event.button === 0)
            event.code = "MouseLeft";
        else
            event.code = "MouseRight";
        this._handleKeyUp(event)
    }

    _handleKeyDown(event) {
        if (this.pointerLockMode && !this.pointerLocked)
            return;
        event.preventDefault();
        let keyState = this.keyStates[event.code];
        if (keyState === undefined) {
            this.keyStates[event.code] = {"held": true, "frame": this.frame};
            return;
        }

        // Ignore duplicate press events when a key is held
        if (keyState.held)
            return;
        keyState.held = true;
        keyState.frame = this.frame;
    }

    _handleKeyUp(event) {
        if (this.pointerLockMode && !this.pointerLocked)
            return;
        event.preventDefault();
        let keyState = this.keyStates[event.code];
        if (keyState === undefined) {
            this.keyStates[event.code] = {"held": false, "frame": this.frame};
            return;
        }

        // Ignore release events if the key was already force-released when the window is unfocused
        if (!keyState.held)
            return;
        keyState.held = false;
        keyState.frame = this.frame;
    }

    _handleWindowLoseFocus() {
        for (let code in this.keyStates) {
            this.keyStates[code].held = false;
            this.keyStates[code].frame = this.frame;
        }
    }

    // Call this every frame after checking pressed/released keys
    update() {
        this.frame += 1;
        this.deltaMouse[0] = 0.;
        this.deltaMouse[1] = 0.;
    }

    // Returns true any frame a key is held down
    isKeyHeld(code) {
        let keyState = this.keyStates[code];
        if (keyState === undefined)
            return false;
        return keyState.held;
    }

    // Returns true only on the first frame a key is pressed
    isKeyPressed(code) {
        let keyState = this.keyStates[code];
        if (keyState === undefined)
            return false;
        return keyState.held && keyState.frame === this.frame;
    }

    // Returns true only on the first frame a key is released
    isKeyReleased(code) {
        let keyState = this.keyStates[code];
        if (keyState === undefined)
            return false;
        return !keyState.held && keyState.frame === this.frame;
    }

}