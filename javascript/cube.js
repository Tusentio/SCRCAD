const cube = require("./cube.json");

// Decompress partial geometries
cube.shapes.forEach((shape, i) => {
    cube.shapes[i] = [];

    // Iterate through faces
    for (let j = 0; j < shape.length; j += 2) {
        // Decompress face
        let face = [
            ...Buffer.from(shape.substr(j, 2), "base64")[0].toString(2).padStart(6, "0"),
        ].map((p) => parseInt(p, 2));

        // Push face vertex positions to shape
        cube.shapes[i].push(...face);
    }
});

module.exports = cube;
