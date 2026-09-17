import { build } from 'esbuild'

const WORKSPACE_SCOPE = '@collab-docs/'

const externalizeNpmPackages = {
  name: 'externalize-npm-packages',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^[^./]/ }, ({ path }) =>
      path.startsWith(WORKSPACE_SCOPE) ? undefined : { path, external: true },
    )
  },
}

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  plugins: [externalizeNpmPackages],
  logLevel: 'info',
})
