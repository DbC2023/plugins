// @flow
/* eslint-disable */
'use strict'

// $FlowFixMe
const fs = require('fs/promises')
const fg = require('fast-glob') //dbw adding for requiredFiles glob wildcard watch (**/)
const { existsSync } = require('fs')
const path = require('path')
const notifier = require('node-notifier')
const alias = require('@rollup/plugin-alias')

const colors = require('chalk')
const messenger = require('@codedungeon/messenger')

const strftime = require('strftime')
const rollup = require('rollup')
const commonjs = require('@rollup/plugin-commonjs')

const json = require('@rollup/plugin-json')
const { nodeResolve } = require('@rollup/plugin-node-resolve')

const { babel } = require('@rollup/plugin-babel')
const { terser } = require('rollup-plugin-terser')
const mkdirp = require('mkdirp')
const { program } = require('commander')
const ProgressBar = require('progress')
const pkgInfo = require('../package.json')
const pluginConfig = require('../plugins.config')
const createPluginListing = require('./createPluginListing')

let progress
let requiredFilesWatchMsg = ''

let watcher

const { getFolderFromCommandLine, getPluginFileContents, writeMinifiedPluginFileContents, getCopyTargetPath, getPluginConfig } = require('./shared')
const { re } = require('mathjs')

const FOLDERS_TO_IGNORE = ['scripts', 'flow-typed', 'node_modules', 'np.plugin-flow-skeleton']
const rootFolderPath = path.join(__dirname, '..')

const copyBuild = async (outputFile = '', isBuildTask = false) => {
  if (!existsSync(outputFile)) {
    messenger.error(`Invalid Script: ${outputFile}`)
  }

  const pluginDevFolder = path.dirname(outputFile)
  const rootFolder = await fs.readdir(rootFolderPath, { withFileTypes: true })
  const copyTargetPath = await getCopyTargetPath(rootFolder)

  if (pluginDevFolder != null) {
    const targetFolder = path.join(copyTargetPath, pluginDevFolder.replace(rootFolderPath, ''))
    await mkdirp(targetFolder)
    await fs.copyFile(path.join(pluginDevFolder, 'script.js'), path.join(targetFolder, 'script.js'))
    const pluginJson = path.join(pluginDevFolder, 'plugin.json')

    await writeMinifiedPluginFileContents(pluginJson, path.join(targetFolder, 'plugin.json'))
    // await fs.copyFile(pluginJson, path.join(targetFolder, 'plugin.json')) //the non-minified version
    const pluginJsonData = JSON.parse(await fs.readFile(pluginJson))

    const pluginFolder = pluginDevFolder.replace(rootFolderPath, '').substring(1)

    // default dateTime, uses .pluginsrc if exists
    // see https://www.strfti.me/ for formatting
    const dateTimeFormat = await getPluginConfig('dateTimeFormat')
    const dateTime = dateTimeFormat.length > 0 ? strftime(dateTimeFormat) : new Date().toISOString().slice(0, 16)

    const dependencies = pluginJsonData['plugin.requiredFiles'] || []
    let dependenciesCopied = 0,
      dataFolder = null
    if (dependencies.length > 0) {
      // copy files also to data folder where we can save out the generated HTML files to test in browser
      // this is only done for plugins that have dependencies and stored locally. not uploaded to github or to users plugins
      dataFolder = path.join(targetFolder, '..', 'data', pluginJsonData['plugin.id'])
      if (!existsSync(dataFolder)) {
        await mkdirp(dataFolder)
        console.log(`Created data folder: ${dataFolder}`)
      } else {
        dataFolder = null
      }
      // if requiredFiles exists, create a watcher that triggers a rebuild when any of these (e.g. JSX) files change
      // even though they are not in the plugin build index.js
      // if requiredFiles exists, create a symlink from the requiredFiles folder in the plugin to the data folder
      // this allows the plugin to write an HTML file to the data folder and then we can access it in the development folder in VSCode
      for (const dependency of dependencies) {
        const filePath = path.join(pluginDevFolder, 'requiredFiles', dependency)
        if (existsSync(filePath)) {
          await fs.copyFile(filePath, path.join(targetFolder, dependency))
          if (dataFolder) {
            await await fs.copyFile(filePath, path.join(dataFolder, dependency))
          }
          dependenciesCopied++
          // console.log(`Copying ${dependency} to ${targetFolder}`)
        } else {
          console.log(colors.red.bold(`Cannot copy plugin.dependency "${dependency}" (${filePath}) as it doesn't exist at this location.`))
        }
      }
    }

    let msg = COMPACT
      ? `${dateTime} - ${pluginFolder} (v${pluginJsonData['plugin.version']})`
      : colors.cyan(`${dateTime} -- ${pluginFolder} (v${pluginJsonData['plugin.version']})`) +
        `\n   Built ${dependenciesCopied > 0 ? `script.js & copied plugin.json + ${dependenciesCopied} requiredFiles` : `and`} copied to the "Plugins" folder.`

    if (DEBUGGING) {
      msg += colors.yellow(`\n   Built in DEBUG mode. Not ready to deploy.\n`)
    } else {
      if (!COMPACT) {
        msg += ` To release this plugin, update changelog.md and run:\n   ${`npm run release "${pluginFolder}"\n`}`
      }
    }

    if (NOTIFY) {
      notifier.notify({
        title: 'NotePlan Plugin Build',
        message: `${pluginJsonData['plugin.name']} v${pluginJsonData['plugin.version']}`,
      })
    }

    if (!isBuildTask) {
      console.log(msg)
    }
  } else {
    console.log(`Generated "${outputFile.replace(rootFolder, '')}"`)
  }
}

