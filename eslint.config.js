import eslint from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import typescript from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default typescript.config(
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  eslint.configs.recommended,
  ...vue.configs['flat/base'],
  ...typescript.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.bunBuiltin
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescript.parser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  }
)
