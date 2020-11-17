const msgpack = require("msgpack5")();
const ndarray = require("ndarray");
const THREE = require("three");
const EventEmitter = require("events");
const util = require("util");
const fs = require("fs");
const voxelUtil = require("../wasm_pack/voxel-util");

class Model extends EventEmitter {
    constructor(width = 1, height = 1, depth = 1, voxels = null) {
        super();

        if (voxels === null) {
            voxels = new Array(width * height * depth);
            for (let i = 0; i < voxels.length; i++) {
                voxels[i] = {
                    color: 0x00000000,
                    selected: false,
                };
            }
        }

        this._voxels = ndarray(voxels, [width, height, depth]);
        this.emitChange = true;
    }

    get width() {
        return this._voxels.shape[0];
    }

    get height() {
        return this._voxels.shape[1];
    }

    get depth() {
        return this._voxels.shape[2];
    }

    get(x, y, z) {
        this.assertPointInModel(x, y, z);
        return { ...this._voxels.get(x, y, z) };
    }

    set(x, y, z, properties) {
        if (this.pointInModel(x, y, z)) {
            let voxel = this._voxels.get(x, y, z);
            let oldColor = voxel.color;

            Object.assign(voxel, properties);

            if (this.emitChange && oldColor !== properties.color) {
                this.emit("change");
            }
        } else if ("color" in properties) {
            this.#expandToInclude(x, y, z);
            this.set(...this.constrainPositionToBounds(x, y, z), properties);
        }
    }

    pointInModel(x, y, z) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
    }

    assertPointInModel(x, y, z) {
        if (!this.pointInModel(x, y, z)) {
            throw new Error(`Point (${x}, ${y}, ${z}) is outside the model`);
        }
    }

    constrainPositionToBounds(x, y, z) {
        return [
            Math.max(0, Math.min(this.width - 1, x)),
            Math.max(0, Math.min(this.height - 1, y)),
            Math.max(0, Math.min(this.depth - 1, z)),
        ];
    }

    #expandToInclude(x, y, z) {
        // Calculate offset
        let xOffs = -Math.min(0, x);
        let yOffs = -Math.min(0, y);
        let zOffs = -Math.min(0, z);

        // Get old width, height, depth, and voxels
        let ow = this.width;
        let oh = this.height;
        let od = this.depth;
        let oVoxels = this._voxels;

        // Calculate and set new width, height, depth, and voxels
        let nw = Math.max(ow, ow + xOffs, x + 1);
        let nh = Math.max(oh, oh + yOffs, y + 1);
        let nd = Math.max(od, od + zOffs, z + 1);
        this._voxels = ndarray(new Array(), [nw, nh, nd]);

        // Assign new voxels to the new voxel array
        for (let px = 0; px < nw; px++) {
            for (let py = 0; py < nh; py++) {
                for (let pz = 0; pz < nd; pz++) {
                    this._voxels.set(px, py, pz, {
                        color: 0x00000000,
                        selected: false,
                    });
                }
            }
        }

        // Reassign old voxels with origin at the offset position
        for (let px = 0; px < ow; px++) {
            for (let py = 0; py < oh; py++) {
                for (let pz = 0; pz < od; pz++) {
                    this._voxels.set(px + xOffs, py + yOffs, pz + zOffs, oVoxels.get(px, py, pz));
                }
            }
        }
    }

    getPlane(plane) {
        return new Plane(this, plane);
    }

    getColorData() {
        let lastColorIndex = 0;
        let colorIndexLookup = {};

        let voxels = this._voxels.data.map((voxel) => {
            let color = voxel.color;

            if (colorIndexLookup[color] === undefined) {
                colorIndexLookup[color] = lastColorIndex;
                lastColorIndex++;
            }

            let colorIndex = colorIndexLookup[color];
            return colorIndex;
        });

        let palette = Object.keys(colorIndexLookup)
            .sort((a, b) => colorIndexLookup[a] - colorIndexLookup[b])
            .map((color) => parseInt(color));

        return { voxels, palette };
    }

    async meshify() {
        let { voxels, palette } = this.getColorData();

        let geometry = new THREE.BufferGeometry();
        let meshData = await voxelUtil.meshify(
            voxels,
            palette,
            this.width,
            this.height,
            this.depth
        );

        for (let vertexGroup of meshData["vertex_groups"]) {
            geometry.addGroup(
                vertexGroup["start"],
                vertexGroup["count"],
                vertexGroup["material_index"]
            );
        }

        let vertexData = meshData["vertices"].reduce(
            (data, vertex) => (data.push(vertex.x, vertex.y, vertex.z), data),
            []
        );

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(vertexData), 3)
        );
        geometry.computeVertexNormals();
        geometry.center();

        let materials = palette.map(
            (color) =>
                new THREE.MeshLambertMaterial({
                    color: color >>> 8,
                    opacity: (color & 0xff) / 0xff,
                    side: THREE.BackSide,
                })
        );

        let mesh = new THREE.Mesh(geometry, materials);
        return mesh;
    }

    async save(path) {
        let { voxels, palette } = this.getColorData();

        let paletteBuffer = bufferize(new Uint32Array(palette));
        let bytesPerColorIndex = Math.ceil(Math.log2(palette.length) / Math.log2(0x100)) || 1;
        let voxelBuffer = bufferize(voxels, bytesPerColorIndex);

        let modelFileObject = {
            SCRCAD: "1.0",
            X: this.width,
            Y: this.height,
            Z: this.depth,
            PAL: paletteBuffer,
            VOX: voxelBuffer,
        };

        let modelFileBuffer = msgpack.encode(modelFileObject);
        await util.promisify(fs.writeFile)(path, modelFileBuffer);
    }

    static async load(path) {
        let modelFileBuffer = await util.promisify(fs.readFile)(path);
        let modelFileObject = msgpack.decode(modelFileBuffer);

        let { X: width, Y: height, Z: depth } = modelFileObject;

        let paletteBuffer = modelFileObject["PAL"];
        let palette = debufferize(paletteBuffer, 4);
        let bytesPerColorIndex = Math.ceil(Math.log2(palette.length) / Math.log2(0x100)) || 1;

        let voxelBuffer = modelFileObject["VOX"];
        let voxelData = debufferize(voxelBuffer, bytesPerColorIndex);

        let voxels = voxelData.map((colorIndex) => ({
            color: palette[colorIndex],
            selected: false,
        }));

        return new Model(width, height, depth, voxels);
    }
}

