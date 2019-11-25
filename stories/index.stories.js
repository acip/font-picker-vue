import { storiesOf } from '@storybook/vue';
import OnePicker from './picker-wrappers/OnePicker.vue';
import TwoPickers from './picker-wrappers/TwoPickers.vue';

import './style.css';

storiesOf('FontPicker', module)
	.add('GitHub demo', () => ({
		components: { OnePicker },
		template: '<one-picker default-font="Open Sans"></one-picker>'
	}))
	.add('Local default font', () => ({
		components: { OnePicker },
		template: '<one-picker default-font="Arial" :options="{ name: \'2\', limit: 50 }"></one-picker>'
	}))
	.add('Non-existent default font', () => ({
		components: { OnePicker },
		template: '<one-picker default-font="asdf" :options="{ name: \'3\', limit: 50 }"></one-picker>'
	}))
	.add('Custom font variants', () => ({
		components: { OnePicker },
		template: '<one-picker default-font="Barlow" :options="{ name: \'4\', variants: [\'900italic\'] }"></one-picker>'
	}))
	.add('Two font pickers', () => ({
		components: { TwoPickers },
		template: '<two-pickers></two-pickers>'
	}));
