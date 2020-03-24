module.exports = {
  extends: 'airbnb-base',
  rules: {
    'no-underscore-dangle': 0,
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: 'always',
        ObjectPattern: { multiline: true },
      },
    ],
  },
};
