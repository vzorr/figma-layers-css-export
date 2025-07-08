/* eslint-disable @typescript-eslint/no-var-requires */
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env) => {
  const isProduction = false;
  const target = env?.target || 'plugin';

  console.log(`🔧 Building ${target} in ${isProduction ? 'production' : 'development'} mode`);

  // PLUGIN CONFIGURATION
  if (target === 'plugin') {
    return {
      name: 'plugin',
      mode: isProduction ? 'production' : 'development',
      devtool: isProduction ? 'source-map' : 'eval-source-map',
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
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@plugin': path.resolve(__dirname, 'src/plugin'),
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
                  // Plugin-specific TypeScript settings
                  target: 'ES2017',
                  lib: ['ES2017'],
                  module: 'CommonJS',
                  moduleResolution: 'node',
                  strict: false,
                  skipLibCheck: true,
                  noEmit: false,
                  declaration: false,
                  sourceMap: true,
                  types: ['@figma/plugin-typings'],
                  typeRoots: ['./node_modules/@types', './node_modules/@figma'],
                },
              },
            },
            exclude: /node_modules/,
          },
        ],
      },
      optimization: {
        minimize: isProduction,
      },
      stats: {
        errorDetails: true,
        colors: true,
      },
    };
  }

  // UI CONFIGURATION
  return {
    name: 'ui',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    entry: './src/ui/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'ui.js',
      clean: {
        keep: /code\.js(\.map)?$/,
      },
    },
    target: 'web',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
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
                // UI-specific TypeScript settings
                target: 'ES2020',
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                moduleResolution: 'node',
                jsx: 'react-jsx',
                strict: false,
                skipLibCheck: true,
                noEmit: false,
                declaration: false,
                sourceMap: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                // Include DOM types for UI
                types: ['node'],
                typeRoots: ['./node_modules/@types'],
              },
            },
          },
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
        template: path.resolve(__dirname, 'public/ui.html'),
        filename: 'ui.html',
        chunks: ['ui'],
        inject: 'body',
      }),
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
    stats: {
      errorDetails: true,
      colors: true,
    },
  };
};