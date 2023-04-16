let oldArrayPrototype = Array.prototype // 获取数组的老的原型方法

export let arrayMethods = Object.create(oldArrayPrototype) // 让arrayMethods通过__proto__能获取到数组的方法
// arrayMethods.__proto__ = oldArrayPrototype
// arrayMethods.push = function

let methods = [ // 只有这7个方法 可以导致数组发生变化
  'push',
  'shift',
  'pop',
  'unshift',
  'reverse',
  'sort',
  'splice'
]

methods.forEach(method => {
  arrayMethods[method] = function (...args) {
    // 数组新增的属性要看一下是不是对象 如果是对象 继续进行劫持
    // 需要调用数组原生逻辑
    oldArrayPrototype[method].call(this, ...args)
    // todo... 可以添加自己逻辑 函数劫持 切片
    let inserted = null
    const ob = this.__ob__
    switch (method) {
      case 'splice': // 修改 删除 添加
        inserted = args.slice(2) // splice从第三个参数起 是增添的新数据
      case 'push':
      case 'unshift':
        inserted = args // 调用push和unshift 传递的参数就是新增的逻辑
        break
    }
    // inserted 遍历数组 看一下它是否需要进行劫持
    if (inserted) {
      ob.observeArray(inserted)
    }
    ob.dep.notify() // 触发页面更新流程
  }
})

// 属性的查找：是先找自己身上的，找不到去原型上查找
