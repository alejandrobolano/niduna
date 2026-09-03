import type { ReactNode } from 'react';
import { View } from 'react-native';

import type {
  FamilyBabyGroup,
  FamilyBabySummary,
} from '@/features/family/domain/family-baby-context';
import { FamilyBabySwitcher } from '@/features/family/presentation/family-baby-switcher';
import type { AppSection } from '@/features/home/domain/app-section';
import { AppSectionNavigation } from '@/features/home/presentation/app-section-navigation';
import { NidunaBrand } from '@/shared/presentation/niduna-mark';
import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface AppHeaderProps {
  accountContent: ReactNode;
  activeBaby?: FamilyBabySummary;
  activeFamily: FamilyBabyGroup;
  careAvailable: boolean;
  compact: boolean;
  families: FamilyBabyGroup[];
  isCreatingBaby: boolean;
  onAddBaby: () => void;
  onChangeBaby: (babyId: string) => void;
  onChangeFamily: (familyId: string) => void;
  onChangeSection: (section: AppSection) => void;
  section: AppSection;
}

export function AppHeader({
  accountContent,
  activeBaby,
  activeFamily,
  careAvailable,
  compact,
  families,
  isCreatingBaby,
  onAddBaby,
  onChangeBaby,
  onChangeFamily,
  onChangeSection,
  section,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <NidunaBrand compact={compact} />
      {compact ? null : (
        <View style={styles.navigation}>
          <AppSectionNavigation
            careAvailable={careAvailable}
            onChange={onChangeSection}
            value={section}
          />
        </View>
      )}
      <View style={[styles.context, compact && styles.contextCompact]}>
        <FamilyBabySwitcher
          activeBaby={activeBaby}
          activeFamily={activeFamily}
          compact={compact}
          families={families}
          isCreatingBaby={isCreatingBaby}
          onAddBaby={onAddBaby}
          onChangeBaby={onChangeBaby}
          onChangeFamily={onChangeFamily}
        />
        {accountContent}
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-start',
    padding: spacing.sm,
    width: '100%',
  },
  headerCompact: {
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  navigation: { flex: 1, minWidth: 390 },
  context: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  contextCompact: { flex: 1, minWidth: 0 },
}));
