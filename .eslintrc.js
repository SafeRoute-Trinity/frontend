module.exports = {
  root: true,
  extends: ['airbnb', 'airbnb-typescript', 'expo', 'prettier'],
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    // React Native / Expo specific overrides
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': [1, { extensions: ['.tsx', '.ts'] }],
    'import/prefer-default-export': 'off',
    'react/function-component-definition': [
      2,
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      },
    ],
    'no-underscore-dangle': 'off',
    'global-require': 'off', // Common in React Native for images
    'react/style-prop-object': 'off', // Conflict with Expo StatusBar
  },
  ignorePatterns: ['dist/*', 'node_modules/*', '.expo/*', 'scripts/*', '*.config.js'],
};
