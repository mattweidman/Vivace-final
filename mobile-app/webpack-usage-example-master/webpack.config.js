var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function (options) {
  return {
    entry: './index.ts',
    output: {
      path: __dirname + '/lib',
      filename: 'index.bundle.js',
      libraryTarget: "var",
      library: "MusicDisplay"
    },

    // Currently we need to add '.ts' to the resolve.extensions array.
    resolve: {
      extensions: ['.ts', '.js'],
      modules: ['node_modules']
    },

    // Source maps support ('inline-source-map' also works)
    devtool: 'source-map',

    // Add the loader for .ts files.
    module: {
      rules: [
        {
          test: /\.json$/,
          use: 'json-loader'
        },
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'awesome-typescript-loader',
              options: {
                configFileName: 'tsconfig.webpack.json'
              }
            }
          ]
        }
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        title: 'opensheetmusicdisplay | webpack-usage-example'
      }),
      new CopyWebpackPlugin([
        {
          from: 'MuzioClementi_SonatinaOpus36No1_Part1.xml',
          to: 'musicXmlSample.xml'
        }
      ])
    ],

    node: {
      global: true,
      crypto: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
