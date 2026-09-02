import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export async function copyBabyContactValue(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}

export async function callBabyContact(phone: string): Promise<void> {
  await Linking.openURL(`tel:${phone.replace(/[^+\d,;#*]/g, '')}`);
}

export async function openBabyContactWebsite(url: string): Promise<void> {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  await Linking.openURL(normalized);
}

export async function openBabyContactAddress(address: string): Promise<void> {
  const query = encodeURIComponent(address);
  const url = Platform.select({
    android: `geo:0,0?q=${query}`,
    ios: `maps:0,0?q=${query}`,
    default: `https://www.openstreetmap.org/search?query=${query}`,
  });
  await Linking.openURL(url);
}
