const Space = {
    LOCAL: 0,
    WORLD: 1
};

class Transform {
    constructor() {
        this._position = vec3.create();
        this._rotation = mat4.create();
        this._scale = vec3.fromValues(1., 1., 1.);
        this._localToWorldMatrix = mat4.create();
        this._worldToLocalMatrix = mat4.create();
        this._localToWorldRotation = mat4.create();
        this._worldToLocalRotation = mat4.create();
        this._normalMatrix = mat4.create();
        this._hasChanged = true;
        this._parent = undefined;
        this._children = []
    }

    clone() {
        let out = new Transform(this._position);
        out._rotation = mat4.clone(this._rotation);
        out._scale = vec3.clone(this._scale);
        out._localToWorldMatrix = mat4.clone(this._localToWorldMatrix);
        out._worldToLocalMatrix = mat4.clone(this._worldToLocalMatrix);
        out._localToWorldRotation = mat4.clone(this._localToWorldRotation);
        out._worldToLocalRotation = mat4.clone(this._worldToLocalRotation);
        out._hasChanged = this._hasChanged;
        out._parent = this._parent;
        this._children = [...this._children];
    }

    get parent() {
        return this._parent;
    }

    get hasChanged() {
        if (this._hasChanged)
            return true;
        if (this.parent === undefined)
            return false;
        return this.parent.hasChanged;
    }

    _updateMatrix() {
        // Don't update unless absolutely necessary (i.e. state of this object or parent object has changed)
        if (!this.hasChanged)
            return;

        // Recursively update all parents in the tree
        if (this.parent !== undefined)
            this.parent._updateMatrix();

        // Construct localToWorld matrices
        mat4.identity(this._localToWorldMatrix);
        mat4.translate(this._localToWorldMatrix, this._localToWorldMatrix, this._position);
        mat4.multiply(this._localToWorldMatrix, this._localToWorldMatrix, this._rotation);
        mat4.scale(this._localToWorldMatrix, this._localToWorldMatrix, this._scale);
        mat4.copy(this._localToWorldRotation, this._rotation);

        // Compose with parent matrices
        if (this.parent !== undefined) {
            mat4.multiply(this._localToWorldMatrix, this.parent._localToWorldMatrix, this._localToWorldMatrix);
            mat4.multiply(this._localToWorldRotation, this.parent._localToWorldRotation, this._localToWorldRotation);
        }

        // Invert to get worldToLocal matrices.
        // May be faster to construct the worldToLocal with negative translation, transposed rotation, and 1/scale instead of inverting
        mat4.invert(this._worldToLocalMatrix, this._localToWorldMatrix);
        mat4.transpose(this._normalMatrix, this._worldToLocalMatrix);
        mat4.transpose(this._worldToLocalRotation, this._localToWorldRotation);

        // Clear hasChanged flag, and notify children
        this._children.forEach(child => child._hasChanged = true);
        this._hasChanged = false;
    }

    // Lazy assumption: Parent is only set once when this transform is in world space and unscaled
    // A better implementation would allow for re-parenting that maintains world transform
    setParent(parent, preserveSpace=Space.LOCAL) {
        if (preserveSpace === Space.WORLD) {
            vec3.transformMat4(this._position, this._position, parent.worldToLocalMatrix);
            mat4.mul(this._rotation, parent.localToWorldRotation, this._rotation);
        }
        this._hasChanged = true;
        this._parent = parent;
        parent._children.push(this);
        return parent;
    }

    get localToWorldMatrix() {
        this._updateMatrix();
        return mat4.copy(mat4.create(), this._localToWorldMatrix);
    }
    get worldToLocalMatrix() {
        this._updateMatrix();
        return mat4.copy(mat4.create(), this._worldToLocalMatrix);
    }
    get localToWorldRotation() {
        this._updateMatrix();
        return mat4.copy(mat4.create(), this._localToWorldRotation);
    }
    get worldToLocalRotation() {
        this._updateMatrix();
        return mat4.copy(mat4.create(), this._worldToLocalRotation);
    }
    get normalMatrix() {
        this._updateMatrix();
        return mat4.copy(mat4.create(), this._normalMatrix);
    }

    get localPosition() {
        return vec3.copy(vec3.create(), this._position);
    }
    get localRotation() {
        return mat4.copy(mat4.create(), this._rotation);
    }
    get localScale() {
        return vec3.copy(vec3.create(), this._scale);
    }

    get globalPosition() {
        return this.transformPoint([0, 0, 0]);
    }
    get globalRotation() {
        return this.localToWorldRotation;
    }
    get globalScale() {
        return mat4.getScaling(vec3.create(), this.worldToLocalMatrix);
    }

