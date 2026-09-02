"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const care_report_1 = require("../../src/features/care/application/care-report");
const authors = ['Alejandro', 'Stephanie'];
const events = Array.from({ length: 34 }, (_, index) => {
    const occurredAt = new Date(Date.UTC(2026, 8, 1, 22, 0) - index * 95 * 60_000).toISOString();
    if (index % 3 === 0) {
        return {
            amountMilliliters: 60 + (index % 4) * 10,
            babyId: 'baby-1',
            icon: undefined,
            id: `feeding-${index}`,
            method: 'formula',
            notes: index % 6 === 0 ? 'Blemil Confort' : undefined,
            occurredAt,
            recordedById: `user-${index % 2}`,
            recordedByName: authors[index % 2],
            sourceType: 'care_event',
            type: 'feeding',
        };
    }
    return {
        babyId: 'baby-1',
        condition: index % 4 === 0 ? 'both' : index % 2 === 0 ? 'dirty' : 'wet',
        icon: undefined,
        id: `diaper-${index}`,
        occurredAt,
        recordedById: `user-${index % 2}`,
        recordedByName: authors[index % 2],
        sourceType: 'care_event',
        type: 'diaper',
    };
});
const html = (0, care_report_1.createCareReportHtml)({
    babyName: 'Stephanie',
    columns: ['date', 'type', 'detail', 'author'],
    contacts: [
        {
            address: 'Calle Salud 18, Madrid',
            babyId: 'baby-1',
            category: 'health',
            contactPerson: 'Dra. Laura Martín',
            createdAt: '2026-08-01T10:00:00.000Z',
            id: 'contact-1',
            isFeatured: true,
            name: 'Pediatra',
            phone: '+34 600 123 456',
            updatedAt: '2026-08-01T10:00:00.000Z',
        },
    ],
    events,
    familyName: 'Familia de Stephanie',
    filterLabel: 'Todos los cuidados',
    generatedAt: new Date('2026-09-02T11:45:00.000Z'),
});
(0, node_fs_1.writeFileSync)((0, node_path_1.resolve)('tmp/pdfs/care-report-preview.html'), html, 'utf8');
