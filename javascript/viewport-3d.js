const THREE = require("three");

module.exports = (app) => ({
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    view: {
        width: 0,
        height: 0,
        zoom: 0,
        xOffset: 0,
        yOffset: 0,
    },
    init() {
        this.canvas = document.getElementById("preview-canvas");
        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setClearColor(0, 0);

        // Test scene
        let geometry = new THREE.BoxGeometry(25, 25, 25);
        let material = new THREE.MeshNormalMaterial();
        for (let i = 0; i < 300; i++) {
            let cube = new THREE.Mesh(geometry, material);
            cube.rotateX(Math.random() * 180);
            cube.rotateY(Math.random() * 180);
            cube.rotateZ(Math.random() * 180);
            cube.position.x = Math.random() - 0.5;
            cube.position.y = Math.random() - 0.5;
            cube.position.z = Math.random() - 0.5;
            cube.position.normalize();
            cube.position.multiplyScalar(Math.random() * 200);
            this.scene.add(cube);
        }

        this.setView({
            width: this.canvas.parentElement.clientWidth,
            height: this.canvas.parentElement.clientHeight,
            zoom: 1,
        });
    },
    invalidate() {
        // Don't allow more than one uncompleted animation frame request at once
        this._anim =
            this._anim ||
            requestAnimationFrame(() => {
                this._anim = undefined;
                this.render();
            });
    },
    render() {
        this.renderer.render(this.scene, this.camera);
    },
    setView(view) {
        Object.assign(this.view, view);
        let { width, height, zoom, xOffset, yOffset } = this.view;

        // Calculate camera viewing planes based on zoom and aspect ratio
        let aspectRatio = width / height;
        if (width > height) {
            this.camera.right = (height * aspectRatio) / 2 / zoom;
            this.camera.top = height / 2 / zoom;
        } else {
            this.camera.right = width / 2 / zoom;
            this.camera.top = width / aspectRatio / 2 / zoom;
        }
        this.camera.left = -this.camera.right;
        this.camera.bottom = -this.camera.top;

        // Apply position offsets
        this.camera.left += xOffset;
        this.camera.right += xOffset;
        this.camera.top += yOffset;
        this.camera.bottom += yOffset;

        // Have (z: 0) always be in the center of the cameras viewing box
        this.camera.position.z = this.camera.far / 2;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        this.invalidate();
    },
});
