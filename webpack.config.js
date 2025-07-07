// webpack.config.js - Unified build configuration
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

// Plugin configuration
const pluginConfig = {
  entry: './src/plugin/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'code.js',
  },
  target: 'node',
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? 'source-map' : 'eval-source-map',
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
            configFile: 'tsconfig.plugin.json',
            transpileOnly: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    figma: 'figma',
  },
};

// UI configuration
const uiConfig = {
  entry: './src/ui/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ui.js',
  },
  target: 'web',
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? 'source-map' : 'eval-source-map',
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
            configFile: 'tsconfig.ui.json',
            transpileOnly: false,
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
      template: './public/ui.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body',
    }),
  ],
};

module.exports = [pluginConfig, uiConfig];

// package.json - Updated scripts
{
  "name": "figma-to-rn-plugin",
  "version": "2.0.0",
  "description": "Enhanced Figma to React Native Plugin with Smart Code Generation",
  "main": "dist/code.js",
  "scripts": {
    "build": "webpack --mode=production",
    "dev": "webpack --mode=development --watch",
    "clean": "rimraf dist build",
    "lint": "eslint src/**/*.{ts,tsx} --max-warnings 0",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "type-check": "tsc --noEmit",
    "test": "echo \"No tests specified\" && exit 0"
  },
  "keywords": [
    "figma",
    "plugin",
    "react-native",
    "design-system",
    "code-generation",
    "responsive"
  ],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "@figma/plugin-typings": "^1.114.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "css-loader": "^6.8.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "html-webpack-plugin": "^5.6.0",
    "rimraf": "^5.0.5",
    "style-loader": "^3.3.3",
    "ts-loader": "^9.5.1",
    "typescript": "^5.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}

// tsconfig.json - Base configuration
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@plugin/*": ["src/plugin/*"],
      "@ui/*": ["src/ui/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}

// tsconfig.plugin.json - Plugin specific
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["ES2017"],
    "module": "CommonJS",
    "jsx": "preserve",
    "noEmit": false,
    "outDir": "./build/plugin"
  },
  "include": ["src/plugin/**/*", "src/shared/**/*"],
  "exclude": ["src/ui/**/*"]
}

// tsconfig.ui.json - UI specific
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "noEmit": false,
    "outDir": "./build/ui"
  },
  "include": ["src/ui/**/*", "src/shared/**/*"],
  "exclude": ["src/plugin/**/*"]
}

// manifest.json - Updated plugin manifest
{
  "name": "Figma to React Native",
  "id": "figma-to-rn-enhanced",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["none"]
  },
  "permissions": [],
  "relaunchButtons": [
    {
      "command": "open",
      "name": "Generate React Native Code"
    }
  ]
}