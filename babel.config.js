// Used by Jest only. Apps compile the package with their own Metro and Babel setup.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
};