    set localPosition(newValue) {
        this._hasChanged = true;
        this._position = vec3.fromValues(newValue[0], newValue[1], newValue[2]);
    }
    set localRotation(newValue) {
        this._hasChanged = true;
        this._rotation = newValue;
    }
    set localScale(newValue) {
        this._hasChanged = true;
        this._scale = vec3.fromValues(newValue[0], newValue[1], newValue[2]);
    }

    setEuler(xDegrees, yDegrees, zDegrees) {
        this._hasChanged = true;
        mat4.identity(this._rotation);
        mat4.rotateX(this._rotation, this._rotation, xDegrees / 180. * Math.PI);
        mat4.rotateY(this._rotation, this._rotation, yDegrees / 180. * Math.PI);
        mat4.rotateZ(this._rotation, this._rotation, zDegrees / 180. * Math.PI);
        return this;
    }

    translate(x) {
        this._hasChanged = true;
        vec3.add(this._position, this._position, x);
        return this;
    }
    rotate(axis, rad, space=Space.LOCAL) {
        this._hasChanged = true;
        if (space === Space.WORLD)
            axis = this.inverseTransformDirection(axis);
        mat4.rotate(this._rotation, this._rotation, rad, axis);
        return this;
    }

    rotateTowards(fromAxis, toAxis, percent=1., fromAxisSpace=Space.LOCAL, toAxisSpace=Space.LOCAL) {
        this._hasChanged = true;
        if (fromAxisSpace === Space.WORLD)
            fromAxis = this.inverseTransformDirection(fromAxis);
        if (toAxisSpace === Space.WORLD)
            toAxis = this.inverseTransformDirection(toAxis);
        let cosineAngle = Math.clamp(vec3.dot(toAxis, fromAxis), -1., 1.);
        let angleDifference = Math.acos(cosineAngle);
        let rotAxis = vec3.cross(vec3.create(), toAxis, fromAxis);
        this.rotate(rotAxis, -angleDifference * percent);
    }

    rotateTowards2(fromAxis, toAxis, rad, fromAxisSpace=Space.LOCAL, toAxisSpace=Space.LOCAL) {
        this._hasChanged = true;
        if (fromAxisSpace === Space.WORLD)
            fromAxis = this.inverseTransformDirection(fromAxis);
        if (toAxisSpace === Space.WORLD)
            toAxis = this.inverseTransformDirection(toAxis);
        let cosineAngle = Math.clamp(vec3.dot(toAxis, fromAxis), -1., 1.);
        let angleDifference = Math.acos(cosineAngle);
        let rotAxis = vec3.cross(vec3.create(), toAxis, fromAxis);
        let amount = Math.min(rad, angleDifference);
        this.rotate(rotAxis, -amount);
    }
    scaleBy(scaleVec) {
        this._hasChanged = true;
        vec3.mul(this._scale, this._scale, scaleVec);
        return this;
    }

    transformPoint(x) {
        this._updateMatrix();
        return vec3.transformMat4(vec3.create(), x, this._localToWorldMatrix);
    }
    transformVector(x) {
        this._updateMatrix();
        x = vec4.fromValues(x[0], x[1], x[2], 0.);
        vec4.transformMat4(x, x, this._localToWorldMatrix);
        return vec3.fromValues(x[0], x[1], x[2]);
    }
    transformDirection(x) {
        this._updateMatrix();
        return vec3.transformMat4(vec3.create(), x, this._localToWorldRotation);
    }
    inverseTransformPoint(x) {
        this._updateMatrix();
        return vec3.transformMat4(vec3.create(), x, this._worldToLocalMatrix);
    }
    inverseTransformVector(x) {
        this._updateMatrix();
        x = vec4.fromValues(x[0], x[1], x[2], 0.);
        vec4.transformMat4(x, x, this._worldToLocalMatrix);
        return vec3.fromValues(x[0], x[1], x[2]);
    }
    inverseTransformDirection(x) {
        this._updateMatrix();
        return vec3.transformMat4(vec3.create(), x, this._worldToLocalRotation);
    }

    get right() {
        return this.transformDirection([1, 0, 0]);
    }
    get left() {
        return this.transformDirection([-1, 0, 0]);
    }
    get up() {
        return this.transformDirection([0, 1, 0]);
    }
    get down() {
        return this.transformDirection([0, -1, 0]);
    }
    get forward() {
        return this.transformDirection([0, 0, 1]);
    }
    get back() {
        return this.transformDirection([0, 0, -1]);
    }
}
