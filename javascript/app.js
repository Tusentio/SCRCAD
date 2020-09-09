module.exports = {
    vueInstance: undefined,
    init(Vue) {
        this.vueInstance = new Vue({
            el: "#vue-wrapper",
            data: {},
            methods: {}
        });
    }
}