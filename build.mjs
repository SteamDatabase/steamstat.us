import * as esbuild from 'esbuild';
import htmlPlugin from '@chialab/esbuild-plugin-html';

const isDev = process.argv.includes('--dev');

const esbuildOptions = {
	entryPoints: ['src/index.html'],
	minify: true,
	bundle: false,
	sourcemap: false,
	chunkNames: 'static/[name]-[hash]',
	plugins: [
		htmlPlugin({
			minifyOptions: {
				minifySvg: false,
			},
		}),
	],
	outdir: 'public/',
	define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
};

if (isDev) {
	esbuildOptions.banner = {
		js: `window.DEV_MODE = true;new EventSource("/esbuild").addEventListener("change", () => location.reload());`
	};
}

const context = await esbuild.context(esbuildOptions);

if (isDev) {
	await context.watch();

	const { host, port } = await context.serve({
		host: 'localhost',
        servedir: 'public/',
    });

	console.log(`Serving at http://${host}:${port}`);
} else {
	console.log('Building');

	await context.rebuild();
	await context.dispose();
}
