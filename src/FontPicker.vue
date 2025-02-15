<template>
	<div :id="`font-picker${pickerSuffix}`" class="font-picker" :title="state.errorText">
		<button class="dropdown-button" type="button"
				:class="{expanded: state.expanded}"
				@click="toggleExpanded"
				@keyup="updateFilter">
			<p class="dropdown-font-name" :style="{'font-family' : state.activeFont}">{{state.activeFont}}</p>
			<p class="dropdown-icon" :class="state.loadingStatus"></p>
		</button>
		<ul v-if="state.loadingStatus === 'finished' && fontManager.fonts"
			:class="{expanded: state.expanded}"
			@scroll="onScroll">
			<li v-for="font in fonts" :key="font.family">
				<button type="button" class="font-abeezece"
						:class="`font-${snakeCase(font.family)}${pickerSuffix} ${font.family === state.activeFont ? 'active-font' : ''}`"
                        :style="{'font-family' : font.family}"
						@click.prevent="itemClick(font)"
						@keypress.prevent="itemClick(font)">{{font.family}}</button>
			</li>
		</ul>
	</div>
</template>

<script>
    import { FontManager } from 'font-picker';
    import FallbackFontManager from './FallbackFontManager';

    /**
     * Vue interface for the font picker
     * @prop {string} apiKey (required) - Google API key
     * @prop {string} activeFont - Font that should be selected in the font picker and applied to the
     * text (default: 'Open Sans'). Must be stored in component state, and be updated using an onChange
     * listener. See README.md for an example.
     * @prop {Object} options - Object with additional (optional) parameters:
     *   @prop {string} name - If you have multiple font pickers on your site, you need to give them
     *   unique names (which may only consist of letters and digits). These names must also be appended
     *   to the font picker's ID and the .apply-font class name.
     *   Example: If { name: 'main' }, use #font-picker-main and .apply-font-main
     *   @prop {string[]} families - If only specific fonts shall appear in the list, specify their
     *   names in an array
     *   @prop {string[]} categories - Array of font categories
     *   Possible values: 'sans-serif', 'serif', 'display', 'handwriting', 'monospace' (default: all
     *   categories)
     *   @prop {string[]} variants - Array of variants which the fonts must include and which will be
     *   downloaded; the first variant in the array will become the default variant (and will be used
     *   in the font picker and the .apply-font class)
     *   Example: ['regular', 'italic', '700', '700italic'] (default: ['regular'])
     *   @prop {number} limit - Maximum number of fonts to be displayed in the list (the least popular
     *   fonts will be omitted; default: 100)
     *   @prop {string} sort - Sorting attribute for the font list
     *   Possible values: 'alphabetical' (default), 'popularity'
     * @prop {function} onChange - Function which is executed whenever the user changes the active font
     * and its stylesheet finishes downloading
     */
    export default {
        props: ['activeFont', 'apiKey', 'options'],

        data() {
            return {
                state: {
                    activeFont: this.activeFont,
                    errorText: '',
                    expanded: false,
                    filter: '',
                    loadingStatus: 'loading' // possible values: 'loading', 'finished', 'error'
                },
                pickerSuffix: '',
                fontManager: null,
            };
        },

        computed: {
            fonts: function fontFiltered() {
                return this.fontManager.fonts.filter(font => font.family.toLowerCase().startsWith(this.state.filter));
            }
        },

        mounted() {
            // Determine selector suffix from font picker's name
            if (this.options && this.options.name) {
                this.pickerSuffix = `-${this.options.name}`;
            } else {
                this.pickerSuffix = '';
            }

            // Initialize FontManager object and generate the font list
            this.fontManager = new FontManager(
                this.apiKey,
                this.activeFont,
                this.options
            );

            this.fontManager.init()
                .finally(() => {
                    // font list has finished loading
                    this.setState({
                        errorText: '',
                        loadingStatus: 'finished'
                    });
                })
                .catch((err) => {
                    this.fontManager = new FallbackFontManager();
                    // select first fallback font as default one
                    this.$emit('change', this.fontManager.fonts[0]);
                    console.error(this.state.errorText);
                    console.error(err);
                });
        },

        watch: {
            activeFont() {
                if (this.state.activeFont !== this.activeFont) {
                    this.setActiveFont(this.activeFont);
                }
            },
        },

        methods: {
            /**
             * Set state object
             */
            setState(state) {
                this.state = Object.assign(this.state, state);
            },

            /**
             * EventListener for closing the font picker when clicking anywhere outside it
             */
            onClose(e) {
                let targetElement = e.target; // clicked element

                do {
                    if (targetElement === document.getElementById('font-picker')) {
                        // click inside font picker
                        return;
                    }
                    // move up the DOM
                    targetElement = targetElement.parentNode;
                } while (targetElement);

                // click outside font picker
                this.toggleExpanded();
            },

            /**
             * Download the font previews for all visible font entries and the five after them
             */
            onScroll(e) {
                const elementHeight = e.target.scrollHeight / this.fontManager.fonts.length;
                const downloadIndex = Math.ceil((e.target.scrollTop + e.target.clientHeight) / elementHeight);
                this.fontManager.downloadPreviews(downloadIndex + 5);
            },

            /**
             * Set the font with the given font list index as the active one
             */
            setActiveFont(fontFamily) {
                const activeFontIndex = this.fontManager.setActiveFont(fontFamily);
                if (activeFontIndex === -1) {
                    // error trying to change font
                    this.setState({
                        activeFont: fontFamily,
                        errorText: `Cannot update activeFont: The font "${fontFamily}" is not in the font list`,
                        loadingStatus: 'error'
                    });
                    console.error(this.state.errorText);
                } else {
                    // font change successful
                    this.setState({
                        activeFont: fontFamily,
                        errorText: '',
                        loadingStatus: 'finished'
                    });
                }
            },

            /**
             * Expand/collapse the picker's font list
             */
            toggleExpanded() {
                const updateState = {
                    expanded: !this.state.expanded,
                };

                if (!this.state.expanded) {
                    updateState.filter = '';
                }

                this.setState(updateState);
            },

            /**
             * set search string
             */
            updateFilter($event) {
                if ($event.key === 'Escape') {
                    this.toggleExpanded();
                    return;
                }

                if ($event.key === 'Backspace') {
                    this.setState({
                        // remove the last char from filter
                        filter: this.state.filter.substr(0, this.state.filter.length - 1)
                    });
                    return;
                }

                // select the first font
                if ($event.key === 'Enter') {
                    const font = this.fonts[0];
                    if (font) {
                        this.itemClick(font);
                    }
                    return;
                }

                const pressedChar = String.fromCharCode($event.keyCode);
                // is valid char
                if (!pressedChar || /[^a-zA-Z]/.test(pressedChar)) {
                    return;
                }

                // add pressed key to filteer
                this.setState({
                    filter: this.state.filter + pressedChar.toLowerCase()
                });
            },

			snakeCase(text) {
                return text.replace(/\s+/g, '-').toLowerCase();
			},

            itemClick(font) {
                this.toggleExpanded();
                this.$emit('change', font);

            }
        },
    }