console.log('')
console.log(colors.yellow.bold(`🧩 NotePlan Plugin Development v${pkgInfo.version} (${pkgInfo.build})`))

// Command line options
program
  .option('-d, --debug', 'Rollup: allow for better JS debugging - no minification or transpiling')
  .option('-m, --minify', 'Rollup: create minified output to reduce file size')
  .option('-c, --compact', 'Rollup: use compact output')
  .option('-n, --notify', 'Show Notification')
  .option('-b, --build', 'Rollup: build plugin only (no watcher)')
  .parse(process.argv)

const options = program.opts()
const DEBUGGING = options.debug || false
const MINIFY = options.minify || false
const COMPACT = options.compact || false
const BUILD = options.build || false
const NOTIFY = options.notify || false

if (DEBUGGING && !COMPACT) {
  console.log(
    colors.yellow.bold(
      `Running in DEBUG mode for purposes of seeing the Javascript script.js code exactly as it appears in your editor. This means no cleaning and no transpiling. Good for debugging, but bad for deployment to older machines. Make sure you run the autowatch command without the --debug flag before you release!\n`,
    ),
  )
}
if (COMPACT) {
  console.log('')
  console.log(colors.green.bold(`==> Rollup autowatch running. Will use compact output when there are no errors\n`))
}
if (MINIFY) {
  console.log(colors.cyan.bold(`==> Rollup autowatch running. Will use minified output\n`))
}

/**
 * @description Rebuild the plugin commands list, checking for collisions. Runs every time a plugin is updated
 * @param {string} pluginPath
 * @private
 */
async function checkPluginList(pluginPaths) {
  const pluginCommands = {}
  for (const pluginPath of pluginPaths) {
    // console.log(`About to read ${pluginPath}`)
    const pluginFile = await getPluginFileContents(path.join(pluginPath, 'plugin.json')) // console.log(`*** * READ\n${JSON.stringify(pluginFile)}`)

    if (pluginFile) {
      pluginFile['plugin.commands']?.forEach((command) => {
        if (pluginCommands[command.name]) {
          console.log(colors.red.bold(`\n!!!!\nCommand collision: "${command.name}" exists already!`))
          console.log(`\tTrying to add: "${command.name}" from ${path.basename(pluginPath)}`)
          console.log(
            colors.yellow(
              `\tConflicts with "${pluginCommands[command.name].name}" in ${
                pluginCommands[command.name].folder
              }\nCommand will be added & will work but should should be changed to be unique!!!\n`,
            ),
          )
        } else {
          pluginCommands[command.name] = command
          pluginCommands[command.name].folder = path.basename(pluginPath)
          pluginCommands[command.name].pluginName = pluginFile['plugin.name']
        }
      })
    } else {
      console.log(colors.red(`^^^ checkPluginList: For some reason could not parse file at: ${pluginPath}`))
    }
  }
  await createPluginListing(pluginCommands)
}

