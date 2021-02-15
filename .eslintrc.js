module.exports = {
  extends: ['react-app', 'prettier', 'plugin:node/recommended'],
  plugins: ['prettier'],
  rules: {
    'no-underscore-dangle': 0,
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'func-names': 'off',
    'no-process-exit': 'off',
    'object-shorthand': 'off',
    'class-methods-use-this': 'off'
  }
};