</script>

<style lang="scss">
	div[id^="font-picker"].font-picker {
		position: relative;
		display: inline-block;
		box-shadow: inset 0px -2px 2px rgba(0, 0, 0, 0.08);
        border: 1px solid #BDC1CB;
        background: #fff;
        height: 20px;
        border-radius: 2px;
        width: 100%;

		* {
			box-sizing: border-box;
		}

		p {
			margin: 0;
			padding: 0;
		}

		button {
			background: none;
			border: 0;
			color: inherit;
			cursor: pointer;
			font-size: inherit;
			outline: none;
		}

		.dropdown-button {
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: space-between;
			background: transparent;
            line-height: 1;
            padding: 0 0.25rem;
            height: 20px;

			&:hover, &.expanded, &:focus {
				background: #bebebe;
			}

			.dropdown-font-name {
				overflow: hidden;
				white-space: nowrap;
			}

			&.expanded .dropdown-icon.finished:before {
				-webkit-transform: rotate(-180deg);
				transform: rotate(-180deg);
			}
		}

		.dropdown-icon {

			&.loading:before {
				content: '';
				display: block;
				height: 10px;
				width: 10px;
				border-radius: 50%;
				border: 2px solid #b2b2b2;
				border-top-color: black;
				-webkit-animation: spinner 0.6s linear infinite;
				animation: spinner 0.6s linear infinite;
			}

			&.finished:before {
				content: '';
				display: block;
				height: 0;
				width: 0;
				border-left: 5px solid transparent;
				border-right: 5px solid transparent;
				border-top: 6px solid black;
				transition: -webkit-transform 0.3s;
				transition: transform 0.3s, -webkit-transform 0.3s;
				margin: 0 2px;
			}

			&.error:before {
				content: '⚠';
			}
		}

		ul {
			position: absolute;
			z-index: 1;
			max-height: 0;
			width: 210px;
			overflow-x: hidden;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
			margin: 0;
			padding: 0;
			background: #EAEAEA;
			box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
			transition: 0.3s;

			&.expanded {
				max-height: 200px;
			}

			li {
				height: 35px;
				list-style: none;

				button {
					height: 100%;
					width: 100%;
					display: flex;
					align-items: center;
					padding: 0 10px;
					white-space: nowrap;

					&:hover, &:focus {
						background: #dddddd;
					}

					&.active-font {
						background: #d1d1d1;
					}
				}
			}
		}
	}

	@-webkit-keyframes spinner {
		to {
			-webkit-transform: rotate(360deg);
			transform: rotate(360deg);
		}
	}

	@keyframes spinner {
		to {
			-webkit-transform: rotate(360deg);
			transform: rotate(360deg);
		}
	}

</style>
