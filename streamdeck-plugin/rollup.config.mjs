import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sdPlugin = "com.squarecow.raspi-mon.sdPlugin";

/**
 * Bundles the TypeScript source into a single self-contained file that the
 * Stream Deck app runs with its Node runtime (see manifest "Nodejs"/"CodePath").
 * Everything is inlined, so the .sdPlugin folder needs no node_modules.
 */
export default {
	input: "src/plugin.ts",
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		format: "cjs",
		sourcemap: true,
	},
	plugins: [
		typescript(),
		nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
		commonjs(),
	],
};
