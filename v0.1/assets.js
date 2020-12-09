const assets = {
    meshes: { 
    quad: {
    vertices: [
              [-0.5, 0.0, -0.5],[0.5, 0.0, 0.5],[0.5, 0.0, -0.5],
              [-0.5, 0.0, -0.5],[-0.5, 0.0, 0.5],[0.5, 0.0, 0.5]
    ],
    triangles: [
        [0, 1, 2],
        [3, 4, 5]
    ],
    normals: [
        [0.0, 1.0, 0.0],[0.0, 1.0, 0.0],[0.0, 1.0, 0.0],
        [0.0, 1.0, 0.0],[0.0, 1.0, 0.0],[0.0, 1.0, 0.0]
    ],
    },
    },
    materials: {
        body: {albedo: [0.1,1.0,0.1], metallic: 0.8, roughness: 0.6},
        red: {albedo: [1,0.0,0.0], metallic: 0.8, roughness: 0.3},
        green: {albedo: [0.0,1,0.0], metallic: 0.2, roughness: 0.7},
        white: {albedo: [1.0,1.0,1.0], metallic: 0.3, roughness: 0.2},
        ground: {albedo: [1,1,1], metallic: 0.1, roughness: 0.05},
        celing: {albedo: [0,0,0], metallic: 0.8, roughness: 0.2},
        chainsawBody:{albedo: [105/255,75/255,0/255], metallic: 0.2, roughness: 0.8},
        chainsawChain:{albedo: [0.1,0.1,0.1], metallic: 1.0, roughness: 0.2},
    },
    sounds: {
        jump: new RandomSound([
            {name: "sounds/goodsound.mp3", volume:0.5},
        ]),
        run: new RandomSound([
            {name: "sounds/step.mp3", volume:0.5},
        ]),
        damage: new RandomSound([
            {name: "sounds/badsound.mp3", volume:0.5, pool:true, numpool:20},
        ]),
        attack: new RandomSound([
            {name: "sounds/genericimpact1.mp3", volume:0.5, pool:true, numpool:20},
            {name: "sounds/genericimpact2.mp3", volume:0.5, pool:true, numpool:20},
            {name: "sounds/genericimpact3.mp3", volume:0.5, pool:true, numpool:20},
            {name: "sounds/genericimpact4.mp3", volume:0.5, pool:true, numpool:20},
            {name: "sounds/genericimpact5.mp3", volume:0.5, pool:true, numpool:20},
            {name: "sounds/genericimpact6.mp3", volume:0.5, pool:true, numpool:20},
            {name: "sounds/genericimpact7.mp3", volume:0.5, pool:true, numpool:20},
        ]),
    }
};
