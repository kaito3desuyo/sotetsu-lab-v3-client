const webpack = require('webpack');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

module.exports = {
  /*
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 50000,
      maxSize: 900000,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: '.',
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  */
  plugins: [
    new MomentLocalesPlugin({
      localesToKeep: ['ja']
    })
  ]
};
