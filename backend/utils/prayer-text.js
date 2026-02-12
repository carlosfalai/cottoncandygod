/**
 * Vadani Kaval Gheta - Traditional Marathi prayer before meals.
 * Recited in Nath Sampradaya ashrams before prasad (blessed food).
 * @module prayer-text
 */

const PRAYER_DEVANAGARI = `वदनि कवळ घेता नाम घ्या श्रीहरीचे ।
सहज हवन होते नाम घेता फुकाचे ।
जिवन करी जिवित्वा अन्न हे पूर्णब्रह्म ।
उदरभरण नोहे जाणिजे यज्ञकर्म ।
सीता कांतं स्मरणं ।
जयजय रघुवीर समर्थ ॥`;

const PRAYER_TRANSLITERATION = `Vadani kavala ghetan nama ghya Shri Hariche
Sahazu havana hote nama ghetan fukache
Jivana kari jivitva anna he purna brahma
Udara bharana nohe zanize yednya karma
Sita kantam smaranam
Jay Jay Raguvir Samartha`;

const PRAYER_YOUTUBE_URL = 'https://www.youtube.com/watch?v=ot79QTRqZyk';
const PRAYER_IMAGE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co/storage/v1/object/public/ashram-photos/food-prayer/vadani-kaval-gheta.png';

/**
 * Returns the full prayer text formatted for Telegram (Markdown).
 * Includes Devanagari, transliteration, and YouTube link.
 * @returns {string} Formatted prayer text
 */
function getFullPrayerText() {
  return [
    '🙏 *Vadani Kaval Gheta*',
    '',
    '```',
    PRAYER_DEVANAGARI,
    '```',
    '',
    '_Transliteration:_',
    '',
    PRAYER_TRANSLITERATION,
    '',
    `🎵 [Listen on YouTube](${PRAYER_YOUTUBE_URL})`
  ].join('\n');
}

module.exports = {
  PRAYER_DEVANAGARI,
  PRAYER_TRANSLITERATION,
  PRAYER_YOUTUBE_URL,
  PRAYER_IMAGE_URL,
  getFullPrayerText
};
