class GameObject {
    static All = [];

    constructor(transform, mesh, material, shader) {
        this.transform = transform;
        this.mesh = mesh;
        this.material = Object.assign({}, material);
        this.shader = shader;
        this.active = true;
        GameObject.All.push(this);
    }

    delete() {
        GameObject.All = GameObject.All.filter(elem => elem !== this);
    }
}