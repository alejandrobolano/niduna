"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.careEventLabels = void 0;
exports.describeCareEvent = describeCareEvent;
const care_snapshot_1 = require("./care-snapshot");
exports.careEventLabels = {
    diaper: 'Pañal',
    feeding: 'Alimentación',
    measurement: 'Medidas',
    note: 'Nota',
    sleep: 'Sueño',
};
function describeCareEvent(event) {
    if (event.type === 'feeding') {
        const method = event.method === 'breast'
            ? 'Pecho'
            : event.method === 'formula'
                ? 'Fórmula'
                : event.method === 'mixed'
                    ? 'Mixta'
                    : 'Leche extraída';
        return [
            method,
            event.amountMilliliters ? `${event.amountMilliliters} ml` : undefined,
            event.notes,
        ].filter(Boolean).join(' · ');
    }
    if (event.type === 'diaper') {
        const condition = event.condition === 'wet'
            ? 'Pipí'
            : event.condition === 'dirty'
                ? 'Caca'
                : 'Pipí y caca';
        return [condition, event.notes].filter(Boolean).join(' · ');
    }
    if (event.type === 'sleep') {
        return event.endedAt
            ? `${(0, care_snapshot_1.getDurationMinutes)(event.occurredAt, event.endedAt)} min`
            : 'Sueño en curso';
    }
    if (event.type === 'note')
        return event.content;
    return [
        event.weightGrams !== undefined
            ? `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3 }).format(event.weightGrams / 1000)} kg`
            : undefined,
        event.lengthMillimeters !== undefined
            ? `${event.lengthMillimeters / 10} cm`
            : undefined,
        event.headCircumferenceMillimeters !== undefined
            ? `PC ${event.headCircumferenceMillimeters / 10} cm`
            : undefined,
        event.notes,
    ].filter(Boolean).join(' · ');
}
