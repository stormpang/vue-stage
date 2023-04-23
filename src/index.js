import {initMixin} from './init'
import {renderMixin} from "./render";
import {lifeCycleMixin} from "./lifeCycle";
import {initGlobalAPI} from "./global-api";
import {compileToFunction} from "./compiler";
import {createElm, patch} from "./vnode/patch";

// vue要如何实现 原型模式 所有的功能都通过原型扩展的方式来添加
function Vue(options) {
  this._init(options) // 实现vue的初始化功能
}

initMixin(Vue)
renderMixin(Vue)
lifeCycleMixin(Vue)

initGlobalAPI(Vue)

// 先生成一个虚拟节点
// let vm = new Vue({
//   data() {
//     return {name: 'jw'}
//   }
// })
// let render = compileToFunction((`<div>
//   <li key="A" style="color: red">A</li>
//   <li key="B" style="color: blue">B</li>
//   <li key="C" style="color: green">C</li>
//   <li key="D" style="color: grey">D</li>
// </div>`))
// let oldVnode = render.call(vm)
// let el = createElm(oldVnode)
// document.body.appendChild(el)
//
// // 再生成一个新的虚拟节点 patch
// const vm2 = new Vue({
//   data() {
//     return {name: 'zf'}
//   }
// })
// const render2 = compileToFunction(`<div>
//   <li key="F" style="color: red">F</li>
//   <li key="B" style="color: blue">B</li>
//   <li key="A" style="color: red">A</li>
//   <li key="E" style="color: green">E</li>
//   <li key="P" style="color: grey">P</li>
// </div>`)
// const newVnode = render2.call(vm2)
// setTimeout(() => {
//   patch(oldVnode, newVnode) // 比对两个虚拟节点的差异 更新需要更新的地方
// }, 2000)

// 导出Vue给别人使用
export default Vue

// 1.new Vue 会调用_init方法进行初始化操作
// 2.会将用户的选项放到 vm._options 上
// 3.会对当前属性上搜索有没有data数据 initState
// 4.有data判断data是不是一个函数 如果是函数取返回值 initData
// 5.observe去观测data中的数据 和vm没关系 说明data已经变成了响应式
// 6.vm上想取值也能渠道data中的数据 vm._data = data 这样用户能取到data了 vm._data
// 7.用户觉得有点麻烦 vm.xxx => vm._data
// 8.如果更新对象不存在的属性 会导致视图不更新 如果是数组更新索引和长度不会触发更新
// 9.如果是替换成一个新对象 新对象会被进行劫持 如果数组存放新内容push unshift 新增的内容也会被劫持 通过__ob__进行表示这个对象被监控过（在vue中被监控的对象都有一个__ob__这个属性）
// 10. 如果你就想改索引 可以使用$set方法 内部就是splice

// 只有根组件的情况：每个属性都有一个dep
// 1.vue里面用到了观察者模是，默认组件选人的时候，会创建一个watcher（并且会渲染视频）
// 2.当渲染视图的时候，会取data的数据，会走每个属性的get方法，就让这个属性的dep记录watcher
// 3. 同时让watcher也记住dep（这个逻辑目前没用到）dep和watcher是多对多的关系，因为一个属性可能对应多个视图，一个视图对应多个数据
// 4.如果数据发生变化，会通知对应属性的dep，依次通知存放的watcher去更新

// 1.Vue.component 注册成全局组件 内部会自动调用Vue.extend方法 返回组件的构造函数
// 2.组件初始化的时候 会做一个合并mergeOptions（自己的组件.__proto__ = 全局的组件）
// 3.内部会对模版进行编译操作 _c('组件的名字')做筛查如果是组件就创造一个组件的虚拟节点 还会判断Ctor 如果对象会调用Vue.extend 所有的组件通过Vue.extend方法来实现的（componentOptions 里面放着组件的所有内容 属性的实现 事件的实现 插槽内容 Ctor）
// 4. 创建组件的真实节点（new Ctor 拿到组件的实例 并且调用组件的$mount方法 会生成一个$el对应组件模版渲染后的结果）vnode.componentInstance = new Ctor() vnode.componentInstance.$el => 组件渲染后结果
// 5. 将组件的vnode.componentInstance.$el 插入到父标签中
// 6. 组件在 new Ctor() 时 会进行组件的初始化 给组件再次添加一个独立的渲染watcher（每个组件都有自己的watcher）更新时 只需要更新自己组件对应的渲染watcher（因为组件渲染时 组件对应的属性回收机自己的渲染watcher）
