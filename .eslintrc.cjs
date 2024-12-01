/**
 * @type {import('eslint').Linter.LegacyConfig}
 */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/jsx-runtime',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.cli.json'],
  },
  plugins: ['@typescript-eslint', 'unicorn'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    /**
     * https://typescript-eslint.io/rules/explicit-function-return-type/
     *
     * Disabled because most of custom hooks and returns from `useEffect` are
     * automatically typed
     */
    '@typescript-eslint/explicit-function-return-type': 'off',

    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],

    // https://typescript-eslint.io/rules/naming-convention/
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
      },
      // destructured variables come from other places so no format is enforced
      {
        selector: 'variable',
        modifiers: ['destructured'],
        format: null,
      },
      // imports also come from other places so no format is enforced
      {
        selector: 'import',
        format: null,
      },
      // Constants can also be camelCase apart from UPPER_CASE
      // global constants are usually UPPER_CASE
      // local constants can be camelCase
      // functional components (as a result of something) can be PascalCase
      {
        selector: 'variable',
        modifiers: ['const'],
        format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
      },
      // static readonly (class constants) CAN be UPPER_CASE (readonly is not
      // only for constants, but can be for mutable objects that always exist)
      {
        selector: 'classProperty',
        modifiers: ['static', 'readonly'],
        format: ['UPPER_CASE', 'camelCase'],
      },
      // Interface fields can also be UPPER_CASE (for mapping from constants, etc.)
      // Some interfaces might describe a functional component (allow PascalCase)
      {
        selector: 'typeProperty',
        format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
      },
      // objects implementing interfaces should have the same rules
      {
        selector: 'objectLiteralProperty',
        format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
      },
      // Components specified in an object/interface
      // can be implemented as functions (methods)
      {
        selector: 'objectLiteralMethod',
        format: ['camelCase', 'PascalCase'],
      },
      // functions defined as constants should have the same format as functions
      {
        selector: 'variable',
        types: ['function'],
        format: ['camelCase', 'PascalCase'],
      },
      // functions can be:
      // - regular functions (camelCase)
      // - functional components (PascalCase)
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      // type definitions (class, interface, typeAlias, enum, typeParameter)
      // should be PascalCase
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      // each member of an enum (const-like) should be UPPER_CASE
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      {
        // Ignore properties that require quotes
        selector: [
          'classProperty',
          'objectLiteralProperty',
          'typeProperty',
          'classMethod',
          'objectLiteralMethod',
          'typeMethod',
          'accessor',
          'enumMember',
        ],
        format: null,
        modifiers: ['requiresQuotes'],
      },
    ],
    /*
     * https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/prop-types.md
     *
     * Disabled as it's already checked (statically) by TypeScript
     */
    'react/prop-types': 'off',
  },
};
