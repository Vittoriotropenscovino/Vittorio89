// The link behind the QR code on the share card.
// Play Console's acquisition reports show utm_source and utm_campaign taken
// straight from the parameters of the store-listing link (Play Console Help,
// "UTM source / UTM campaign"). No other parameter, nothing sent anywhere: the
// app only prints the link into the QR, Google counts the visits.
/**
 * The app is only on Google Play: the card says "Android only" next to the
 * claim. When the iOS version is out, set this to false and the words go away
 * from every card in every language (the QR will then need a link that works
 * for both stores).
 */
export const ANDROID_ONLY = true;

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.travelsphere.app';

/** Sharecard source, campaign "card" (normal card) or e.g. "recap2026" (year recap). */
export const shareCardUrl = (campaign: string = 'card'): string => {
    const clean = campaign.replace(/[^a-z0-9_-]/gi, '') || 'card';
    return `${PLAY_STORE_URL}&utm_source=sharecard&utm_campaign=${clean}`;
};
