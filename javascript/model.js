const fs = require("fs");
const msgpack = require("msgpack5")();
const ndarray = require("ndarray");

class Model {
    constructor(width = 1, height = 1, depth = 1, voxels = null) {
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
        this._changedChunks = new Set();
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

    _bounded(x, y, z) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
    }

    getVoxelAt(x, y, z) {
        return this._voxels.get(x, y, z);
    }

    setVoxelAt(x, y, z, properties) {
        if (this._bounded(x, y, z)) {
            Object.assign(this.getVoxelAt(x, y, z), properties);
        } else if ("color" in properties) {
            this.expandToInclude(x, y, z);
            this.setVoxelAt(...this.constrainPositionToBounds(x, y, z), properties);
        }
    }

    expandToInclude(x, y, z) {
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

    constrainPositionToBounds(x, y, z) {
        return [
            Math.max(0, Math.min(this.width - 1, x)),
            Math.max(0, Math.min(this.height - 1, y)),
            Math.max(0, Math.min(this.depth - 1, z)),
        ];
    }

    forEach(callbackfn) {
        let model = this;

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.depth; z++) {
                    let voxelContainer = {
                        get value() {
                            return model.getVoxelAt(x, y, z);
                        },
                        set value(value) {
                            model.setVoxelAt(x, y, z, value);
                        },
                    };

                    callbackfn(voxelContainer, x, y, z);
                }
            }
        }
    }

    getPlane(plane) {
        return new Plane(this, plane);
    }

    async save(path) {
        let lastColorIndex = -1;
        let palette = {};

        let voxelData = this._voxels.data.map((voxel) => {
            let color = voxel.color;
            let colorIndex = palette[color] || (palette[color] = ++lastColorIndex);
            return colorIndex;
        });

        let paletteData = Object.keys(palette).sort((a, b) => palette[a] - palette[b]);
        let paletteBuffer = bufferize(new Uint32Array(paletteData));

        let paletteSize = Object.keys(palette).length;
        let bytesPerColorIndex = Math.ceil(Math.log2(paletteSize) / Math.log2(0x100)) || 1;

        let voxelBuffer = bufferize(voxelData, bytesPerColorIndex);

        let modelFileObject = {
            SCRCAD: "1.0",
            X: this.width,
            Y: this.height,
            Z: this.depth,
            PAL: paletteBuffer,
            VOX: voxelBuffer,
        };

        let modelFileBuffer = msgpack.encode(modelFileObject);
        await fs.promises.writeFile(path, modelFileBuffer);
    }

    static async load(path) {
        let modelFileBuffer = await fs.promises.readFile(path);
        let modelFileObject = msgpack.decode(modelFileBuffer);

        let { X: width, Y: height, Z: depth } = modelFileObject;

        let paletteBuffer = modelFileObject["PAL"];
        let palette = debufferize(paletteBuffer, 4);

        let paletteSize = palette.length;
        let bytesPerColorIndex = Math.ceil(Math.log2(paletteSize) / Math.log2(0x100)) || 1;

        let voxelBuffer = modelFileObject["VOX"];
        let voxelData = debufferize(voxelBuffer, bytesPerColorIndex);

        let voxels = voxelData.map((colorIndex) => ({
            color: palette[colorIndex],
            selected: false,
        }));

        return new Model(width, height, depth, voxels);
    }

    static calculateChunkID(x, y, z) {
        return [x, y, z].join(";");
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

    getVoxelAt(x, y, z) {
        return this._model.getVoxelAt(...this.planeToModelSpace(x, y, z));
    }

    setVoxelAt(x, y, z, properties) {
        this._model.setVoxelAt(...this.planeToModelSpace(x, y, z), properties);
    }

    forEachInZLayer(z, callbackfn) {
        const _model = this._model;

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let [mx, my, mz] = this.planeToModelSpace(x, y, z);

                let voxelContainer = {
                    get value() {
                        return _model.getVoxelAt(mx, my, mz);
                    },
                    set value(value) {
                        _model.setVoxelAt(mx, my, mz, value);
                    },
                };

                callbackfn(voxelContainer, x, y, z);
            }
        }
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
    }

    swapLayers(i, j) {
        let tempLayer = ndarray(new Array(this.width * this.height), [this.width, this.height]);

        this.forEachInZLayer(i, (vc, x, y) => {
            tempLayer.set(x, y, { ...vc.value });
            vc.value = this.getVoxelAt(x, y, j);
        });

        this.forEachInZLayer(j, (vc, x, y) => {
            vc.value = tempLayer.get(x, y);
        });
    }

    duplicateLayer(z) {
        this.insertLayer(z + 1);

        this.forEachInZLayer(z + 1, (vc, x, y) => {
            vc.value.color = this.getVoxelAt(x, y, z).color;
        });
    }

    clearLayer(z) {
        this.forEachInZLayer(z, (vc) => {
            vc.value = {
                color: 0x00000000,
            };
        });
    }
}

function bufferize(arrayLike, bytesPerElement) {
    const BYTES_PER_ELEMENT = bytesPerElement || arrayLike.BYTES_PER_ELEMENT || 1;
    const BYTE_SIZE_ORDER = Math.ceil(Math.log2(BYTES_PER_ELEMENT));

    let buffer = Buffer.allocUnsafe(arrayLike.length * BYTES_PER_ELEMENT);
    let writeFn = buffer.__proto__[`write${["UInt8", "UInt16BE", "UInt32BE", "BigUInt64BE"][BYTE_SIZE_ORDER]}`];

    for (let i = 0; i < arrayLike.length; i++) {
        writeFn.call(buffer, arrayLike[i], i * BYTES_PER_ELEMENT);
    }

    return buffer;
}

function debufferize(bufferLike, bytesPerElement) {
    const BYTES_PER_ELEMENT = bytesPerElement || 1;
    const BYTE_SIZE_ORDER = Math.ceil(Math.log2(BYTES_PER_ELEMENT));

    let array = new Array(Math.floor(bufferLike.length / BYTES_PER_ELEMENT));
    let readFn = bufferLike.__proto__[`read${["UInt8", "UInt16BE", "UInt32BE", "BigUInt64BE"][BYTE_SIZE_ORDER]}`];

    for (let i = 0; i < array.length; i++) {
        array[i] = readFn.call(bufferLike, i * BYTES_PER_ELEMENT);
    }

    return array;
}

module.exports = Model;
