import {parserHTML} from "./parser";
import {generate} from "./generate";

export function compileToFunction(template) {
  // 1.将模版变成ast语法树
  let ast = parserHTML(template)

  // 2.代码优化 标记静态节点

  // 3.代码生成
  const code = generate(ast) // 模版引擎的实现原理 都是 new Function + with ejs jade handlerbar
  const render = new Function(`with(this){return ${code}}`)
  return render
}

// 1.编译原理
// 2.响应式原理 依赖收集
// 3.组件化开发（贯穿了vue的流程）
// 4.diff算法
