import Helper from '@ember/component/helper';
import { ICON_EMOJI } from 'career-caddy-frontend/utils/quick-copy';

// CCEXT-18: map a golf icon key (flag | golfer | trophy | target | finish) to
// its color emoji glyph. Used by <QuickCopyIcon> for custom items. An unknown
// key falls back to the flag glyph so a row never renders blank.
//
// Usage: {{icon-emoji item.icon}}
export default class IconEmojiHelper extends Helper {
  compute([icon]) {
    return ICON_EMOJI[icon] ?? ICON_EMOJI.flag;
  }
}
