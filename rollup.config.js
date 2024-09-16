import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs',
    exports: 'named'
  },
  plugins: [
    typescript(),
    commonjs(),
    resolve()
  ],
  external: ['fs', 'path']
};
