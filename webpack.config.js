const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    module: [ './src/main.js', 'hammerjs' ]
  }, 
  target: 'node',
  output: {
    library: 'Module',
    libraryTarget: 'umd',
    globalObject: 'this',
    filename: '[name].js',
    path: path.resolve(__dirname, 'build/')
  },
  externals: {
    'checheza_core': 'checheza_core',
    'jquery': 'jquery'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [ { loader: 'style-loader' }, { loader: 'css-loader', options: { url: true, modules: true } }],
      },
      {
        test: /\.(jpe?g|png|ttf|eot|svg|wav|ogg|mp3|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        use: 'base64-inline-loader?limit=1000&name=[name].[ext]'
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};
