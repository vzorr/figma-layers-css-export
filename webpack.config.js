const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = [
  // Plugin Backend Configuration
  {
    name: 'plugin',
    entry: './src/plugin/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'code.js',
    },
    target: 'node',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    externals: {
      figma: 'figma',
    },
  },
  
  // UI Configuration
  {
    name: 'ui',
    entry: './src/ui/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'ui.js',
    },
    target: 'web',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/ui.html',
        filename: 'ui.html',
        chunks: ['ui'],
      }),
    ],
  },
];