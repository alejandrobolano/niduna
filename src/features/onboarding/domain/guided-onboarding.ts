import type { AppSection } from '@/features/home/domain/app-section';

export const guidedOnboardingVersion = 1;

export type GuidedOnboardingStatus =
  | 'completed'
  | 'dismissed'
  | 'pending-family';

export interface GuidedOnboardingState {
  status: GuidedOnboardingStatus;
  version: number;
}

export interface GuidedOnboardingStep {
  description: string;
  eyebrow: string;
  id: 'family' | 'handoff' | 'help' | 'history';
  section?: AppSection;
  title: string;
}

export function getGuidedOnboardingSteps({
  careHistoryAvailable = true,
  hasActiveBaby,
  hasActiveFamily,
}: {
  careHistoryAvailable?: boolean;
  hasActiveBaby: boolean;
  hasActiveFamily: boolean;
}): GuidedOnboardingStep[] {
  if (!hasActiveFamily) {
    return [
      {
        description:
          'Crea una familia o únete con un código. Así los cuidados quedarán disponibles para las personas que participen en el relevo.',
        eyebrow: 'EMPIEZA EN FAMILIA',
        id: 'family',
        section: 'family',
        title: 'El cuidado se comparte mejor',
      },
    ];
  }

  const steps: GuidedOnboardingStep[] = [
    {
      description: !hasActiveBaby
        ? 'Añade el perfil del bebé y después podrás registrar alimentación, pañal, sueño, medidas y notas aquí.'
        : careHistoryAvailable
          ? 'Registra alimentación, pañal, sueño, medidas y notas sin abandonar esta pantalla.'
          : 'Consulta el estado prenatal y abre el perfil cuando necesites actualizar los datos antes del nacimiento.',
      eyebrow: 'RELEVO',
      id: 'handoff',
      section: 'handoff',
      title: !hasActiveBaby
        ? 'Primero, añade al bebé'
        : careHistoryAvailable
          ? 'Deja constancia en segundos'
          : 'Todo listo para su llegada',
    },
    {
      description:
        'Invita a otra persona con un código seguro y elige qué podrá consultar o registrar dentro de la familia.',
      eyebrow: 'FAMILIA',
      id: 'family',
      section: 'family',
      title: 'Haz que el relevo sea compartido',
    },
    {
      description:
        'En Mi cuenta y ajustes encontrarás Cómo usar Niduna, con guías paso a paso y respuestas para consultar cuando las necesites.',
      eyebrow: 'SIEMPRE A MANO',
      id: 'help',
      title: 'La ayuda no termina aquí',
    },
  ];

  if (careHistoryAvailable) {
    steps.splice(1, 0, {
      description: hasActiveBaby
        ? 'Consulta y filtra los cuidados. También podrás corregir, retirar y exportar los registros cuando lo necesites.'
        : 'Cuando exista el primer cuidado, aquí podrás consultarlo, filtrarlo, corregirlo, retirarlo o exportarlo.',
      eyebrow: 'REGISTRO',
      id: 'history',
      section: 'history',
      title: 'Todo el historial, en orden',
    });
  }

  return steps;
}

export function shouldStartGuidedOnboarding(
  state: GuidedOnboardingState | undefined,
  hasActiveFamily: boolean,
): boolean {
  if (!state || state.version !== guidedOnboardingVersion) {
    return true;
  }

  return state.status === 'pending-family' && hasActiveFamily;
}

export function getGuidedOnboardingCompletion(
  hasActiveFamily: boolean,
): GuidedOnboardingState {
  return {
    status: hasActiveFamily ? 'completed' : 'pending-family',
    version: guidedOnboardingVersion,
  };
}

export function getGuidedOnboardingDismissal(): GuidedOnboardingState {
  return { status: 'dismissed', version: guidedOnboardingVersion };
}
