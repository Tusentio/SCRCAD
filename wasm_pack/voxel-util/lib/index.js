const path = require("path");

const worker = new Worker(path.resolve(path.dirname(__filename), "./worker.js"));
const waitList = {};

worker.onmessage = function (e) {
    waitList[e.data.id].resolve(e.data.result);
};

worker.onerror = function (e) {
    for (let pending of Object.values(waitList)) {
        pending.reject(e.error);
    }
};

module.exports = new Proxy(worker, {
    get(target, prop) {
        return async function (...params) {
            let id;
            do {
                id = ((Math.random() * 0x7fffffff) | 0).toString(16);
            } while (Object.keys(waitList).includes(id));

            let request = {
                id: id,
                action: prop,
                params: params,
            };

            return await new Promise((resolve, reject) => {
                waitList[request.id] = { resolve, reject };
                target.postMessage(request);
            });
        };
    },
});
