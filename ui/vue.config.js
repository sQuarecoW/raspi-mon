
const path = require('path');

module.exports = {
	devServer: {
		port: 1608,
		disableHostCheck: true
	},
	outputDir: path.resolve(__dirname, '../monitor'),
	configureWebpack:{
		optimization: {
			splitChunks: {
				minSize: 100000,
				maxSize: 500000,
			}
		}
	},
	chainWebpack: (config) => {
		config.performance
			.maxEntrypointSize(500000)
			.maxAssetSize(500000)

		config.optimization
			.namedChunks(true)
			.splitChunks({
				...config.optimization.get('splitChunks'),
				automaticNameDelimiter: '-'
			})
	},
}
