(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  function isFunction(val) {
    return typeof val == 'function';
  }
  function isObject(val) {
    return typeof val == 'object' && val !== null;
  }
  let callbacks = [];
  let waiting = false;
  function flushCallbacks() {
    callbacks.forEach(fn => fn()); // 按照顺序清空nextTick
    callbacks = [];
    waiting = false;
  }
  function nextTick(fn) {
    // vue3 里面的nextTick 就是promise ， vue2里面做了一些兼容性处理
    callbacks.push(fn);
    if (!waiting) {
      Promise.resolve().then(flushCallbacks);
      waiting = true;
    }
  }
  let isArray = Array.isArray;

  // {a:1} {b:1,a:2}  => {b:1,a:[1,2]}

  // {}  {beforeCreate:fn}  => {beforecreatre:[fn]}
  // {beforecreatre:[fn]} {beforeCreate:fn}  => {beforecreatre:[fn,fn]}

  let strats = {}; // 存放所有策略

  let lifeCycle = ['beforeCreate', 'created', 'beforeMount', 'mounted'];
  lifeCycle.forEach(hook => {
    strats[hook] = function (parentVal, childVal) {
      if (childVal) {
        if (parentVal) {
          // 父 子 都有值 用父和子拼接在一起， 父有值就一定是数组
          return parentVal.concat(childVal);
        } else {
          // 儿子有值 父亲没有值
          if (isArray(childVal)) {
            return childVal;
          }
          return [childVal]; // 如果没值 就会变成数组
        }
      } else {
        return parentVal;
      }
    };
  });
  function mergeOptions(parentVal, childVal) {
    const options = {};
    for (let key in parentVal) {
      mergeFiled(key);
    }
    for (let key in childVal) {
      if (!parentVal.hasOwnProperty(key)) {
        mergeFiled(key);
      }
    }
    function mergeFiled(key) {
      // 设计模式 策略模式
      let strat = strats[key];
      if (strat) {
        options[key] = strat(parentVal[key], childVal[key]); // 合并两个值
      } else {
        options[key] = childVal[key] || parentVal[key];
      }
    }
    return options;
  }

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
      ob.dep.notify(); // 触发页面更新流程
    };
  });

  // 属性的查找：是先找自己身上的，找不到去原型上查找

  let queue = []; // 这里存放要更新的watcher
  let has = {}; // 用来存储已有的watcher的id

  function flushSchedulerQueue() {
    // beforeUpdate
    queue.forEach(watcher => watcher.run());
    queue = []; // 这里存放要更新的watcher
    has = {};
    pending = false;
  }
  let pending = false;
  function queueWatcher(watcher) {
    // watcher1 watcher1 watcher1 watcher1  watcher2
    // 一般情况下 写去重 可以采用这种方式 ，如果你不使用set的时候
    let id = watcher.id;
    if (has[id] == null) {
      has[id] = true;
      queue.push(watcher); // [watcher1,watcher2]
      if (!pending) {
        // 防抖 多次执行 只走1次
        nextTick(flushSchedulerQueue);
        pending = true;
      }
    }
  }

  let id$1 = 0;
  class Watcher {
    constructor(vm, fn, cb, options) {
      // 要将dep放到watcher中
      this.vm = vm;
      this.fn = fn;
      this.cb = cb;
      this.options = options;
      this.id = id$1++;
      this.depsId = new Set();
      this.deps = [];
      this.getter = fn; // fn就是页面渲染逻辑
      this.get(); // 标识上来后就做一次初始化
    }

    addDep(dep) {
      const id = dep.id;
      if (!this.depsId.has(id)) {
        this.depsId.add(id);
        this.deps.push(dep); // 做了保存id的功能 并且让watcher记住dep
        dep.addSub(this);
      }
    }
    get() {
      Dep.target = this; // window.target = watcher
      this.getter(); // 页面渲染逻辑 _update(_render()) vm.name / vm.age
      Dep.target = null; // 渲染完毕后 就将标识清空了 只有在渲染的时候才会进行依赖收集
    }

    update() {
      // 每次更新数据都会同步调用这个update方法 我可以将更新的逻辑缓存起来 等会同步更新数据的逻辑执行完毕后 依次调用（去重的逻辑）
      console.log('缓存更新');
      queueWatcher(this);
      // 可以做异步更新处理
      // this.get() // vue.nextTick [fn1,fn2,fn3]
    }

    run() {
      console.log('真正执行更新');
      this.get();
    }
  }

  let id = 0;
  class Dep {
    constructor() {
      // 要把watcher放到dep中
      this.subs = [];
      this.id = id++;
    }
    depend() {
      // this.subs.push(Dep.target) // 让dep记住这个watcher,watcher还要记住dep 相互的关系
      Dep.target.addDep(this); // 在watcher中在调用dep的addSub方法
    }

    addSub(watcher) {
      this.subs.push(watcher); // 让dep记住watcher
    }

    notify() {
      this.subs.forEach(watcher => watcher.update());
    }
  }
  Dep.target = null; // 这里我用了一个全局的变量 window.target 静态属性

  // 1.每个对象都有一个__proto__属性 它指向所属类的原型 fn.__proto__ = Function.prototype
  // 2.每个原型上都有一个constructor属性 指向函数本身 Function.prototype.constructor = Function
  class Observer {
    constructor(value) {
      // 不让__ob__被遍历到
      // value.__ob__ = this // 我给对象和数组添加一个自定义属性
      // 如果给一个对象增添一个不存在的属性 我希望也能更新视图
      this.dep = new Dep(); // 给对象和数组都增加dep属性 {}.__ob__.dep  [].__ob__.dep
      Object.defineProperty(value, '__ob__', {
        value: this,
        enumerable: false // 表示这个属性不能被列举出来 不能被循环到
      });

      if (isArray(value)) {
        // 更改数组原型方法，如果是数组 我就改写数组的原型链
        value.__proto__ = arrayMethods;
        this.observeArray(value);

        // 数组 如何依赖收集 而且更新的时候 如何触发更新？
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
  function dependArray(value) {
    for (let i = 0; i < value.length; i++) {
      const current = value[i];
      current.__ob__ && current.__ob__.dep.depend();
      if (Array.isArray(current)) {
        dependArray(current);
      }
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
    const childOb = observe(value); // 递归进行观测数据 不管有多少层 我都进行defineProperty
    // childOb 如果有值 那么就是数组或对象
    const dep = new Dep(); // 每个属性都增加了一个dep
    Object.defineProperty(obj, key, {
      get() {
        // 后续会有很多逻辑
        if (Dep.target) {
          dep.depend();
          if (childOb) {
            childOb.dep.depend(); // 取属性的时候 会对对应的值（对象本身和数组）进行依赖收集
            if (Array.isArray(value)) {
              // 可能是数组套数组
              dependArray(value);
            }
          }
        }
        return value; // 闭包，次此value 会像上层的value进行查找
      },

      set(newValue) {
        // 如果设置的是一个对象那么会再次进行劫持
        if (newValue === value) return;
        observe(newValue);
        value = newValue;
        dep.notify(); // 拿到当前的dep里面的watcher依次执行
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

  // 1.默认vue在初始化的时候 会对对象每一个属性都进行劫持 增加dep属性 当取值的时候会做依赖收集
  // 2.默认还会对属性值（对象和数组的本身进行增加dep属性）进行依赖收集
  // 3.如果是属性变化 触发属性对应的dep去更新
  // 4.如果是数组更新 触发数组的本身dep进行更新
  // 5.如果取值的时候是数组还要让数组中的对象类型也进行依赖收集（递归依赖收集）
  // 6.如果数组里面放对象 默认对象里的属性实惠进行依赖收集的 因为在取值时 会进行JSON.stringify操作

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

  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // 匹配标签名的  aa-xxx
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`; //  aa:aa-xxx
  const startTagOpen = new RegExp(`^<${qnameCapture}`); //  此正则可以匹配到标签名 匹配到结果的第一个(索引第一个) [1]
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的 </div>  [1]
  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的

  // [1]属性的key   [3] || [4] ||[5] 属性的值  a=1  a='1'  a=""
  const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的  />    >

  function parserHTML(html) {
    // 可以不停的截取模版，直到把模版全部解析完毕

    // 我要构建父子关系
    let stack = [];
    let root = null;
    function createASTElement(tag, attrs, parent) {
      return {
        tag,
        type: 1,
        // 元素
        children: [],
        parent,
        attrs
      };
    }
    function start(tag, attrs) {
      // 遇到开始标签 就取栈中最后一个作为父节点
      let parent = stack[stack.length - 1];
      let element = createASTElement(tag, attrs, parent);
      if (root == null) {
        // 说明当前节点是根节点
        root = element;
      }
      if (parent) {
        element.parent = parent; // 更新p的parent属性 指向parent
        parent.children.push(element);
      }
      stack.push(element);
    }
    function end(tagName) {
      let endTag = stack.pop();
      if (endTag.tag !== tagName) {
        console.log('标签出错');
      }
    }
    function text(chars) {
      let parent = stack[stack.length - 1];
      chars = chars.replace(/\s/g, '');
      if (chars) {
        parent.children.push({
          type: 2,
          text: chars
        });
      }
    }
    function advance(len) {
      html = html.substring(len);
    }
    function parseStartTag() {
      const start = html.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          attrs: []
        };
        advance(start[0].length);
        let end;
        let attr;
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          // 要有属性并且不能为开始的结束标签
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5]
          });
          advance(attr[0].length);
        }
        if (end) {
          advance(end[0].length);
        }
        return match;
      }
      return false;
    }
    while (html) {
      // 解析标签和文本
      const index = html.indexOf('<');
      if (index === 0) {
        // 解析开始标签 并且把属性也解析出来
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          // 开始标签
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue;
        }
        let endTagMatch;
        if (endTagMatch = html.match(endTag)) {
          // 结束标签
          end(endTagMatch[1]);
          advance(endTagMatch[0].length);
          continue;
        }
        break;
      }

      // 文本
      if (index > 0) {
        const chars = html.substring(0, index);
        text(chars);
        advance(chars.length);
      }
    }
    return root;
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // {{   xxx  }}

  function genProps(attrs) {
    // {key:value,key:value,}
    let str = '';
    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];
      if (attr.name === 'style') {
        // {name:id,value:'app'}
        let styles = {};
        attr.value.replace(/([^;:]+):([^;:]+)/g, function () {
          styles[arguments[1]] = arguments[2];
        });
        attr.value = styles;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0, -1)}}`;
  }
  function gen(el) {
    if (el.type == 1) {
      return generate(el); // 如果是元素就递归的生成
    } else {
      let text = el.text; // {{}}
      if (!defaultTagRE.test(text)) return `_v('${text}')`; // 说明就是普通文本

      // 说明有表达式 我需要 做一个表达式和普通值的拼接 ['aaaa',_s(name),'bbb'].join('+)
      // _v('aaaa'+_s(name) + 'bbb')
      let lastIndex = defaultTagRE.lastIndex = 0;
      let tokens = []; // <div> aaa{{bbb}} aaa </div>
      let match;

      // ，每次匹配的时候 lastIndex 会自动向后移动
      while (match = defaultTagRE.exec(text)) {
        // 如果正则 + g 配合exec 就会有一个问题 lastIndex的问题
        let index = match.index;
        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)));
        }
        tokens.push(`_s(${match[1].trim()})`);
        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }
      return `_v(${tokens.join('+')})`; // webpack 源码 css-loader  图片处理
    }
  }

  function genChildren(el) {
    let children = el.children;
    if (children) {
      return children.map(item => gen(item)).join(',');
    }
    return false;
  }

  // _c(div,{},c1,c2,c3,c4)
  function generate(ast) {
    let children = genChildren(ast);
    let code = `_c('${ast.tag}',${ast.attrs.length ? genProps(ast.attrs) : 'undefined'}${children ? `,${children}` : ''})`;
    return code;
  }

  function compileToFunction(template) {
    // 1.将模版变成ast语法树
    let ast = parserHTML(template);

    // 2.代码优化 标记静态节点

    // 3.代码生成
    const code = generate(ast); // 模版引擎的实现原理 都是 new Function + with ejs jade handlerbar
    const render = new Function(`with(this){return ${code}}`);
    return render;
  }

  // 1.编译原理
  // 2.响应式原理 依赖收集
  // 3.组件化开发（贯穿了vue的流程）
  // 4.diff算法

  function createElement(vm, tag, data = {}, ...children) {
    // 返回虚拟节点
    return vnode(vm, tag, data, children, data.key, undefined);
  }
  function createText(vm, text) {
    // 返回虚拟节点
    return vnode(vm, undefined, undefined, undefined, undefined, text);
  }

  // 看两个节点是不是相同节点 就看是不是tag和key一样
  // Vue2就有一个性能问题 递归比对
  function isSameVnode(newVnode, oldVnode) {
    return newVnode.tag === oldVnode.tag && newVnode.key === oldVnode.key;
  }
  function vnode(vm, tag, data, children, key, text) {
    return {
      vm,
      tag,
      data,
      children,
      key,
      text
    };
  }

  // vnode 其实就是一个对象 用来描述节点的 这个和ast长的很像啊？
  // ast描述语法 他并没有用户自己的逻辑 只有语法解析出来的内容
  // vnode他是描述dom结构的 可以自己去扩展属性

  function patch(oldVnode, vnode) {
    const isRealElement = oldVnode.nodeType;
    if (isRealElement) {
      // 删除老节点 根据vnode创建新节点 替换掉老节点
      const elm = createElm(vnode); // 根据虚拟节点创造了真实节点
      const parentNode = oldVnode.parentNode;
      parentNode.insertBefore(elm, oldVnode.nextSibling); // el.nextSibling不存在就是null 如果为null nextSibling就是appendChild
      parentNode.removeChild(oldVnode);
      return elm; // 返回最新节点
    } else {
      // 只比较同级 如果不一样 儿子就不用比对了 根据当前节点 创建儿子 全部替换掉
      // diff算法如何实现？
      if (!isSameVnode(oldVnode, vnode)) {
        // 如果新旧节点不是同一个 删除老的换成新的
        return oldVnode.el.parentNode.replaceChild(createElm(vnode), oldVnode.el);
      }
      const el = vnode.el = oldVnode.el; // 复用节点
      if (!oldVnode.tag) {
        // 文本了 一个是文本 那么另一个一定也是文本
        if (oldVnode.text !== vnode.text) {
          return el.textContent = vnode.text;
        }
      }
      // 元素 新的虚拟节点
      updateProperties(vnode, oldVnode.data);
      // 是相同节点了 复用节点 再更新不一样的地方（属性）

      // 比较儿子节点
      let oldChildren = oldVnode.children || [];
      let newChildren = vnode.children || [];
      if (oldChildren.length > 0 && newChildren.length === 0) {
        // 情况1：老的有儿子 新的没儿子
        el.innerHTML = '';
      } else if (newChildren.length > 0 && oldChildren.length === 0) {
        // 情况2：新的有儿子 老的没儿子
        newChildren.forEach(child => el.appendChild(createElm(child)));
      } else {
        // 新老都有儿子
        updateChilren(el, oldChildren, newChildren);
      }
      return el;
    }
  }
  function updateChilren(el, oldChildren, newChildren) {
    // Vue2中如何做的diff算法
    // Vue内部做了优化（能尽量提升性能 如果实在不行 再暴力比对）
    // 1.在列表中新增和删除的情况
    let oldStartIndex = 0;
    let oldStartVnode = oldChildren[0];
    let oldEndIndex = oldChildren.length - 1;
    let oldEndVnode = oldChildren[oldEndIndex];
    let newStartIndex = 0;
    let newStartVnode = newChildren[0];
    let newEndIndex = newChildren.length - 1;
    let newEndVnode = newChildren[newEndIndex];
    function makeKeyByIndex(children) {
      const map = {};
      children.forEach((item, index) => {
        map[item.key] = index;
      });
      return map;
    }
    let mapping = makeKeyByIndex(oldChildren);

    // diff算法的复杂度是O(n) 比对的时候 指针交叉的时候 就是比对完成了
    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
      if (!oldStartVnode) {
        // 在指针移动的时候 可能元素已经被移动走了，那就跳过这一项
        oldStartVnode = oldChildren[++oldStartIndex];
      } else if (!oldEndVnode) {
        oldEndVnode = oldChildren[--oldEndIndex];
      } else if (isSameVnode(oldStartVnode, newStartVnode)) {
        // 头头比较
        patch(oldStartVnode, newStartVnode); // 会递归比较子节点，同时比对这两个人的差异
        oldStartVnode = oldChildren[++oldStartIndex];
        newStartVnode = newChildren[++newStartIndex];
      } else if (isSameVnode(oldEndVnode, newEndVnode)) {
        // 尾尾比较
        patch(oldEndVnode, newEndVnode);
        oldEndVnode = oldChildren[--oldEndIndex];
        newEndVnode = newChildren[--newEndIndex];
      } else if (isSameVnode(oldStartVnode, newEndVnode)) {
        // 头尾比较
        patch(oldStartVnode, newEndVnode);
        el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
        oldStartVnode = oldChildren[++oldStartIndex];
        newEndVnode = newChildren[--newEndIndex];
      } else if (isSameVnode(oldEndVnode, newStartVnode)) {
        // 尾头比较
        patch(oldEndVnode, newStartVnode);
        el.insertBefore(oldEndVnode.el, oldStartVnode.el); // 将尾部的插入到头部去
        oldEndVnode = oldChildren[--oldEndIndex];
        newStartVnode = newChildren[++newStartIndex];
      } else {
        // 之前的逻辑都是考虑 用户一些特殊情况，但是有非特殊的，乱序排
        const moveIndex = mapping[newStartVnode.key];
        if (moveIndex === undefined) {
          // 没有 直接将节点插入到开头的前面
          el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
        } else {
          // 有 需要复用
          const moveVnode = oldChildren[moveIndex]; // 找到复用的那个人 将他移动到前面去
          patch(moveVnode, newStartVnode);
          el.insertBefore(moveVnode.el, oldStartVnode.el);
          oldChildren[moveIndex] = undefined; // 将移动的节点标记为空
        }

        newStartVnode = newChildren[++newStartIndex];
      }
    }
    if (newStartIndex <= newEndIndex) {
      // 新的多 那么就将多的插入进去即可
      // 如果下一个是null 就是appendChild
      const anchor = newChildren[newEndIndex + 1] == null ? null : newChildren[newEndIndex + 1].el; // 参照物固定
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        // 看一下当前尾节点的下一个元素是否存在 如果存在则是插入到下一个元素的前面
        // 这里可能是向前追加 可能是向后追加
        el.insertBefore(createElm(newChildren[i]), anchor);
      }
    }
    if (oldStartIndex <= oldEndIndex) {
      // 老的多余 需要清理掉 直接删除即可
      for (let i = oldStartIndex; i <= oldEndIndex; i++) {
        const child = oldChildren[i]; // 因为child可能是undefined 所以要跳过空间点
        child && el.removeChild(child.el);
      }
    }
  }
  function createElm(vnode) {
    let {
      tag,
      data,
      children,
      text,
      vm
    } = vnode;
    // 我们让虚拟节点和真实节点做一个映射关系 后续某个虚拟节点更新了 我可以跟踪到真实节点 并且更新真实节点
    if (typeof tag === 'string') {
      vnode.el = document.createElement(tag);
      // 如果有data属性 我们需要把data设置到元素上
      updateProperties(vnode);
      children.forEach(child => {
        vnode.el.appendChild(createElm(child));
      });
    } else {
      vnode.el = document.createTextNode(text);
    }
    return vnode.el;
  }
  function updateProperties(vnode, oldProps = {}) {
    // 这里的逻辑 可能是初次渲染 初次渲染直接用oldProps 给vnode的el赋值即可
    // 更新的逻辑 拿到老的props和vnode里面的data进行比对
    const el = vnode.el; // dom真实的节点
    const newProps = vnode.data || {};
    // 新旧比对 两个对象如何比对差异？
    const newStyle = newProps.style || {};
    const oldStyle = oldProps.style || {};
    for (let key in oldStyle) {
      if (!newStyle[key]) {
        // 老的样式有 新的没有 就把页面上的样式删除掉
        el.style[key] = '';
      }
    }
    for (let key in newProps) {
      // 直接用新的盖掉老的就可以了
      // 如果前后一样 浏览器回去检测
      if (key === 'style') {
        for (let key in newStyle) {
          el.style[key] = newStyle[key];
        }
      } else {
        el.setAttribute(key, newProps[key]);
      }
    }
    for (let key in oldProps) {
      if (!newProps[key]) {
        el.removeAttribute(key);
      }
    }
  }

  function mountComponent(vm) {
    // 初始化流程
    const updateComponent = () => {
      vm._update(vm._render()); // render() _c _v _s
    };
    // 每个组件都有一个watcher 我们把这个watcher称之为渲染watcher
    callHook(vm, 'beforeCreate');
    new Watcher(vm, updateComponent, () => {
      console.log('后续增添更新钩子函数 update');
      callHook(vm, 'created');
    }, true);
    callHook(vm, 'mounted');
  }
  function lifeCycleMixin(Vue) {
    Vue.prototype._update = function (vnode) {
      // 采用的是 先序深度遍历 创建节点（遇到节点就创造节点 递归创建）
      const vm = this;
      const preVnode = vm._prevVnode;
      // 第一次渲染 是根据虚拟节点 生成真实节点 替换掉原来的节点
      vm._prevVnode = vnode;
      // 如果是第二次 生成一个新的虚拟节点 和老的虚拟节点进行对比
      if (!preVnode) {
        // 没有节点就是初次渲染
        vm.$el = patch(vm.$el, vnode);
      } else {
        vm.$el = patch(preVnode, vnode);
      }
    };
  }
  function callHook(vm, hook) {
    const handlers = vm.$options[hook];
    handlers && handlers.forEach(item => {
      item.call(vm); // 生命周期的this永远指向实例
    });
  }

  function initMixin(Vue) {
    // 后续组件化开发的时候 Vue.extend 可以创造一个子组件 子组件可以继承Vue 子组件也可以调用_init方法
    Vue.prototype._init = function (options) {
      const vm = this;

      // 把用户的选项放到vue上，这样在其他地方中都可以获取到options了
      vm.$options = mergeOptions(vm.constructor.options, options); // 为了后续扩展的方法都可以获取$options选项

      // options中用户传入的数据 el data
      initState(vm);
      if (vm.$options.el) {
        // 要将数据挂再到页面上

        // 现在数据已经被劫持了,数据变化需要更新视图 diff算法更新需要更新的部分
        // vue -> template(写起来更符合直觉) -> jax(灵活)
        // vue3 template 写起来性能会更高一些 内部做了很多优化

        // template -> ast语法树(用来描述语法本身) -> 描述成一个树结构 -> 将代码重组成js语法
        // 模版编译原理(把template模版编译成render函数 -> 虚拟DOM -> diff算法比对虚拟DOM)

        // ast -> render返回 -> vnode -> 生成真实DOM
        // 更新的时候再次调用render -> 新的vnode -> 新旧比对 -> 更新真实DOM

        vm.$mount(vm.$options.el);
      }
    };

    // new Vue({el}) new Vue().$mount
    Vue.prototype.$mount = function (el) {
      const vm = this;
      const opts = vm.$options;
      el = document.querySelector(el); // 获取真实的元素
      vm.$el = el; // 页面真实元素

      if (!opts.render) {
        // 模版变异
        let template = opts.template;
        if (!template) {
          template = el.outerHTML;
        }
        const render = compileToFunction(template);
        opts.render = render;
      }

      // 这里已经获取到了一个render函数 这个函数他的返回值 _c('div',{id:'app'},_c('span',undefined,'hello'))
      mountComponent(vm);
    };
    Vue.prototype.$nextTick = nextTick;
  }

  function renderMixin(Vue) {
    Vue.prototype._c = function () {
      // createElement 创建元素型的节点
      const vm = this;
      return createElement(vm, ...arguments);
    };
    Vue.prototype._v = function (text) {
      // 创建文本的虚拟节点
      const vm = this;
      return createText(vm, text); // 描述虚拟节点是属于哪个实例的
    };

    Vue.prototype._s = function (val) {
      // JSON.stingfiy()
      if (isObject(val)) return JSON.stringify(val);
      return val;
    };
    Vue.prototype._render = function () {
      const vm = this; // vm中有所有的数据 vm.xxx => xm._data.xxx
      let {
        render
      } = vm.$options;
      let vnode = render.call(vm);
      return vnode;
    };
  }

  function initGlobalAPI(Vue) {
    Vue.options = {}; // 全局属性 , 在每个组件初始化的时候 将这些属性放到每个组件上
    Vue.mixin = function (options) {
      this.options = mergeOptions(this.options, options);
      return this;
    };
    Vue.component = function name(params) {};
    Vue.filter = function name(params) {};
    Vue.directive = function name(params) {};
  }

  // vue要如何实现 原型模式 所有的功能都通过原型扩展的方式来添加
  function Vue(options) {
    this._init(options); // 实现vue的初始化功能
  }

  initMixin(Vue);
  renderMixin(Vue);
  lifeCycleMixin(Vue);
  initGlobalAPI(Vue);

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

  return Vue;

}));
//# sourceMappingURL=vue.js.map
