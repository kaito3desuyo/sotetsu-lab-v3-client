const webpack = require('webpack')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin

module.exports = {
  output: {
    filename: '[name].js' // name of the generated bundle
  },
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
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'disabled', // 'static',
      reportFilename: 'report/bundle-analyzer.html',
      openAnalyzer: false
    }),
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /ja/)
  ]
}
