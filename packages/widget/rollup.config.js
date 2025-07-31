import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/storyslip-widget.js',
      format: 'umd',
      name: 'StorySlip',
      sourcemap: true,
    },
    {
      file: 'dist/storyslip-widget.esm.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    nodeResolve({
      browser: true,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false, // We'll generate declarations separately
    }),
  ],
};