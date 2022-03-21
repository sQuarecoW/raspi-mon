
const path = require('path');

module.exports = {
	devServer: {
		port: 1608,
		disableHostCheck: true
	},
	outputDir: path.resolve(__dirname, '../monitor'),
	chainWebpack: (config) => {
		config.performance.maxEntrypointSize(500000).maxAssetSize(500000);
	},
}
