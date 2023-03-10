import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import typescript from 'rollup-plugin-typescript2'
//import packageJson from './package.json'
import fs from 'fs'
import path from 'path'
import del from 'rollup-plugin-delete'

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))

export default {
	input: './src/index.tsx',
	output: [
		{
			file: packageJson.main,
			format: 'cjs',
			sourcemap: true,
		},
		{
			file: packageJson.module,
			format: 'esm',
			sourcemap: true,
		},
	],
	external: ['react'],
	plugins: [
		del({ targets: path.parse(packageJson.main).dir + '/*' }),
		peerDepsExternal(),
		resolve(),
		commonjs(),
		typescript(),
	],
}
