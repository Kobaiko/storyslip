const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  try {
    // Build the embed script
    await esbuild.build({
      entryPoints: ['src/embed.ts'],
      bundle: true,
      minify: true,
      sourcemap: false,
      target: ['es2017'],
      format: 'iife',
      globalName: 'StorySlipWidget',
      outfile: 'dist/widget.js',
      banner: {
        js: '/* StorySlip Widget Embed Script - https://storyslip.com */',
      },
    });

    // Create a non-minified version for development
    await esbuild.build({
      entryPoints: ['src/embed.ts'],
      bundle: true,
      minify: false,
      sourcemap: true,
      target: ['es2017'],
      format: 'iife',
      globalName: 'StorySlipWidget',
      outfile: 'dist/widget.dev.js',
      banner: {
        js: '/* StorySlip Widget Embed Script (Development) - https://storyslip.com */',
      },
    });

    // Create package info
    const packageInfo = {
      name: '@storyslip/widget',
      version: require('./package.json').version,
      description: 'StorySlip embeddable widget',
      main: 'dist/widget.js',
      files: ['dist/'],
      built: new Date().toISOString(),
    };

    fs.writeFileSync('dist/package.json', JSON.stringify(packageInfo, null, 2));

    console.log('✅ Widget build completed successfully');
    console.log('📦 Files generated:');
    console.log('  - dist/widget.js (minified)');
    console.log('  - dist/widget.dev.js (development)');
    console.log('  - dist/package.json');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();