/* eslint-env es6 */
const webpack = require('webpack');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const path = require('path');

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
            localesToKeep: ['ja'],
        }),
        // Always replace the context for the System.import in angular/core to prevent warnings.
        // https://stackoverflow.com/questions/68698503/angular-12-warning-critical-dependency-the-request-of-a-dependency-is-an-expres
        // https://github.com/angular/angular/issues/43092
        new webpack.ContextReplacementPlugin(
            /\@angular(\\|\/)core(\\|\/)/,
            path.join(__dirname, '$_lazy_route_resources'),
            {}
        ),
    ],
};