async function main() {
  // const args = getArgs()

  const limitToFolders = await getFolderFromCommandLine(rootFolderPath, program.args)
  console.log('')

  if (limitToFolders.length && !COMPACT) {
    console.log(
      colors.yellow.bold(
        `\nWARNING: Keep in mind that if you are editing shared files used by other plugins that you could be affecting them by not rebuilding/testing them all here. You have been warned. :)\n`,
      ),
    )
  }
  const rootFolder = await fs.readdir(rootFolderPath, {
    withFileTypes: true,
  })
  const copyTargetPath = await getCopyTargetPath(rootFolder)

  const rootLevelFolders = rootFolder
    .filter(
      (dirent) =>
        dirent.isDirectory() && !dirent.name.startsWith('.') && !FOLDERS_TO_IGNORE.includes(dirent.name) && (limitToFolders.length === 0 || limitToFolders.includes(dirent.name)),
    )
    .map(async (dirent) => {
      const pluginFolder = path.join(__dirname, '..', dirent.name)
      const pluginContents = await fs.readdir(pluginFolder, {
        withFileTypes: true,
      })
      const isBundled = pluginContents.some((dirent) => dirent.name === 'src' && dirent.isDirectory)
      if (!isBundled) {
        return null
      }
      const srcFiles = await fs.readdir(path.join(pluginFolder, 'src'))
      const hasIndexFile = srcFiles.includes('index.js')
      if (!hasIndexFile) {
        return null
      }
      return pluginFolder
    })
  const bundledPlugins = (await Promise.all(rootLevelFolders)).filter(Boolean)

  const rollupConfigs = bundledPlugins.map(getConfig)

  watcher = rollup.watch(rollupConfigs)

  watcher.on('event', async (event) => {
    if (event.result) {
      event.result.close()
    }
    if (event.code === 'BUNDLE_END' && copyTargetPath != null) {
      const outputFile = event.output[0]
      const pluginDevFolder = bundledPlugins.find((pluginFolder) => outputFile.includes(pluginFolder))

      if (pluginDevFolder != null) {
        await copyBuild(outputFile)
      } else {
        console.log(`Generated "${outputFile.replace(rootFolder, '')}"`)
      }
    } else if (event.code === 'BUNDLE_END') {
      console.log('no copyTargetPath', copyTargetPath)
    } else if (event.code === 'ERROR') {
      messenger.error(`!!!!!!!!!!!!!!!\nRollup ${event.error}\n!!!!!!!!!!!!!!!\n`)
      if (NOTIFY) {
        notifier.notify({
          title: 'NotePlan Plugins Build',
          message: `An error occurred during build process.\nSee console for more information`,
        })
      }
    }
  })

  if (!COMPACT) {
    console.log('')
    console.log(colors.green(`==> Building and Watching for changes\n`))
  }
}

