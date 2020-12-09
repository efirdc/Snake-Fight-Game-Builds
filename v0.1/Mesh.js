class Mesh {
    constructor(gl, filePath, matrix=undefined, invertNormals=false) {

        let vertices = [];
        let normals = [];
        let meshData = parseOBJFileToJSON(filePath);

        for (let i = 0; i < Math.floor(meshData.vertices.length / 3); i++) {
            vertices.push([meshData.vertices[3*i], meshData.vertices[3*i + 1], meshData.vertices[3*i + 2]]);
            normals.push([meshData.normals[3*i], meshData.normals[3*i + 1], meshData.normals[3*i + 2]]);
        }
        if (invertNormals) {
            normals.forEach(normal => vec3.negate(normal, normal));
            let newNormals = [];
            let newVertices = [];
            for (let i = 0; i < Math.floor(normals.length / 3); i++) {
                newNormals.push(normals[3*i + 1]);
                newNormals.push(normals[3*i]);
                newNormals.push(normals[3*i + 2]);
                newVertices.push(vertices[3*i + 1]);
                newVertices.push(vertices[3*i]);
                newVertices.push(vertices[3*i + 2]);
            }
            normals = newNormals;
            vertices = newVertices;
        }

        // Apply an optional matrix transformation to the vertices.
        // This transformation is baked into the mesh vertices and only applied once right here
        if (matrix !== undefined) {
            vertices.forEach(vertex => vec3.transformMat4(vertex, vertex, matrix));
            vertices = vertices.map(v => [v[0], v[1], v[2]]);
            let normalMatrix = mat4.invert(mat4.create(), matrix);
            mat4.transpose(normalMatrix, normalMatrix);
            normals.forEach(normal => vec3.transformMat4(normal, normal, normalMatrix));
            normals.forEach(normal => vec3.normalize(normal, normal));
            normals = normals.map(v => [v[0], v[1], v[2]]);
        }

        this.vertexArray = new Float32Array(vertices.flat().flat());
        this.normalArray = new Float32Array(normals.flat().flat());
        this.numVertices = this.vertexArray.length;

        this.VAO = gl.createVertexArray();
        gl.bindVertexArray(this.VAO);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normalArray, gl.STATIC_DRAW);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);
    }
}
