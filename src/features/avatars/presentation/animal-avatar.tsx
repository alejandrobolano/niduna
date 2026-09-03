import { Image } from 'expo-image';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';

import type { AnimalAvatarVariant } from '@/features/avatars/domain/avatar';

interface AnimalAvatarProps {
  accessibilityLabel: string;
  photoUrl?: string;
  size: number;
  variant: AnimalAvatarVariant;
}

const palette = {
  aqua: '#58CFC8',
  aquaSoft: '#DDF7F3',
  brown: '#93654D',
  brownDark: '#5B3A2D',
  butter: '#FFD86B',
  coral: '#FF756B',
  cream: '#FFF9EC',
  lavender: '#AE96DC',
  navy: '#18234B',
  orange: '#F79352',
  peach: '#FFDCD4',
  slate: '#91A9BD',
  white: '#FFFFFF',
};

function Eyes() {
  return (
    <>
      <Ellipse cx="39" cy="48" fill={palette.navy} rx="4.5" ry="6" />
      <Ellipse cx="61" cy="48" fill={palette.navy} rx="4.5" ry="6" />
      <Circle cx="37.8" cy="46.2" fill={palette.white} r="1.3" />
      <Circle cx="59.8" cy="46.2" fill={palette.white} r="1.3" />
    </>
  );
}

function Smile({ nose = palette.brownDark }: { nose?: string }) {
  return (
    <>
      <Ellipse cx="50" cy="58" fill={nose} rx="4" ry="3" />
      <Path d="M50 61c-3 5-8 4-9 1M50 61c3 5 8 4 9 1" fill="none" stroke={palette.brownDark} strokeLinecap="round" strokeWidth="2" />
    </>
  );
}

function Rabbit() {
  return <><Rect x="26" y="3" width="18" height="43" rx="10" fill={palette.cream} stroke={palette.peach} strokeWidth="3" /><Rect x="56" y="3" width="18" height="43" rx="10" fill={palette.cream} stroke={palette.peach} strokeWidth="3" /><Ellipse cx="50" cy="57" fill={palette.cream} rx="34" ry="32" /><Eyes /><Smile nose={palette.coral} /><Ellipse cx="29" cy="59" fill={palette.peach} rx="6" ry="3" /><Ellipse cx="71" cy="59" fill={palette.peach} rx="6" ry="3" /></>;
}

function Bear() {
  return <><Circle cx="25" cy="29" fill={palette.brown} r="15" /><Circle cx="75" cy="29" fill={palette.brown} r="15" /><Circle cx="25" cy="29" fill={palette.peach} r="7" /><Circle cx="75" cy="29" fill={palette.peach} r="7" /><Ellipse cx="50" cy="56" fill={palette.brown} rx="35" ry="34" /><Ellipse cx="50" cy="61" fill="#C99576" rx="18" ry="14" /><Eyes /><Smile /></>;
}

function Fox() {
  return <><Path d="M14 16l28 13-23 25z" fill={palette.orange} /><Path d="M86 16L58 29l23 25z" fill={palette.orange} /><Path d="M19 23l15 9-12 10zM81 23l-15 9 12 10z" fill={palette.peach} /><Ellipse cx="50" cy="56" fill={palette.orange} rx="35" ry="34" /><Path d="M25 44c10 2 17 10 25 27 8-17 15-25 25-27-2 24-12 34-25 34S27 68 25 44z" fill={palette.cream} /><Eyes /><Smile /></>;
}

function Koala() {
  return <><Circle cx="20" cy="40" fill={palette.lavender} r="17" /><Circle cx="80" cy="40" fill={palette.lavender} r="17" /><Circle cx="20" cy="40" fill={palette.peach} r="9" /><Circle cx="80" cy="40" fill={palette.peach} r="9" /><Ellipse cx="50" cy="57" fill="#A9A7C8" rx="34" ry="34" /><Eyes /><Ellipse cx="50" cy="59" fill={palette.navy} rx="7" ry="9" /><Path d="M50 67c-3 4-7 4-9 1M50 67c3 4 7 4 9 1" fill="none" stroke={palette.navy} strokeLinecap="round" strokeWidth="2" /></>;
}

