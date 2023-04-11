import {isFunction} from "./utils";
import {observe} from "./observe";

export function initState(vm) {
  const opts = vm.$options

  if (opts.data) {
    initData(vm)
  }
}

function proxy(vm, key, source) { // 取值的时候做代理 不是暴力的把_data属性赋予给vm 而且直接赋值会有命名冲突问题
  Object.defineProperty(vm, key, {
    get() {
      return vm[source][key]
    },
    set(newValue) {
      vm[source][key] = newValue
    }
  })
}

function initData(vm) {
  let data = vm.$options.data // 用户传入的数据

  // 如果用户传递的是一个函数 则取函数的返回值作为对象 如果就是对象那就直接使用这个对象
  // 只有根实例可以是一个对象
  data = vm._data = isFunction(data) ? data.call(vm) : data

  // 需要将data变成响应式的 Object.defineProperty 重写data中的所有属性
  observe(data) // 观测数据

  for (let key in data) { // vm.message => vm._data.message
    proxy(vm, key, '_data')
  }
}
