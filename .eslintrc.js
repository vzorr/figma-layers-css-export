// .eslintrc.js - ESLint configuration
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@figma/eslint-plugin-figma-plugins/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.plugin.json', './tsconfig.ui.json'],
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    '@figma/eslint-plugin-figma-plugins',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['src/plugin/**/*'],
      env: {
        browser: false,
        node: true,
      },
      rules: {
        // Plugin-specific rules
        'no-console': 'off', // Console logging is useful for plugin debugging
      },
    },
    {
      files: ['src/ui/**/*'],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        // UI-specific rules
      },
    },
    {
      files: ['scripts/**/*', 'config/**/*'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
  ],
};

// .gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# README.md
# Figma to React Native Plugin

A powerful Figma plugin that automatically extracts design systems and generates responsive React Native code from your Figma designs.

## 🚀 Features

- **Automatic Device Detection**: Scans your Figma file to detect different device types and screen sizes
- **Design System Extraction**: Automatically extracts colors, typography, and spacing tokens from your designs
- **Theme File Generation**: Creates a comprehensive theme file compatible with React Native
- **Responsive Code Generation**: Generates React Native components with responsive utilities
- **TypeScript Support**: Full TypeScript support with proper type definitions
- **Modular Architecture**: Clean, maintainable code structure for easy extension

## 🏗️ Development Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Figma Desktop App

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd figma-to-rn-plugin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

4. In Figma Desktop:
   - Go to **Plugins** > **Development** > **Import plugin from manifest**
   - Select the `manifest.json` file from the project root

### Build Commands

- `npm run dev` - Start development mode with file watching
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

## 📁 Project Structure

```
src/
├── plugin/           # Plugin backend (runs in Figma)
│   ├── core/         # Core functionality
│   ├── generators/   # Code generators
│   ├── analyzers/    # Design token analyzers
│   └── utils/        # Utility functions
├── ui/               # Plugin UI (React)
│   ├── components/   # UI components
│   ├── hooks/        # React hooks
│   └── styles/       # CSS styles
└── shared/           # Shared types and utilities
    ├── types/        # TypeScript definitions
    └── constants/    # Shared constants
```

## 🔧 Build Configuration

The project uses a sophisticated build system with:

- **Webpack**: Module bundling with source maps for debugging
- **TypeScript**: Type safety with separate configs for plugin and UI
- **ESLint**: Code linting with Figma plugin rules
- **Source Maps**: Debug with original file locations preserved

### Debugging

- Source maps preserve original TypeScript file structure
- Console logs show actual file locations (e.g., `DeviceDetector.ts:45`)
- Separate builds for plugin backend and UI frontend
- Development mode includes hot reloading for UI

## 📖 Usage

1. **Open the plugin** in Figma
2. **Analyze Design System** - The plugin automatically scans your design
3. **Select a screen** from the layer tree
4. **Generate React Native code** with your preferred options
5. **Copy the generated theme and component code** to your React Native project

## 🛠️ Extension Guide

The modular architecture makes it easy to add new features:

- **Add new analyzers** in `src/plugin/analyzers/`
- **Create new generators** in `src/plugin/generators/`
- **Add UI components** in `src/ui/components/`
- **Define new types** in `src/shared/types/`

## 📝 License

MIT License - see LICENSE file for details