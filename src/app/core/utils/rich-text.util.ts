const INVISIBLE_RICH_TEXT_ARTIFACTS_REGEX = /[\u00AD\u200B\u200C\u200D\u2060\uFEFF]/g;
const LINE_SEPARATOR_REGEX = /[\u2028\u2029]/g;
const INVISIBLE_ENTITY_ARTIFACTS_REGEX = /&(?:shy|#173|#x0*ad|#8203|#x0*200b|#8204|#x0*200c|#8205|#x0*200d|#8288|#x0*2060|#65279|#x0*feff);/gi;
const WORD_BREAK_TAG_REGEX = /<wbr\s*\/?>/gi;
const NON_BREAKING_SPACE_REGEX = /(?:\u00A0|&nbsp;|&#160;|&#xa0;)/gi;

/**
 * Remove invisible artifacts (soft-hyphen/zero-width chars) that can cause random word breaks on display.
 * Also replaces non-breaking spaces with standard spaces to avoid breaking justified text formatting.
 */
export function normalizeRichTextHtml(value: string): string {
    return (value ?? '')
        .replace(WORD_BREAK_TAG_REGEX, '')
        .replace(INVISIBLE_ENTITY_ARTIFACTS_REGEX, '')
        .replace(INVISIBLE_RICH_TEXT_ARTIFACTS_REGEX, '')
        .replace(LINE_SEPARATOR_REGEX, ' ')
        .replace(NON_BREAKING_SPACE_REGEX, ' ');
}
