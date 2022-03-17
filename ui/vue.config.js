
const path = require('path');

module.exports = {
	devServer: {
		port: 1608,
		disableHostCheck: true
	},
	outputDir: path.resolve(__dirname, '../monitor'),
}