function Otter() {
  return <><Circle cx="25" cy="32" fill={palette.brown} r="13" /><Circle cx="75" cy="32" fill={palette.brown} r="13" /><Ellipse cx="50" cy="57" fill={palette.brown} rx="35" ry="34" /><Ellipse cx="50" cy="61" fill={palette.cream} rx="21" ry="17" /><Eyes /><Smile /><Path d="M31 57l-11-3m11 8l-12 2m50-7l11-3m-11 8l12 2" stroke={palette.brownDark} strokeLinecap="round" strokeWidth="1.5" /></>;
}

function Owl() {
  return <><Ellipse cx="50" cy="57" fill={palette.aqua} rx="35" ry="35" /><Path d="M20 29l19 8-15 13zM80 29l-19 8 15 13z" fill="#339E9D" /><Circle cx="37" cy="49" fill={palette.cream} r="13" /><Circle cx="63" cy="49" fill={palette.cream} r="13" /><Eyes /><Path d="M44 60l6-7 6 7-6 5z" fill={palette.butter} /><Ellipse cx="50" cy="75" fill={palette.aquaSoft} rx="15" ry="10" /></>;
}

function Chick() {
  return <><Ellipse cx="50" cy="59" fill={palette.butter} rx="35" ry="32" /><Path d="M42 24c1-11 9-13 11-2 6-7 12-2 8 5" fill={palette.coral} /><Eyes /><Path d="M44 58l6-5 6 5-6 6z" fill={palette.orange} /><Ellipse cx="29" cy="60" fill={palette.coral} opacity="0.65" rx="6" ry="3" /><Ellipse cx="71" cy="60" fill={palette.coral} opacity="0.65" rx="6" ry="3" /></>;
}

function Lamb() {
  return <><Circle cx="27" cy="30" fill={palette.cream} r="13" /><Circle cx="42" cy="24" fill={palette.cream} r="14" /><Circle cx="58" cy="24" fill={palette.cream} r="14" /><Circle cx="73" cy="30" fill={palette.cream} r="13" /><Ellipse cx="50" cy="57" fill={palette.cream} rx="34" ry="32" /><Ellipse cx="17" cy="49" fill={palette.peach} rx="10" ry="6" transform="rotate(-18 17 49)" /><Ellipse cx="83" cy="49" fill={palette.peach} rx="10" ry="6" transform="rotate(18 83 49)" /><Ellipse cx="50" cy="60" fill={palette.peach} rx="20" ry="17" /><Eyes /><Smile nose={palette.coral} /></>;
}

function Seal() {
  return <><Ellipse cx="50" cy="59" fill={palette.slate} rx="36" ry="31" /><Ellipse cx="50" cy="66" fill="#C9D9E4" rx="22" ry="15" /><Eyes /><Smile nose={palette.navy} /><Path d="M31 60l-13-3m13 9l-13 2m51-8l13-3m-13 9l13 2" stroke={palette.navy} strokeLinecap="round" strokeWidth="1.5" /></>;
}

function AnimalFace({ variant }: { variant: AnimalAvatarVariant }) {
  if (variant === 'rabbit') return <Rabbit />;
  if (variant === 'bear') return <Bear />;
  if (variant === 'fox') return <Fox />;
  if (variant === 'koala') return <Koala />;
  if (variant === 'otter') return <Otter />;
  if (variant === 'owl') return <Owl />;
  if (variant === 'chick') return <Chick />;
  if (variant === 'lamb') return <Lamb />;
  return <Seal />;
}

export function AnimalAvatar({ accessibilityLabel, photoUrl, size, variant }: AnimalAvatarProps) {
  const frame = { borderRadius: size / 2, height: size, overflow: 'hidden' as const, width: size };

  if (photoUrl) {
    return <Image accessibilityLabel={accessibilityLabel} cachePolicy="memory-disk" contentFit="cover" source={photoUrl} style={frame} />;
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={frame}>
      <Svg height={size} viewBox="0 0 100 100" width={size}>
        <Circle cx="50" cy="50" fill={palette.aquaSoft} r="50" />
        <AnimalFace variant={variant} />
      </Svg>
    </View>
  );
}
