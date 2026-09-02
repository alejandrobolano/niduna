import { QrCode, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import createQrCode from 'qrcode-generator';
import Svg, { Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildBabyContactVCard } from '@/features/baby-contacts/application/baby-contact-vcard';
import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface BabyContactQrModalProps {
  contact?: BabyContact;
  onClose: () => void;
}

function encodeUtf8AsBinary(value: string): string {
  return encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function createQrPath(value: string): { moduleCount: number; path: string } {
  const code = createQrCode(0, 'L');
  code.addData(encodeUtf8AsBinary(value));
  code.make();
  const moduleCount = code.getModuleCount();
  let path = '';
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (code.isDark(row, column)) {
        path += `M${column} ${row}h1v1h-1z`;
      }
    }
  }
  return { moduleCount, path };
}

export function BabyContactQrModal({ contact, onClose }: BabyContactQrModalProps) {
  const { width } = useWindowDimensions();
  const qrSize = Math.min(248, Math.max(190, width - 104));
  const qr = useMemo(
    () => contact ? createQrPath(buildBabyContactVCard(contact)) : undefined,
    [contact],
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(contact)}
    >
      <SafeAreaView style={styles.root}>
        <Pressable
          accessibilityLabel="Cerrar código QR"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        {contact ? (
          <View
            accessibilityLabel={`Código QR de ${contact.name}`}
            accessibilityViewIsModal
            style={styles.card}
          >
            <View style={styles.heading}>
              <View style={styles.iconContainer}>
                <QrCode color={colors.primaryPressed} size={23} />
              </View>
              <Pressable
                accessibilityLabel="Cerrar código QR"
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X color={colors.text} size={21} />
              </Pressable>
            </View>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>COMPARTIR CONTACTO</Text>
              <Text style={styles.title}>{contact.name}</Text>
              <Text style={styles.description}>
                Otra persona puede escanear este código con la cámara de su teléfono y guardar la ficha de contacto.
              </Text>
            </View>
            <View style={styles.qrContainer}>
              {qr ? (
                <Svg
                  accessibilityLabel={`Código QR para guardar ${contact.name}`}
                  height={qrSize}
                  role="img"
                  viewBox={`-4 -4 ${qr.moduleCount + 8} ${qr.moduleCount + 8}`}
                  width={qrSize}
                >
                  <Rect fill="#FFFFFF" height={qr.moduleCount + 8} width={qr.moduleCount + 8} x={-4} y={-4} />
                  <Path d={qr.path} fill="#18234B" />
                </Svg>
              ) : null}
            </View>
            <Text style={styles.privacy}>El QR se genera en este dispositivo y no se envía a servicios externos.</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  root: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 35, 75, 0.66)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    elevation: 12,
    gap: spacing.lg,
    maxWidth: 440,
    padding: spacing.xl,
    shadowColor: colors.text,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    width: '100%',
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: { gap: spacing.sm },
  eyebrow: {
    color: colors.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 31,
  },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  qrContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    justifyContent: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    padding: spacing.sm,
  },
  privacy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
}));
