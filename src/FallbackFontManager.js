export default class FallbackFontManager {
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
