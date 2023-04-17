export function createElement(vm, tag, data = {}, ...children) { // 返回虚拟节点
  return vnode(vm, tag, data, children, data.key, undefined)
}

export function createText(vm, text) { // 返回虚拟节点
  return vnode(vm, undefined, undefined, undefined, undefined, text)
}

// 看两个节点是不是相同节点 就看是不是tag和key一样
// Vue2就有一个性能问题 递归比对
export function isSameVnode(newVnode, oldVnode) {
  return (newVnode.tag === oldVnode.tag) && (newVnode.key === oldVnode.key)
}

function vnode(vm, tag, data, children, key, text) {
  return {
    vm, tag, data, children, key, text
  }
}

// vnode 其实就是一个对象 用来描述节点的 这个和ast长的很像啊？
// ast描述语法 他并没有用户自己的逻辑 只有语法解析出来的内容
// vnode他是描述dom结构的 可以自己去扩展属性
