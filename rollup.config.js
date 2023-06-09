import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: './src/index.js', // 打包的入口
  output: {
    file: 'dist/vue.js', // 打包的出口
    format: 'umd', // 常见的格式IIFE ESM CJS UMD
    name: 'Vue', // umd模块需要配置name，会将导出的模块放到window上，如果在node中使用cjs 如果只是打包webpack里面导入esm模块 前端里script iife umd
    sourcemap: true, // 可以进行源代码调试
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**' // glob写法 去掉node_modules 下所有文件夹下的文件
    })
  ]
}
