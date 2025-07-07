const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const target = env?.target || 'plugin';

  const commonConfig = {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@plugin': path.resolve(__dirname, 'src/plugin'),
        '@ui': path.resolve(__dirname, 'src/ui'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: target === 'plugin' 
                ? path.resolve(__dirname, 'tsconfig.plugin.json')
                : path.resolve(__dirname, 'tsconfig.ui.json'),
              transpileOnly: false,
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

  if (target === 'plugin') {
    return {
      ...commonConfig,
      name: 'plugin',
      entry: './src/plugin/main.ts',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'code.js',
        clean: {
          keep: /ui\.(html|js|css)$/,
        },
      },
      target: 'node',
      externals: {
        figma: 'figma',
      },
      optimization: {
        minimize: isProduction,
        moduleIds: 'named',
        chunkIds: 'named',
      },
    };
  }

  // UI Configuration
  return {
    ...commonConfig,
    name: 'ui',
    entry: './src/ui/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'ui.js',
      clean: {
        keep: /code\.js(\.map)?$/,
      },
    },
    target: 'web',
    module: {
      ...commonConfig.module,
      rules: [
        ...commonConfig.module.rules,
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/ui/template.html'),
        filename: 'ui.html',
        chunks: ['ui'],
        inject: 'body',
      }),
      ...(isProduction ? [new MiniCssExtractPlugin({ filename: 'ui.css' })] : []),
    ],
    optimization: {
      minimize: isProduction,
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
  };
};