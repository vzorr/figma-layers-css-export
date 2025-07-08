const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const target = env?.target || 'plugin';

  console.log(`🔧 Building ${target} in ${isProduction ? 'production' : 'development'} mode`);

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
              transpileOnly: false,
              compilerOptions: {
                ...(target === 'plugin' ? {
                  target: 'ES2017',
                  lib: ['ES2017'],
                  module: 'CommonJS',
                  jsx: 'preserve',
                  noEmit: false
                } : {
                  target: 'ES2020',
                  lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                  module: 'ESNext',
                  jsx: 'react-jsx',
                  noEmit: false
                })
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
      colors: true,
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
        library: {
          type: 'commonjs2'
        }
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
      performance: {
        maxAssetSize: 1000000,
        maxEntrypointSize: 1000000,
        hints: isProduction ? 'warning' : false
      }
    };
  }

  // UI Configuration - FIXED TEMPLATE PATH
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
        // FIXED: Use the correct template path
        template: path.resolve(__dirname, 'public/ui.html'),
        filename: 'ui.html',
        chunks: ['ui'],
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        } : false,
      }),
      ...(isProduction ? [new MiniCssExtractPlugin({ 
        filename: 'ui.css',
        chunkFilename: '[id].css'
      })] : []),
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
            priority: 10,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
        },
      },
    },
    performance: {
      maxAssetSize: 500000,
      maxEntrypointSize: 500000,
      hints: isProduction ? 'warning' : false
    },
    // Add development server configuration
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 3000,
      hot: true,
      open: false,
      compress: true,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
  };
};