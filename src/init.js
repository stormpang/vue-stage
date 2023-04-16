import {initState} from "./state";
import {compileToFunction} from "./compiler";
import {mountComponent} from "./lifeCycle";
import {mergeOptions, nextTick} from "./utils";

export function initMixin(Vue) {
  // 后续组件化开发的时候 Vue.extend 可以创造一个子组件 子组件可以继承Vue 子组件也可以调用_init方法
  Vue.prototype._init = function (options) {
    const vm = this

    // 把用户的选项放到vue上，这样在其他地方中都可以获取到options了
    vm.$options = mergeOptions(vm.constructor.options, options) // 为了后续扩展的方法都可以获取$options选项

    // options中用户传入的数据 el data
    initState(vm)

    if (vm.$options.el) {
      // 要将数据挂再到页面上

      // 现在数据已经被劫持了,数据变化需要更新视图 diff算法更新需要更新的部分
      // vue -> template(写起来更符合直觉) -> jax(灵活)
      // vue3 template 写起来性能会更高一些 内部做了很多优化

      // template -> ast语法树(用来描述语法本身) -> 描述成一个树结构 -> 将代码重组成js语法
      // 模版编译原理(把template模版编译成render函数 -> 虚拟DOM -> diff算法比对虚拟DOM)

      // ast -> render返回 -> vnode -> 生成真实DOM
      // 更新的时候再次调用render -> 新的vnode -> 新旧比对 -> 更新真实DOM

      vm.$mount(vm.$options.el)
    }
  }

  // new Vue({el}) new Vue().$mount
  Vue.prototype.$mount = function (el) {
    const vm = this
    const opts = vm.$options
    el = document.querySelector(el) // 获取真实的元素
    vm.$el = el // 页面真实元素

    if (!opts.render) {
      // 模版变异
      let template = opts.template
      if (!template) {
        template = el.outerHTML
      }
      const render = compileToFunction(template)
      opts.render = render
    }

    // 这里已经获取到了一个render函数 这个函数他的返回值 _c('div',{id:'app'},_c('span',undefined,'hello'))
    mountComponent(vm)
  }

  Vue.prototype.$nextTick = nextTick
}
