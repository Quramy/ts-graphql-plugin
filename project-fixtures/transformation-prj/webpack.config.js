const path = require('path');

const TsGraphQLPlugin = require('../../webpack');

const tsgqlPlugin = new TsGraphQLPlugin({ tsconfigPath: __dirname });

module.exports = {
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: {
    main: path.resolve(__dirname, "query.ts"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          getCustomTransformers: () => ({
            before: [
              tsgqlPlugin.getTransformer(),
            ],
          }),
        },
      }
    ],
  },
  plugins: [
    tsgqlPlugin,
  ],
  devtool: false,
};