class Plane {
    constructor(model, plane) {
        const { shape, planeToModelSpace } = {
            right: {
                shape: () => [model.depth, model.height, model.width],
                planeToModelSpace(x, y, z) {
                    return [model.width - 1 - z, model.height - 1 - y, model.depth - 1 - x];
                },
            },
            top: {
                shape: () => [model.width, model.depth, model.height],
                planeToModelSpace(x, y, z) {
                    return [x, model.height - 1 - z, y];
                },
            },
            front: {
                shape: () => [model.width, model.height, model.depth],
                planeToModelSpace(x, y, z) {
                    return [x, model.height - 1 - y, model.depth - 1 - z];
                },
            },
        }[plane];

        this._model = model;
        this._shape = shape;
        this.planeToModelSpace = planeToModelSpace;
    }

    get width() {
        return this._shape()[0];
    }

    get height() {
        return this._shape()[1];
    }

    get depth() {
        return this._shape()[2];
    }

    get(x, y, z) {
        return this._model.get(...this.planeToModelSpace(x, y, z));
    }

    set(x, y, z, properties) {
        this._model.set(...this.planeToModelSpace(x, y, z), properties);
    }

    insertLayer(z) {
        const model = this._model;

        // Get old width, height, depth, and voxels
        let oVoxels = model._voxels;

        let dSize;
        {
            let a = this.planeToModelSpace(0, 0, 0);
            let b = this.planeToModelSpace(0, 0, 1);
            dSize = [Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])];
        }

        // Calculate and set new width, height, depth, and voxels
        let nw = model.width + dSize[0];
        let nh = model.height + dSize[1];
        let nd = model.depth + dSize[2];
        model._voxels = ndarray(new Array(), [nw, nh, nd]);

        // Copy/transfer and insert
        for (let pz = 0; pz < this.depth; pz++) {
            switch (Math.sign(pz - z)) {
                case 1:
                    for (let px = 0; px < this.width; px++) {
                        for (let py = 0; py < this.height; py++) {
                            let [mx, my, mz] = this.planeToModelSpace(px, py, pz);

                            model._voxels.set(mx, my, mz, oVoxels.get(mx, my, mz));
                        }
                    }
                    break;
                case 0:
                    for (let px = 0; px < this.width; px++) {
                        for (let py = 0; py < this.height; py++) {
                            let [mx, my, mz] = this.planeToModelSpace(px, py, pz);

                            model._voxels.set(mx, my, mz, {
                                color: 0x00000000,
                                selected: false,
                            });
                        }
                    }
                    break;
                case -1:
                    for (let px = 0; px < this.width; px++) {
                        for (let py = 0; py < this.height; py++) {
                            let [mx, my, mz] = this.planeToModelSpace(px, py, pz);
                            let [ox, oy, oz] = this.planeToModelSpace(px, py, pz + 1);

                            model._voxels.set(mx, my, mz, oVoxels.get(ox, oy, oz));
                        }
                    }
                    break;
            }
        }

        this._model.emit("change");
    }

    swapLayers(z0, z1) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let temp = this.get(x, y, z0);
                this.set(x, y, z0, this.get(x, y, z1));
                this.set(x, y, z1, temp);
            }
        }
    }

    duplicateLayer(z, ignore = ["selected"]) {
        this.insertLayer(z + 1);

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let voxel = this.get(x, y, z);

                for (let prop of ignore) {
                    delete voxel[prop];
                }

                this.set(x, y, z + 1, voxel);
            }
        }
    }
}

function bufferize(arrayLike, bytesPerElement) {
    const BYTES_PER_ELEMENT = bytesPerElement || arrayLike.BYTES_PER_ELEMENT || 1;
    const BYTE_SIZE_ORDER = Math.ceil(Math.log2(BYTES_PER_ELEMENT));

    let buffer = Buffer.allocUnsafe(arrayLike.length * BYTES_PER_ELEMENT);
    let writeFn =
        buffer.__proto__[
            `write${["UInt8", "UInt16BE", "UInt32BE", "BigUInt64BE"][BYTE_SIZE_ORDER]}`
        ];

    for (let i = 0; i < arrayLike.length; i++) {
        writeFn.call(buffer, arrayLike[i], i * BYTES_PER_ELEMENT);
    }

    return buffer;
}

function debufferize(bufferLike, bytesPerElement) {
    const BYTES_PER_ELEMENT = bytesPerElement || 1;
    const BYTE_SIZE_ORDER = Math.ceil(Math.log2(BYTES_PER_ELEMENT));

    let array = new Array(Math.floor(bufferLike.length / BYTES_PER_ELEMENT));
    let readFn =
        bufferLike.__proto__[
            `read${["UInt8", "UInt16BE", "UInt32BE", "BigUInt64BE"][BYTE_SIZE_ORDER]}`
        ];

    for (let i = 0; i < array.length; i++) {
        array[i] = readFn.call(bufferLike, i * BYTES_PER_ELEMENT);
    }

    return array;
}

module.exports = Model;
