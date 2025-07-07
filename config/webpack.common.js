// config/webpack.common.js
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@plugin': path.resolve(__dirname, '../src/plugin'),
      '@ui': path.resolve(__dirname, '../src/ui'),
      '@shared': path.resolve(__dirname, '../src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: false, // Enable type checking
            configFile: function(context) {
              // Use different tsconfig based on context
              if (context.includes('src/plugin')) {
                return path.resolve(__dirname, '../tsconfig.plugin.json');
              }
              if (context.includes('src/ui')) {
                return path.resolve(__dirname, '../tsconfig.ui.json');
              }
              return path.resolve(__dirname, '../tsconfig.json');
            }
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  stats: {
    errorDetails: true,
    children: true,
  },
};

// config/webpack.plugin.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  entry: {
    code: './src/plugin/main.ts',
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js',
    clean: {
      keep: /ui\.(html|js|css)$/, // Keep UI files when building plugin
    },
  },
  target: 'node',
  externals: {
    // Figma API is provided by the plugin environment
    figma: 'figma',
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    moduleIds: 'named', // Better debugging
    chunkIds: 'named',
  },
});

// config/webpack.ui.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = merge(common, {
  entry: {
    ui: './src/ui/App.tsx',
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'ui.js',
    clean: {
      keep: /code\.js(\.map)?$/, // Keep plugin files when building UI
    },
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          process.env.NODE_ENV === 'production' 
            ? MiniCssExtractPlugin.loader 
            : 'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/ui.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body',
    }),
    ...(process.env.NODE_ENV === 'production' 
      ? [new MiniCssExtractPlugin({ filename: 'ui.css' })] 
      : []
    ),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, '../dist'),
    },
    port: 3000,
    hot: true,
    open: false,
    compress: true,
    historyApiFallback: true,
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
});