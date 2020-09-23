const fs = require("fs");
const NdArray = require("./ndarray.js");

class Model {
    constructor(x = 1, y = 1, z = 1) {
        this._voxels = new NdArray(x, y, z);

        this._voxels.forEach((_, x, y, z) => {
            this._voxels[x][y][z] = {
                color: 0x00000000,
                selected: false,
            };
        });
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
        return (
            x >= 0 &&
            x < this.width &&
            y >= 0 &&
            y < this.height &&
            z >= 0 &&
            z < this.depth
        );
    }

    getVoxelAt(x, y, z) {
        return this._voxels[x][y][z];
    }

    setVoxelAt(x, y, z, properties) {
        if (this._bounded(x, y, z)) {
            Object.assign(this._voxels[x][y][z], properties);
        } else if ("color" in properties) {
            this.expandToInclude(x, y, z);
            this.setVoxelAt(
                ...this.constrainPositionToBounds(x, y, z),
                properties
            );
        }
    }

    expandToInclude(x, y, z) {
        let xOffs = -Math.min(0, x);
        let yOffs = -Math.min(0, y);
        let zOffs = -Math.min(0, z);

        let nw = Math.max(x - this.width + 1, xOffs) + this.width;
        let nh = Math.max(y - this.height + 1, yOffs) + this.height;
        let nd = Math.max(z - this.depth + 1, zOffs) + this.depth;

        let oldVoxels = this._voxels;
        this._voxels = new NdArray(nw, nh, nd);

        this._voxels.forEach((_, px, py, pz) => {
            let ox = px - xOffs;
            let oy = px - yOffs;
            let oz = pz - zOffs;

            this._voxels[px][py][pz] = oldVoxels?.[ox]?.[oy]?.[oz] || {
                color: 0x00000000,
                selected: false,
            };
        });
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

        this._voxels.forEach((_, x, y, z) => {
            let voxelContainer = {
                get value() {
                    return model.getVoxelAt(x, y, z);
                },
                set value(value) {
                    model.setVoxelAt(x, y, z, value);
                },
            };

            callbackfn(voxelContainer, x, y, z);
        });
    }

    getPlane(plane) {
        return new Plane(this, plane);
    }

    getShapeOfPlane(plane) {
        let shape = this._voxels.shape;
        return {
            right: [shape[2], shape[1], shape[0]],
            top: [shape[2], shape[0], shape[1]],
            left: [shape[0], shape[1], shape[2]],
        }[plane];
    }

    async save(url, overwrite = false, batchSize = 0x100) {
        let fileStream = fs.createWriteStream(url, {
            flags: overwrite ? "w" : "wx",
        });

        const safeWrite = (data) =>
            new Promise((resolve) => {
                if (fileStream.write(data)) {
                    process.nextTick(resolve);
                } else {
                    fileStream.once("drain", resolve);
                }
            });

        {
            let headerBuffer = Buffer.allocUnsafe(18);

            headerBuffer.write("SCRCAD", "ascii");
            headerBuffer.writeUInt32BE(this.width, 6);
            headerBuffer.writeUInt32BE(this.height, 10);
            headerBuffer.writeUInt32BE(this.depth, 14);

            await safeWrite(headerBuffer);
        }

        {
            let voxelQueue = [];
            this.forEach((vx) => voxelQueue.push(vx));

            const writeNextBatch = async function () {
                let batch = Buffer.allocUnsafe(
                    Math.min(batchSize, voxelQueue.length) * 4
                );

                for (let i = 0; i < batchSize && voxelQueue.length > 0; i++) {
                    let voxel = voxelQueue.shift().value;
                    batch.writeUInt32BE(voxel.color, i * 4);
                }

                await safeWrite(batch);
            };

            while (voxelQueue.length > 0) {
                await writeNextBatch();
            }
        }

        await new Promise((resolve, reject) => {
            fileStream.end((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    static async load(filename) {}
}

class Plane {
    constructor(model, plane) {
        this._shape = model.getShapeOfPlane(plane);

        this.planeToModelSpace = {
            right(x, y, z) {
                return [this.depth - z, y, x];
            },
            top(x, y) {
                return [this.height - 1 - y, this.depth - 1 - z, x];
            },
            left(x, y) {
                return [x, y, z];
            },
        }[plane];

        this._model = model;
    }

    get width() {
        return this._shape[0];
    }

    get height() {
        return this._shape[1];
    }

    get depth() {
        return this._shape[2];
    }

    getVoxelAt(x, y, z) {
        return this._model.getVoxelAt(...this.planeToModelSpace(x, y, z));
    }

    setVoxelAt(x, y, z, properties) {
        this._model.setVoxelAt(...this.planeToModelSpace(x, y, z), properties);
    }

    forEachInZLayer(z, callbackfn) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let [mx, my, mz] = this.planeToModelSpace(x, y, z);
                let voxelContainer = {
                    get value() {
                        return this._model.getVoxelAt(mx, my, mz);
                    },
                    set value(value) {
                        this.setVoxelAt(mx, my, mz, value);
                    },
                };

                callbackfn(voxelContainer, x, y, z);
            }
        }
    }
}

module.exports = Model;
