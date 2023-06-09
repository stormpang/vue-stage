export function isFunction(val) {
  return typeof val == 'function'
}

export function isObject(val) {
  return typeof val == 'object' && val !== null;
}


let callbacks = [];
let waiting = false;

function flushCallbacks() {
  callbacks.forEach(fn => fn()); // 按照顺序清空nextTick
  callbacks = [];
  waiting = false;
}

export function nextTick(fn) { // vue3 里面的nextTick 就是promise ， vue2里面做了一些兼容性处理
  callbacks.push(fn);
  if (!waiting) {
    Promise.resolve().then(flushCallbacks);
    waiting = true
  }
}


export let isArray = Array.isArray

// {a:1} {b:1,a:2}  => {b:1,a:[1,2]}

// {}  {beforeCreate:fn}  => {beforecreatre:[fn]}
// {beforecreatre:[fn]} {beforeCreate:fn}  => {beforecreatre:[fn,fn]}

let strats = {}; // 存放所有策略

let lifeCycle = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted'
];
lifeCycle.forEach(hook => {
  strats[hook] = function (parentVal, childVal) {
    if (childVal) {
      if (parentVal) { // 父 子 都有值 用父和子拼接在一起， 父有值就一定是数组
        return parentVal.concat(childVal)
      } else { // 儿子有值 父亲没有值
        if (isArray(childVal)) {
          return childVal
        }
        return [childVal] // 如果没值 就会变成数组
      }
    } else {
      return parentVal;
    }
  }
});

strats.components = function (parentVal, childVal) {
  // childVal.__proto__ = parentVal
  const res = Object.create(parentVal) // 合并后生成一个新对象 不用原来的
  if (childVal) {
    for (let key in childVal) {
      res[key] = childVal[key]
    }
  }
  return res
}

export function mergeOptions(parentVal, childVal) {
  const options = {}
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

function makeMap(str) {
  let tagList = str.split(',');
  return function (tagName) {
    return tagList.includes(tagName)
  }
}

export const isReservedTag = makeMap(
  'template,script,style,element,content,slot,link,meta,svg,view,button,' +
  'a,div,img,image,text,span,input,switch,textarea,spinner,select,' +
  'slider,slider-neighbor,indicator,canvas,' +
  'list,cell,header,loading,loading-indicator,refresh,scrollable,scroller,' +
  'video,web,embed,tabbar,tabheader,datepicker,timepicker,marquee,countdown'
)
