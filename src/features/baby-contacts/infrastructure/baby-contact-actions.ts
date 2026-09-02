import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export type BabyContactMapTarget = 'google' | 'system';

function openWebUrlInNewTab(url: string): void {
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!openedWindow) {
    throw new Error('The browser blocked the new tab.');
  }
  openedWindow.opener = null;
}

export async function copyBabyContactValue(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}

export async function callBabyContact(phone: string): Promise<void> {
  await Linking.openURL(`tel:${phone.replace(/[^+\d,;#*]/g, '')}`);
}

export async function openBabyContactWebsite(url: string): Promise<void> {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (Platform.OS === 'web') {
    openWebUrlInNewTab(normalized);
    return;
  }
  await Linking.openURL(normalized);
}

export async function openBabyContactAddress(
  address: string,
  target: BabyContactMapTarget = 'google',
): Promise<void> {
  const query = encodeURIComponent(address);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  if (Platform.OS === 'web') {
    openWebUrlInNewTab(googleMapsUrl);
    return;
  }
  const url = target === 'google'
    ? googleMapsUrl
    : Platform.select({ android: `geo:0,0?q=${query}`, ios: `maps:0,0?q=${query}` });
  if (!url) {
    throw new Error('No map application is available.');
  }
  await Linking.openURL(url);
}
