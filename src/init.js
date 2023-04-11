import {initState} from "./state";

export function initMixin(Vue) {
  // 后续组件化开发的时候 Vue.extend 可以创造一个子组件 子组件可以继承Vue 子组件也可以调用_init方法
  Vue.prototype._init = function (options) {
    const vm = this

    // 把用户的选项放到vue上，这样在其他地方中都可以获取到options了
    vm.$options = options // 为了后续扩展的方法都可以获取$options选项

    // options中用户传入的数据 el data
    initState(vm)

    if (vm.$options.el) {
      // 要将数据挂再到页面上
      console.log('页面要挂载')
    }
  }
}
