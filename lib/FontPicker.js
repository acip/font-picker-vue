'use strict';

var fontPicker = require('font-picker');

class FallbackFontManager {
	constructor() {
		this.fonts = [
			{ family: 'Arial' },
			{ family: 'Comic Sans MS' },
			{ family: 'Courier New' },
			{ family: 'Geneva' },
			{ family: 'Georgia' },
			{ family: 'Helvetica' },
			{ family: 'Impact' },
			{ family: 'Lucida Console' },
			{ family: 'Tahoma' },
			{ family: 'Times New Roman' },
			{ family: 'Verdana' }
		];
	}

	setActiveFont(fontFamily) {
		const listIndex = this.fonts.findIndex(f => f.family === fontFamily);
		if (listIndex === -1) {
			// Font is not part of font list: Keep current activeFont and log error
			console.error(`Cannot update activeFont: The font "${fontFamily}" is not in the font list`);
			return -1;
		}
		// Font is part of font list: Update activeFont and set previous one as fallback
		// var previousFont = this.activeFont.family;
		this.activeFont = this.fonts[listIndex];
		return listIndex;
	}

	downloadPreviews() {
		// intentionally empty to confirm with FontManager from font-picker
		return this;
	}
}

//

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
    var script = {
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
            this.fontManager = new fontPicker.FontManager(
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
    };

/* script */
            const __vue_script__ = script;
            
/* template */
var __vue_render__ = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    {
      staticClass: "font-picker",
      attrs: {
        id: "font-picker" + _vm.pickerSuffix,
        title: _vm.state.errorText
      }
    },
    [
      _c(
        "button",
        {
          staticClass: "dropdown-button",
          class: { expanded: _vm.state.expanded },
          attrs: { type: "button" },
          on: { click: _vm.toggleExpanded, keyup: _vm.updateFilter }
        },
        [
          _c(
            "p",
            {
              staticClass: "dropdown-font-name",
              style: { "font-family": _vm.state.activeFont }
            },
            [_vm._v(_vm._s(_vm.state.activeFont))]
          ),
          _vm._v(" "),
          _c("p", {
            staticClass: "dropdown-icon",
            class: _vm.state.loadingStatus
          })
        ]
      ),
      _vm._v(" "),
      _vm.state.loadingStatus === "finished" && _vm.fontManager.fonts
        ? _c(
            "ul",
            {
              class: { expanded: _vm.state.expanded },
              on: { scroll: _vm.onScroll }
            },
            _vm._l(_vm.fonts, function(font) {
              return _c("li", { key: font.family }, [
                _c(
                  "button",
                  {
                    staticClass: "font-abeezece",
                    class:
                      "font-" +
                      _vm.snakeCase(font.family) +
                      _vm.pickerSuffix +
                      " " +
                      (font.family === _vm.state.activeFont
                        ? "active-font"
                        : ""),
                    style: { "font-family": font.family },
                    attrs: { type: "button" },
                    on: {
                      click: function($event) {
                        $event.preventDefault();
                        _vm.itemClick(font);
                      },
                      keypress: function($event) {
                        $event.preventDefault();
                        _vm.itemClick(font);
                      }
                    }
                  },
                  [_vm._v(_vm._s(font.family))]
                )
              ])
            })
          )
        : _vm._e()
    ]
  )
};
var __vue_staticRenderFns__ = [];
__vue_render__._withStripped = true;

  /* style */
  const __vue_inject_styles__ = function (inject) {
    if (!inject) return
    inject("data-v-f6ab32f2_0", { source: "\n@charset \"UTF-8\";\ndiv[id^=\"font-picker\"].font-picker {\n  position: relative;\n  display: inline-block;\n  box-shadow: inset 0px -2px 2px rgba(0, 0, 0, 0.08);\n  border: 1px solid #BDC1CB;\n  background: #fff;\n  height: 20px;\n  border-radius: 2px;\n  width: 100%;\n}\ndiv[id^=\"font-picker\"].font-picker * {\n    box-sizing: border-box;\n}\ndiv[id^=\"font-picker\"].font-picker p {\n    margin: 0;\n    padding: 0;\n}\ndiv[id^=\"font-picker\"].font-picker button {\n    background: none;\n    border: 0;\n    color: inherit;\n    cursor: pointer;\n    font-size: inherit;\n    outline: none;\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-button {\n    width: 100%;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    background: transparent;\n    line-height: 1;\n    padding: 0 0.25rem;\n    height: 20px;\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-button:hover, div[id^=\"font-picker\"].font-picker .dropdown-button.expanded, div[id^=\"font-picker\"].font-picker .dropdown-button:focus {\n      background: #bebebe;\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-button .dropdown-font-name {\n      overflow: hidden;\n      white-space: nowrap;\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-button.expanded .dropdown-icon.finished:before {\n      -webkit-transform: rotate(-180deg);\n      transform: rotate(-180deg);\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-icon.loading:before {\n    content: '';\n    display: block;\n    height: 10px;\n    width: 10px;\n    border-radius: 50%;\n    border: 2px solid #b2b2b2;\n    border-top-color: black;\n    -webkit-animation: spinner 0.6s linear infinite;\n    animation: spinner 0.6s linear infinite;\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-icon.finished:before {\n    content: '';\n    display: block;\n    height: 0;\n    width: 0;\n    border-left: 5px solid transparent;\n    border-right: 5px solid transparent;\n    border-top: 6px solid black;\n    transition: -webkit-transform 0.3s;\n    transition: transform 0.3s, -webkit-transform 0.3s;\n    margin: 0 2px;\n}\ndiv[id^=\"font-picker\"].font-picker .dropdown-icon.error:before {\n    content: '⚠';\n}\ndiv[id^=\"font-picker\"].font-picker ul {\n    position: absolute;\n    z-index: 1;\n    max-height: 0;\n    width: 210px;\n    overflow-x: hidden;\n    overflow-y: auto;\n    -webkit-overflow-scrolling: touch;\n    margin: 0;\n    padding: 0;\n    background: #EAEAEA;\n    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);\n    transition: 0.3s;\n}\ndiv[id^=\"font-picker\"].font-picker ul.expanded {\n      max-height: 200px;\n}\ndiv[id^=\"font-picker\"].font-picker ul li {\n      height: 35px;\n      list-style: none;\n}\ndiv[id^=\"font-picker\"].font-picker ul li button {\n        height: 100%;\n        width: 100%;\n        display: flex;\n        align-items: center;\n        padding: 0 10px;\n        white-space: nowrap;\n}\ndiv[id^=\"font-picker\"].font-picker ul li button:hover, div[id^=\"font-picker\"].font-picker ul li button:focus {\n          background: #dddddd;\n}\ndiv[id^=\"font-picker\"].font-picker ul li button.active-font {\n          background: #d1d1d1;\n}\n@-webkit-keyframes spinner {\nto {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n}\n}\n@keyframes spinner {\nto {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n}\n}\n\n/*# sourceMappingURL=FontPicker.vue.map */", map: {"version":3,"sources":["FontPicker.vue","C:\\xampp\\htdocs\\font-picker-vue/C:\\xampp\\htdocs\\font-picker-vue/C:\\xampp\\htdocs\\font-picker-vue\\src\\FontPicker.vue"],"names":[],"mappings":";AAAA,iBAAiB;ACmPjB;EACA,mBAAA;EACA,sBAAA;EACA,mDAAA;EACA,0BAAA;EACA,iBAAA;EACA,aAAA;EACA,mBAAA;EACA,YAAA;CAqHA;AA7HA;IAWA,uBAAA;CACA;AAZA;IAeA,UAAA;IACA,WAAA;CACA;AAjBA;IAoBA,iBAAA;IACA,UAAA;IACA,eAAA;IACA,gBAAA;IACA,mBAAA;IACA,cAAA;CACA;AA1BA;IA6BA,YAAA;IACA,cAAA;IACA,oBAAA;IACA,+BAAA;IACA,wBAAA;IACA,eAAA;IACA,mBAAA;IACA,aAAA;CAeA;AAnDA;MAuCA,oBAAA;CACA;AAxCA;MA2CA,iBAAA;MACA,oBAAA;CACA;AA7CA;MAgDA,mCAAA;MACA,2BAAA;CACA;AAlDA;IAwDA,YAAA;IACA,eAAA;IACA,aAAA;IACA,YAAA;IACA,mBAAA;IACA,0BAAA;IACA,wBAAA;IACA,gDAAA;IACA,wCAAA;CACA;AAjEA;IAoEA,YAAA;IACA,eAAA;IACA,UAAA;IACA,SAAA;IACA,mCAAA;IACA,oCAAA;IACA,4BAAA;IACA,mCAAA;IACA,mDAAA;IACA,cAAA;CACA;AA9EA;IAiFA,aAAA;CAAA;AAjFA;IAsFA,mBAAA;IACA,WAAA;IACA,cAAA;IACA,aAAA;IACA,mBAAA;IACA,iBAAA;IACA,kCAAA;IACA,UAAA;IACA,WAAA;IACA,oBAAA;IACA,2CAAA;IACA,iBAAA;CA2BA;AA5HA;MAoGA,kBAAA;CACA;AArGA;MAwGA,aAAA;MACA,iBAAA;CAkBA;AA3HA;QA4GA,aAAA;QACA,YAAA;QACA,cAAA;QACA,oBAAA;QACA,gBAAA;QACA,oBAAA;CASA;AA1HA;UAoHA,oBAAA;CACA;AArHA;UAwHA,oBAAA;CACA;AAMA;AACA;IACA,kCAAA;IACA,0BAAA;CAAA;CAAA;AAIA;AACA;IACA,kCAAA;IACA,0BAAA;CAAA;CAAA;;ADtRA,0CAA0C","file":"FontPicker.vue","sourcesContent":["@charset \"UTF-8\";\ndiv[id^=\"font-picker\"].font-picker {\n  position: relative;\n  display: inline-block;\n  box-shadow: inset 0px -2px 2px rgba(0, 0, 0, 0.08);\n  border: 1px solid #BDC1CB;\n  background: #fff;\n  height: 20px;\n  border-radius: 2px;\n  width: 100%; }\n  div[id^=\"font-picker\"].font-picker * {\n    box-sizing: border-box; }\n  div[id^=\"font-picker\"].font-picker p {\n    margin: 0;\n    padding: 0; }\n  div[id^=\"font-picker\"].font-picker button {\n    background: none;\n    border: 0;\n    color: inherit;\n    cursor: pointer;\n    font-size: inherit;\n    outline: none; }\n  div[id^=\"font-picker\"].font-picker .dropdown-button {\n    width: 100%;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    background: transparent;\n    line-height: 1;\n    padding: 0 0.25rem;\n    height: 20px; }\n    div[id^=\"font-picker\"].font-picker .dropdown-button:hover, div[id^=\"font-picker\"].font-picker .dropdown-button.expanded, div[id^=\"font-picker\"].font-picker .dropdown-button:focus {\n      background: #bebebe; }\n    div[id^=\"font-picker\"].font-picker .dropdown-button .dropdown-font-name {\n      overflow: hidden;\n      white-space: nowrap; }\n    div[id^=\"font-picker\"].font-picker .dropdown-button.expanded .dropdown-icon.finished:before {\n      -webkit-transform: rotate(-180deg);\n      transform: rotate(-180deg); }\n  div[id^=\"font-picker\"].font-picker .dropdown-icon.loading:before {\n    content: '';\n    display: block;\n    height: 10px;\n    width: 10px;\n    border-radius: 50%;\n    border: 2px solid #b2b2b2;\n    border-top-color: black;\n    -webkit-animation: spinner 0.6s linear infinite;\n    animation: spinner 0.6s linear infinite; }\n  div[id^=\"font-picker\"].font-picker .dropdown-icon.finished:before {\n    content: '';\n    display: block;\n    height: 0;\n    width: 0;\n    border-left: 5px solid transparent;\n    border-right: 5px solid transparent;\n    border-top: 6px solid black;\n    transition: -webkit-transform 0.3s;\n    transition: transform 0.3s, -webkit-transform 0.3s;\n    margin: 0 2px; }\n  div[id^=\"font-picker\"].font-picker .dropdown-icon.error:before {\n    content: '⚠'; }\n  div[id^=\"font-picker\"].font-picker ul {\n    position: absolute;\n    z-index: 1;\n    max-height: 0;\n    width: 210px;\n    overflow-x: hidden;\n    overflow-y: auto;\n    -webkit-overflow-scrolling: touch;\n    margin: 0;\n    padding: 0;\n    background: #EAEAEA;\n    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);\n    transition: 0.3s; }\n    div[id^=\"font-picker\"].font-picker ul.expanded {\n      max-height: 200px; }\n    div[id^=\"font-picker\"].font-picker ul li {\n      height: 35px;\n      list-style: none; }\n      div[id^=\"font-picker\"].font-picker ul li button {\n        height: 100%;\n        width: 100%;\n        display: flex;\n        align-items: center;\n        padding: 0 10px;\n        white-space: nowrap; }\n        div[id^=\"font-picker\"].font-picker ul li button:hover, div[id^=\"font-picker\"].font-picker ul li button:focus {\n          background: #dddddd; }\n        div[id^=\"font-picker\"].font-picker ul li button.active-font {\n          background: #d1d1d1; }\n\n@-webkit-keyframes spinner {\n  to {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg); } }\n\n@keyframes spinner {\n  to {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg); } }\n\n/*# sourceMappingURL=FontPicker.vue.map */",null]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__ = undefined;
  /* module identifier */
  const __vue_module_identifier__ = undefined;
  /* functional template */
  const __vue_is_functional_template__ = false;
  /* component normalizer */
  function __vue_normalize__(
    template, style, script$$1,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script$$1 === 'function' ? script$$1.options : script$$1) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "C:\\xampp\\htdocs\\font-picker-vue\\src\\FontPicker.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__.styles || (__vue_create_injector__.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var FontPicker = __vue_normalize__(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    __vue_create_injector__,
    undefined
  );

module.exports = FontPicker;
