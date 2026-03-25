const sharedPrettierConfig = {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  arrowParens: 'always',
  plugins: ['prettier-plugin-astro', 'prettier-plugin-svelte'],
};

export default sharedPrettierConfig;