async function build() {
  console.log('')
  try {
    const limitToFolders = await getFolderFromCommandLine(rootFolderPath, program.args, true)

    const rootFolder = await fs.readdir(rootFolderPath, {
      withFileTypes: true,
    })
    const copyTargetPath = await getCopyTargetPath(rootFolder)

    const rootLevelFolders = rootFolder
      .filter(
        (dirent) =>
          dirent.isDirectory() && !dirent.name.startsWith('.') && !FOLDERS_TO_IGNORE.includes(dirent.name) && (limitToFolders.length === 0 || limitToFolders.includes(dirent.name)),
      )
      .map(async (dirent) => {
        const pluginFolder = path.join(__dirname, '..', dirent.name)
        const pluginContents = await fs.readdir(pluginFolder, {
          withFileTypes: true,
        })
        const isBundled = pluginContents.some((dirent) => dirent.name === 'src' && dirent.isDirectory)
        if (!isBundled) {
          return null
        }
        const srcFiles = await fs.readdir(path.join(pluginFolder, 'src'))
        const hasIndexFile = srcFiles.includes('index.js')
        if (!hasIndexFile) {
          return null
        }
        return pluginFolder
      })
    const bundledPlugins = (await Promise.all(rootLevelFolders)).filter(Boolean)

    if (bundledPlugins.length > 1) {
      const progressOptions = {
        clear: true,
        complete: '\u001b[42m \u001b[0m',
        incomplete: '\u001b[40m \u001b[0m',
        total: bundledPlugins.length,
        width: 50,
      }

      progress = new ProgressBar(`${colors.yellow(':bar :percent built :eta/secs remaining')}`, progressOptions)
    }

    let processed = 0
    for (const plugin of bundledPlugins) {
      const pluginJsonFilename = path.join(plugin, 'plugin.json')
      const pluginJsonData = JSON.parse(await fs.readFile(pluginJsonFilename))

      if (bundledPlugins.length === 1) {
        messenger.info(`  Building ${path.basename(plugin)} (${pluginJsonData['plugin.version']})`)
      }

      const options = getConfig(plugin)

      const inputOptions = {
        external: options.external,
        input: options.input,
        plugins: options.plugins,
        context: options.context,
      }

      const outputOptions = options.output

      // create a bundle
      const bundle = await rollup.rollup(inputOptions)

      const { output } = await bundle.generate(outputOptions)

      await bundle.write(outputOptions)

      const result = await copyBuild(path.join(plugin, 'script.js'), true)

      await bundle.close()

      if (bundledPlugins.length > 1) {
        processed++
        progress.tick()
      }
    }

    console.log('')
    if (bundledPlugins.length > 1) {
      messenger.success(`${bundledPlugins.length} Plugins Built Successfully`, 'SUCCESS')
    } else {
      messenger.success('Build Process Complete', 'SUCCESS')
    }
  } catch (error) {
    console.log(error.message)
    console.log('')
    messenger.error('Build Error Occurred', 'ERROR')
    process.exit()
  }
}

function getConfig(pluginPath) {
  let requiredFilesWatchPlugin = null
  const requiredFilesInDevFolder = path.join(pluginPath, 'requiredFiles')
  if (existsSync(requiredFilesInDevFolder)) {
    console.log(colors.yellow(`==> Watching "requiredFiles" folder for changes`))
    requiredFilesWatchPlugin = {
      name: 'watch-external-files',
      async buildStart() {
        const files = await fg(path.join(requiredFilesInDevFolder, '**/*'))
        for (let file of files) {
          // console.log(`Watching ${file}`)
          this.addWatchFile(file)
        }
      },
    }
  }
  return {
    external: ['fs'],
    input: path.join(pluginPath, 'src/index.js'),
    output: {
      file: path.join(pluginPath, 'script.js'),
      format: 'iife',
      name: 'exports',
      footer: 'Object.assign(typeof(globalThis) == "undefined" ? this : globalThis, exports)',
    },
    plugins: [requiredFilesWatchPlugin].concat(
      DEBUGGING
        ? [
            alias({
              entries: pluginConfig.aliasEntries,
            }),
            babel({
              presets: ['@babel/flow'],
              babelHelpers: 'bundled',
              babelrc: false,
              exclude: ['node_modules/**', '*.json'],
              compact: false,
            }),
            commonjs(),
            json(),
            nodeResolve({ browser: true, jsnext: true }),
          ]
        : MINIFY
        ? [
            alias({
              entries: pluginConfig.aliasEntries,
            }),
            babel({ babelHelpers: 'bundled', compact: true }),
            commonjs(),
            json(),
            nodeResolve({ browser: true, jsnext: true }),
            terser({
              compress: true,
              mangle: true,
              output: {
                comments: false,
                beautify: false,
                indent_level: 2,
              },
            }),
          ]
        : [
            alias({
              entries: pluginConfig.aliasEntries,
            }),
            babel({ babelHelpers: 'bundled', compact: false }),
            commonjs(),
            json(),
            nodeResolve({ browser: true, jsnext: true }),
            terser({
              compress: false,
              mangle: false,
              output: {
                comments: false,
                beautify: true,
                indent_level: 2,
              },
            }),
          ],
    ),
    context: 'this',
  }
}

if (!BUILD) {
  process.on('SIGINT', function () {
    console.log('\n\n')
    console.log(colors.yellow('Quitting...\n'))
    if (watcher) {
      watcher.close()
    }
  })
} else {
  process.on('SIGINT', function () {
    console.log('\n\n')
    messenger.warn('Build Process Aborted', 'ABORT')
    process.exit()
  })
}

if (BUILD) {
  build()
} else {
  main()
}
