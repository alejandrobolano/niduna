import type { FamilyAuditEntry } from '@/features/family-activity/domain/family-audit-entry';

type JsonObject = Record<string, unknown>;

const careEventLabels: Record<string, string> = {
  diaper: 'pañal',
  feeding: 'alimentación',
  sleep: 'sueño',
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function formatBloodType(value: unknown): string | undefined {
  const data = asObject(value);
  const group = asText(data.blood_group);
  const rhesus = asText(data.rhesus_factor);

  if (!group) {
    return undefined;
  }

  return `${group}${rhesus === 'positive' ? '+' : rhesus === 'negative' ? '-' : ''}`;
}

function describeBabyUpdate(details: JsonObject): string | undefined {
  const before = asObject(details.before);
  const after = asObject(details.after);
  const oldBloodType = formatBloodType(before);
  const newBloodType = formatBloodType(after);

  if (oldBloodType !== newBloodType) {
    return `cambió el tipo de sangre de ${oldBloodType ?? 'sin indicar'} a ${
      newBloodType ?? 'sin indicar'
    }`;
  }

  const oldName = asText(before.name);
  const newName = asText(after.name);

  if (oldName !== newName) {
    return `cambió el nombre de ${oldName ?? 'sin indicar'} a ${
      newName ?? 'sin indicar'
    }`;
  }

  if (details.photo_changed === true) {
    return 'actualizó la foto del bebé';
  }

  if (details.notes_changed === true) {
    return 'actualizó las observaciones del bebé';
  }

  return 'actualizó el perfil del bebé';
}

function describeMeasurement(details: JsonObject, action: FamilyAuditEntry['action']) {
  const changeKind = asText(details.change_kind);
  if (changeKind === 'retired') return 'quitó un registro de medidas del relevo';
  if (changeKind === 'restored') return 'restauró un registro de medidas';
  if (action !== 'created') {
    return action === 'deleted'
      ? 'eliminó un registro de medidas'
      : 'actualizó un registro de medidas';
  }

  const after = asObject(details.after);
  const weight =
    typeof after.weight_grams === 'number'
      ? `${new Intl.NumberFormat('es-ES', {
          maximumFractionDigits: 3,
          minimumFractionDigits: 3,
        }).format(after.weight_grams / 1000)} kg`
      : undefined;

  return weight
    ? `registró un peso de ${weight}`
    : 'registró nuevas medidas de crecimiento';
}

export function describeFamilyAuditAction(entry: FamilyAuditEntry): string {
  const details = asObject(entry.details);
  const changeKind = asText(details.change_kind);
  let action: string;

  if (entry.entityType === 'care_event') {
    const eventType = asText(details.event_type);
    const label = eventType ? careEventLabels[eventType] ?? 'cuidado' : 'cuidado';
    action =
      changeKind === 'retired'
        ? `quitó un registro de ${label} del relevo`
        : changeKind === 'restored'
          ? `restauró un registro de ${label}`
          : entry.action === 'created'
        ? `añadió un registro de ${label}`
        : entry.action === 'deleted'
          ? `eliminó un registro de ${label}`
          : `actualizó un registro de ${label}`;
  } else if (entry.entityType === 'baby_note') {
    action =
      changeKind === 'retired'
        ? 'quitó una nota familiar del relevo'
        : changeKind === 'restored'
          ? 'restauró una nota familiar'
          : entry.action === 'created'
        ? 'añadió una nota familiar'
        : entry.action === 'deleted'
          ? 'eliminó una nota familiar'
          : 'actualizó una nota familiar';
  } else if (entry.entityType === 'baby_document') {
    action =
      changeKind === 'retired'
        ? 'retiró un documento del bebé'
        : changeKind === 'restored'
          ? 'restauró un documento del bebé'
          : changeKind === 'replaced'
            ? 'sustituyó el archivo de un documento del bebé'
            : changeKind === 'metadata_updated'
              ? 'actualizó los datos de un documento del bebé'
              : entry.action === 'created'
                ? 'añadió un documento del bebé'
                : 'eliminó un documento del bebé';
  } else if (entry.entityType === 'measurement') {
    action = describeMeasurement(details, entry.action);
  } else if (entry.entityType === 'family_member') {
    action =
      entry.action === 'created'
        ? 'incorporó a una persona a la familia'
        : entry.action === 'deleted'
          ? 'retiró a una persona de la familia'
          : 'actualizó los permisos de una persona';
  } else if (entry.action === 'updated') {
    action = describeBabyUpdate(details) ?? 'actualizó el perfil del bebé';
  } else {
    action =
      entry.action === 'created'
        ? 'creó un perfil de bebé'
        : 'retiró un perfil de bebé';
  }

  return `${action}.`;
}

export function describeFamilyAuditEntry(entry: FamilyAuditEntry): string {
  const actor = entry.actorName ?? 'Un miembro de la familia';
  return `${actor} ${describeFamilyAuditAction(entry)}`;
}
