(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  function isFunction(val) {
    return typeof val === 'function';
  }
  function isObject(val) {
    return typeof val === 'object' && val !== null;
  }
  let isArray = Array.isArray;

  let oldArrayPrototype = Array.prototype; // 获取数组的老的原型方法

  let arrayMethods = Object.create(oldArrayPrototype); // 让arrayMethods通过__proto__能获取到数组的方法
  // arrayMethods.__proto__ = oldArrayPrototype
  // arrayMethods.push = function

  let methods = [
  // 只有这7个方法 可以导致数组发生变化
  'push', 'shift', 'pop', 'unshift', 'reverse', 'sort', 'splice'];
  methods.forEach(method => {
    arrayMethods[method] = function (...args) {
      // 数组新增的属性要看一下是不是对象 如果是对象 继续进行劫持
      // 需要调用数组原生逻辑
      oldArrayPrototype[method].call(this, ...args);
      // todo... 可以添加自己逻辑 函数劫持 切片
      let inserted = null;
      const ob = this.__ob__;
      switch (method) {
        case 'splice':
          // 修改 删除 添加
          inserted = args.slice(2);
        // splice从第三个参数起 是增添的新数据
        case 'push':
        case 'unshift':
          inserted = args; // 调用push和unshift 传递的参数就是新增的逻辑
          break;
      }
      // inserted 遍历数组 看一下它是否需要进行劫持
      if (inserted) {
        ob.observeArray(inserted);
      }
    };
  });

  // 属性的查找：是先找自己身上的，找不到去原型上查找

  // 1.每个对象都有一个__proto__属性 它指向所属类的原型 fn.__proto__ = Function.prototype
  // 2.每个原型上都有一个constructor属性 指向函数本身 Function.prototype.constructor = Function
  class Observer {
    constructor(value) {
      // 不让__ob__被遍历到
      // value.__ob__ = this // 我给对象和数组添加一个自定义属性
      Object.defineProperty(value, '__ob__', {
        value: this,
        enumerable: false // 表示这个属性不能被列举出来 不能被循环到
      });

      if (isArray(value)) {
        // 更改数组原型方法，如果是数组 我就改写数组的原型链
        value.__proto__ = arrayMethods;
        this.observeArray(value);
      } else {
        this.walk(value); // 核心就是循环对象
      }
    }

    observeArray(data) {
      // 递归遍历数组，对数组内部的对象再次进行重写
      data.forEach(item => {
        observe(item); // 数组里面如果是引用类型 那么是响应式的
      });
    }

    walk(data) {
      Object.keys(data).forEach(key => {
        // 要使用defineProperty重新定义
        defineReactive(data, key, data[key]);
      });
    }
  }

  // vue2应用了defineProperty需要一加载的时候 就进行递归操作 所以耗性能 如果层次过深也会浪费性能
  // 1.性能优化的原则:
  // 1）不要把所有的数据都放到data中 因为所有的数据都会增加get和set
  // 2）不要写数据的时候 层次过深 尽量扁平化数据
  // 3）不要频繁获取数据
  // 4）如果数据不需要响应式 可以使用Object.freeze 冻结属性
  function defineReactive(obj, key, value) {
    // vue2慢的原因 主要在这个方法中
    observe(value); // 递归进行观测数据 不管有多少层 我都进行defineProperty
    Object.defineProperty(obj, key, {
      get() {
        // 后续会有很多逻辑
        return value; // 闭包，次此value 会像上层的value进行查找
      },

      set(newValue) {
        // 如果设置的是一个对象那么会再次进行劫持
        if (newValue === value) return;
        observe(newValue);
        console.log('修改');
        value = newValue;
      }
    });
  }
  function observe(value) {
    // 1.如果value不是对象 那么就不用观测了 说明写的有问题
    if (!isObject(value)) {
      return;
    }
    if (value.__ob__) {
      return; // 一个对象不需要重新被观测
    }

    // 需要对对象进行观测（最外层必须是一个{} 不能是数组）
    // 如果一个数据已经被观测过了 就不要在进行观测了 用类来实现 我管测过就增加一个标识 说明观测过了 在观测的时候可以先检测是否观测过 如果观测过了就跳过
    return new Observer(value);
  }

  function initState(vm) {
    const opts = vm.$options;
    if (opts.data) {
      initData(vm);
    }
  }
  function proxy(vm, key, source) {
    // 取值的时候做代理 不是暴力的把_data属性赋予给vm 而且直接赋值会有命名冲突问题
    Object.defineProperty(vm, key, {
      get() {
        return vm[source][key];
      },
      set(newValue) {
        vm[source][key] = newValue;
      }
    });
  }
  function initData(vm) {
    let data = vm.$options.data; // 用户传入的数据

    // 如果用户传递的是一个函数 则取函数的返回值作为对象 如果就是对象那就直接使用这个对象
    // 只有根实例可以是一个对象
    data = vm._data = isFunction(data) ? data.call(vm) : data;

    // 需要将data变成响应式的 Object.defineProperty 重写data中的所有属性
    observe(data); // 观测数据

    for (let key in data) {
      // vm.message => vm._data.message
      proxy(vm, key, '_data');
    }
  }

  function initMixin(Vue) {
    // 后续组件化开发的时候 Vue.extend 可以创造一个子组件 子组件可以继承Vue 子组件也可以调用_init方法
    Vue.prototype._init = function (options) {
      const vm = this;

      // 把用户的选项放到vue上，这样在其他地方中都可以获取到options了
      vm.$options = options; // 为了后续扩展的方法都可以获取$options选项

      // options中用户传入的数据 el data
      initState(vm);
      if (vm.$options.el) {
        // 要将数据挂再到页面上
        console.log('页面要挂载');
      }
    };
  }

  // vue要如何实现 原型模式 所有的功能都通过原型扩展的方式来添加
  function Vue(options) {
    this._init(options); // 实现vue的初始化功能
  }

  initMixin(Vue);

  // 1.new Vue 会调用_init方法进行初始化操作
  // 2.会将用户的选项放到 vm._options 上
  // 3.会对当前属性上搜索有没有data数据 initState
  // 4.有data判断data是不是一个函数 如果是函数取返回值 initData
  // 5.observe去观测data中的数据 和vm没关系 说明data已经变成了响应式
  // 6.vm上想取值也能渠道data中的数据 vm._data = data 这样用户能取到data了 vm._data
  // 7.用户觉得有点麻烦 vm.xxx => vm._data
  // 8.如果更新对象不存在的属性 会导致视图不更新 如果是数组更新索引和长度不会触发更新
  // 9.如果是替换成一个新对象 新对象会被进行劫持 如果数组存放新内容push unshift 新增的内容也会被劫持 通过__ob__进行表示这个对象被监控过（在vue中被监控的对象都有一个__ob__这个属性）

  return Vue;

}));
//# sourceMappingURL=vue.js.map
