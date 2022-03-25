const webpack = require('webpack')
const path = require('path');

module.exports = {
	devServer: {
		port: 1608,
		disableHostCheck: true
	},
	outputDir: path.resolve(__dirname, '../monitor'),
	configureWebpack: {
		plugins: [
			new webpack.HashedModuleIdsPlugin()
		]
	},
	chainWebpack: config => {
		config.performance
			.maxEntrypointSize(500000)
			.maxAssetSize(500000)

		config.optimization
			.namedChunks(true)
			.runtimeChunk(true)
			.splitChunks({
				chunks: 'all',
				maxInitialRequests: Infinity,
				minSize: 10000,
			  	cacheGroups: {
					vendor: {
				  	test: /[\\/]node_modules[\\/]/,
				  	name(module) {
						// get the name. E.g. node_modules/packageName/not/this/part.js
						// or node_modules/packageName
						const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];

						// npm package names are URL-safe, but some servers don't like @ symbols
						return `npm.${packageName.replace('@', '')}`;
				  	},
					},
			  	}
			})
	},
}
