'use strict'

const path = require('path')

/**
 * @typedef {object} OptionDefinition
 * @property {string} type - Needs to be 'string' or 'boolean'
 * @property {string|boolean} default - The default value
 * @property {string} [description] - Used as description for cli prompts
 * @property {string} [prompt] - Used when prompting the user via cli
 * @property {string[]} [choices] - If you want to give multiple choices (enum)
 */

/**
 * @typedef {object.<string, OptionDefinition>} OptionDefinitions
 */

/**
 * @param {object} meta
 * @param {string} meta.directory - The absolute path to the directory the
 *   template will be run in
 * @return {OptionDefinitions}
 */
exports.options = ({ directory }) => ({
  name: {
    type: 'string',
    description: 'The name of the project',
    default: path.basename(directory)
  },
  typescript: {
    type: 'boolean',
    description: 'Make it a typescript project',
    default: false
  },
  yarn: {
    type: 'boolean',
    description: 'Use yarn instead of npm',
    default: true
  }
})

/**
 * @param {object} data
 * You'll want to change data.options to match what you have in your
 * @param {{ name: string, typescript: boolean, yarn: boolean }} data.options - The resolved options as defined from above
 * @param {object} data.operations
 * @param {(fromPath: string|string[], toPath: string|string[]) => void} data.operations.copy -
 *   Copy a file from fromPath (a relative path from the root of this repo) to
 *   toPath (a relative path from the root of the destination directory)
 * @param {(fromPath: string|string[], toPath: string|string[], variables: object) => void} data.operations.template -
 *   Copy a file from fromPath (a relative path from the root of this repo) to
 *   toPath (a relative path from the root of the destination directory) and
 *   replace expressions in the file "{{variableName}}" with values present in
 *   the variables argument
 * @param {(object: object, toPath: string|string[]) => void} data.operations.json -
 *   Render the raw object to the toPath (A relative path from the root of the
 *   destination directory)
 * @param {(command: string, ...args: string|string[]) => void} data.operations.spawn -
 *   Run the command in a spawned process
 */
exports.run = ({ options, operations }) => {
  const dependencies = new Set()
  const devDependencies = new Set()
  const packageJSON = {
    name: undefined,
    description: '',
    version: '0.0.0',
    author: undefined,
    license: undefined,
    private: true,
    main: undefined,
    homepage: undefined,
    scripts: {
      build: undefined,
      format: undefined,
      lint: undefined,
      start: undefined,
      test: undefined
    },
    dependencies: {},
    devDependencies: {}
  }

  packageJSON.name = options.name
  packageJSON.scripts.build = 'SKIP_PREFLIGHT_CHECK=true react-scripts build'
  packageJSON.scripts.start = 'SKIP_PREFLIGHT_CHECK=true react-scripts start'
  packageJSON.scripts.test = 'SKIP_PREFLIGHT_CHECK=true react-scripts test'
  packageJSON.homepage = '.'

  operations.copy(['templates', '.browserslistrc'], ['.browserslistrc'])
  operations.copy(
    ['templates', 'src', options.typescript ? 'index.js' : 'index.js'],
    ['src', options.typescript ? 'index.tsx' : 'index.js']
  )
  operations.copy(
    ['templates', 'src', options.typescript ? 'App.js' : 'App.js'],
    ['src', options.typescript ? 'App.tsx' : 'App.js']
  )
  const publicFiles = ['favicon.ico', 'index.html', 'manifest.json']
  publicFiles.forEach(file => {
    operations.copy(['templates', 'public', file], ['public', file])
  })

  dependencies
    .add('react-scripts')
    .add('react')
    .add('react-dom')

  if (options.typescript) {
    operations.copy(
      ['templates', 'src', 'react-app-env.d.ts'],
      ['src', 'react-app-env.d.ts']
    )
    operations.copy(['templates', 'tsconfig.json'], ['tsconfig.json'])
    devDependencies.add('@types/jest')
    dependencies
      .add('@types/node')
      .add('@types/react')
      .add('@types/react-dom')
      .add('typescript')
  }

  // Linting
  {
    const ext = options.typescript
    const src = `'src/**/*.${ext}`
    packageJSON.scripts.format = `prettier-eslint ${src} --write`
    packageJSON.scripts.lint = `eslint ${src} && prettier-eslint ${src} --list-different`
    devDependencies
      .add('eslint')
      .add('eslint-config-standard')
      .add('eslint-config-standard-jsx')
      .add('eslint-plugin-import')
      .add('eslint-plugin-node')
      .add('eslint-plugin-promise')
      .add('eslint-plugin-standard')
      .add('eslint-plugin-react')
      .add('prettier-eslint-cli')
    if (options.typescript) devDependencies.add('@typescript-eslint/parser')
    operations.copy(
      ['templates', options.typescript ? '.eslintrc.typescript' : '.eslintrc'],
      ['.eslintrc']
    )
  }

  operations.spawn('git', ['init'])
  operations.json(packageJSON, ['package.json'])

  const installCommand = options.yarn ? 'yarn' : 'npm'
  const installArg = options.yarn ? 'add' : 'install'
  const devFlag = options.yarn ? '--dev' : '--save-dev'
  const baseArgs = [installArg]
  const devArgs = baseArgs.concat([devFlag, ...devDependencies])
  const prodArgs = baseArgs.concat([...dependencies])
  if (dependencies.size) operations.spawn(installCommand, prodArgs)
  if (devDependencies.size) operations.spawn(installCommand, devArgs)
}
