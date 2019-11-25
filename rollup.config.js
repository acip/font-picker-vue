import VuePlugin from 'rollup-plugin-vue';
import VueLoaderPlugin from 'vue-loader';

export default {
	input: 'src/FontPicker.vue',
	output: {
		file: 'lib/FontPicker.js',
		format: 'cjs'
	},
	external: ['vue', 'font-picker'],
	plugins: [VuePlugin(/* VuePluginOptions */), VueLoaderPlugin]
};
